"""Bounded checks against retrieved evidence; never a verifier of prose meaning.

Only server data/coverage fields can become checked observations. Numeric prose
checking detects unsupported literals, not whether a number describes the right
account, edge, time, cause, intention, or financial interpretation.
"""
from __future__ import annotations

import json
import math
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
from typing import Any, Mapping, Sequence

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GroundingError(ValueError):
    """Errors contain fixed codes only, never evidence or model output."""


class ObservationClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    evidence_id: str = Field(strict=True, min_length=1, max_length=500)
    path: str = Field(strict=True, min_length=1, max_length=512)
    value: str = Field(strict=True, min_length=1, max_length=500)

    @field_validator("path")
    @classmethod
    def valid_path(cls, value):
        _pointer_parts(value)
        return value


_PRIVATE = {"evidence_id", "evidence_version", "payload_sha256", "dataset_sha256",
            "algorithm_sha256", "session_id", "token", "token_hash", "api_key",
            "secret", "password", "authorization", "instructions", "prompt"}
_LABELS = {"gid": "Account ID", "depth": "Observed depth", "role": "Role hypothesis",
           "role_score": "Heuristic role fit", "priority_score": "Review priority",
           "in_kzt": "Visible incoming amount", "out_kzt": "Visible outgoing amount",
           "in_degree": "Distinct incoming payers", "out_degree": "Distinct outgoing recipients",
           "is_seed": "Starting seed", "cluster_id": "Community ID",
           "truncated": "Evidence examples truncated", "seed_reach": "Reachable upstream seeds",
           "matched_2d_ratio": "Two-day visible flow overlap", "sum_kzt": "Observed transfer amount"}
_DECIMAL = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})?\Z")
_NUMBER = re.compile(
    r"(?<![\w.])(?P<number>[+-]?(?:\d{1,3}(?:[, \u00a0\u202f]\d{3})+(?:\.\d+)?|"
    r"\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d{1,3})?)"
    r"(?:[ \u00a0\u202f]*(?P<suffix>%|[kKmMbB])(?=$|[\s.,;:!?)}\]]))?(?!\w|\.\d)"
)


def _private(key: str) -> bool:
    key = key.lower()
    return key in _PRIVATE or "sha256" in key or key.endswith(("_hash", "_token", "_key", "_secret"))


def _pointer_parts(path: str) -> list[str]:
    if not isinstance(path, str) or len(path) > 512 or not path.startswith("/"):
        raise GroundingError("invalid_observation_path")
    encoded = path[1:].split("/")
    if not 2 <= len(encoded) <= 16 or any(re.search(r"~(?![01])", item) for item in encoded):
        raise GroundingError("invalid_observation_path")
    parts = [item.replace("~1", "/").replace("~0", "~") for item in encoded]
    if parts[0] not in {"data", "coverage"} or any(_private(item) for item in parts):
        raise GroundingError("invalid_observation_path")
    return parts


def _resolve(payload: dict, parts: list[str]) -> Any:
    value: Any = payload
    for part in parts:
        if isinstance(value, dict) and part in value:
            value = value[part]
        elif isinstance(value, list) and re.fullmatch(r"0|[1-9]\d*", part) and len(part) <= 6:
            index = int(part)
            if index >= len(value):
                raise GroundingError("missing_observation_field")
            value = value[index]
        else:
            raise GroundingError("missing_observation_field")
    if type(value) not in {str, int, float, bool, type(None)}:
        raise GroundingError("observation_must_be_primitive")
    if isinstance(value, float) and not math.isfinite(value):
        raise GroundingError("nonfinite_observation")
    if isinstance(value, str) and len(value) > 500:
        raise GroundingError("observation_value_too_large")
    return value


def _decimal(text: str) -> Decimal:
    if len(text) > 100 or not _DECIMAL.fullmatch(text):
        raise GroundingError("invalid_numeric_literal")
    try:
        value = Decimal(text)
        if not value.is_finite() or abs(value.adjusted()) > 100:
            raise GroundingError("invalid_numeric_literal")
        return value
    except InvalidOperation:
        raise GroundingError("invalid_numeric_literal") from None


def _matches(claimed: str, actual: Any) -> bool:
    if isinstance(actual, str):
        # Numeric-looking identifiers are strings, so cannot be rounded/coerced.
        return claimed == actual or claimed == json.dumps(actual, ensure_ascii=False)
    if type(actual) is bool or actual is None:
        return claimed == json.dumps(actual)
    try:
        return _decimal(claimed) == _decimal(str(actual))
    except GroundingError:
        return False


def validate_observations(observations: Sequence[ObservationClaim | dict],
                          evidence_by_id: Mapping[str, dict]) -> list[dict]:
    """Return server-formatted values for at most eight current-run field claims."""
    if len(observations) > 8:
        raise GroundingError("too_many_observations")
    result = []
    seen: set[tuple[str, str]] = set()
    for item in observations:
        try:
            claim = item if isinstance(item, ObservationClaim) else ObservationClaim.model_validate(item)
        except ValueError:
            raise GroundingError("invalid_observation") from None
        payload = evidence_by_id.get(claim.evidence_id)
        if not isinstance(payload, dict) or payload.get("evidence_id") != claim.evidence_id:
            raise GroundingError("unretrieved_observation")
        parts = _pointer_parts(claim.path)
        actual = _resolve(payload, parts)
        if not _matches(claim.value, actual):
            raise GroundingError("observation_value_mismatch")
        identity = (claim.evidence_id, claim.path)
        if identity in seen:
            continue
        seen.add(identity)
        field = parts[-1] if not parts[-1].isdigit() else parts[-2]
        observation = {"evidence_id": claim.evidence_id, "path": claim.path,
                       "label": _LABELS.get(field, field.replace("_", " ").capitalize())[:120],
                       "value": actual if isinstance(actual, str) else json.dumps(actual, allow_nan=False)}
        if field.endswith("_kzt"):
            observation["unit"] = "KZT"
        result.append(observation)
    return result


def _literals(text: str, *, prose: bool = False):
    for match in _NUMBER.finditer(text):
        # An ordered-list marker is presentation, not a quantitative assertion.
        prefix = text[text.rfind("\n", 0, match.start()) + 1:match.start()]
        if prose and not prefix.strip() and re.match(r"[.)]\s", text[match.end():]):
            continue
        raw = re.sub(r"[, \u00a0\u202f]", "", match.group("number"))
        value = _decimal(raw)
        suffix = (match.group("suffix") or "").lower()
        multiplier = {"k": Decimal(1000), "m": Decimal(1000000),
                      "b": Decimal(1000000000), "%": Decimal("0.01")}.get(suffix, Decimal(1))
        with localcontext() as context:
            context.prec = 220
            quantum = None
            # Allow explicit display precision, never approximate plain integer IDs.
            if suffix or "." in raw:
                quantum = (Decimal(1).scaleb(value.as_tuple().exponent) * multiplier).normalize()
            yield value * multiplier, quantum


def _source_numbers(evidence_by_id: Mapping[str, dict]) -> set[Decimal]:
    if len(evidence_by_id) > 8:
        raise GroundingError("grounding_evidence_budget")
    numbers: set[Decimal] = set()
    stack = [(payload.get(root), 0) for payload in evidence_by_id.values()
             if isinstance(payload, dict) for root in ("data", "coverage")]
    visited, text_size = 0, 0
    while stack:
        value, depth = stack.pop()
        visited += 1
        if visited > 12000 or depth > 20:
            raise GroundingError("grounding_evidence_budget")
        if isinstance(value, dict):
            stack.extend((child, depth + 1) for key, child in value.items() if not _private(str(key)))
        elif isinstance(value, list):
            stack.extend((child, depth + 1) for child in value)
        elif type(value) in {int, float}:
            numbers.add(_decimal(str(value)))
        elif isinstance(value, str):
            text_size += len(value)
            if text_size > 96000:
                raise GroundingError("grounding_evidence_budget")
            numbers.update(number for number, _ in _literals(value))
    return numbers


def ground_answer(*, answer: str, observations: Sequence[ObservationClaim | dict],
                  evidence_by_id: Mapping[str, dict]) -> dict:
    """Validate typed fields and conservative numeric presence, not entailment.

    Evidence must be full current-run payloads keyed by their evidence_id. No
    history or arbitrary engine reads are accepted. Any error fails closed.
    """
    if not isinstance(answer, str) or len(answer) > 5000:
        raise GroundingError("grounding_answer_budget")
    checked = validate_observations(observations, evidence_by_id)
    source = _source_numbers(evidence_by_id)
    count = 0
    with localcontext() as context:
        context.prec = 220
        for number, quantum in _literals(answer, prose=True):
            count += 1
            if number in source:
                continue
            if quantum is not None and any(
                candidate.quantize(quantum, rounding=ROUND_HALF_UP) == number for candidate in source
            ):
                continue
            raise GroundingError("unsupported_numeric_literal")
    return {"observations": checked, "grounding": {
        "typed_observations_checked": len(checked), "numeric_literals_checked": count,
        "prose_entailment": "not_checked",
        "note": "Typed observations match retrieved fields. Numeric literal checks do not verify meaning, direction, causality or criminal intent.",
    }}

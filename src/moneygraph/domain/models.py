"""Shared value contracts and deterministic normalization helpers."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import hashlib
import json
import math
from typing import Any

ROLES = ("consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral", "boundary_unknown")
ROLE_COLUMNS = ("gid", "role", "role_score", "cluster_id", "priority_score", "evidence")
CLUSTER_COLUMNS = ("cluster_id", "n_nodes", "n_seed", "sum_kzt_internal", "top_gids", "hypothesis")
TOP_COLUMNS = ("rank", "gid", "role", "priority_score", "why")
LIMITATIONS = (
    "The graph follows outgoing transfers only. Inflows from outside the sample are missing.",
    "Depth-four accounts are observation boundaries; missing outflow does not establish a final beneficiary.",
    "Visible inflow and outflow are not account balances. Seed inflows are especially incomplete.",
    "Amounts below the 5,000 KZT collection threshold and transfers outside the sampled bank are not visible.",
    "Roles are review hypotheses. Scores are heuristic strength and priority, not probability of wrongdoing.",
    "Dates have daily precision. Temporal matching cannot prove that the same funds moved onward.",
)



@dataclass(frozen=True, slots=True)
class RuleConfig:
    """Parameters of methodology 1.0; role formulas live in domain.rules."""

    rules_version: str = "1.0"
    random_seed: int = 42
    betweenness_samples: int = 128
    seed_reach_hops: int = 4
    overlap_days: int = 2


@dataclass(frozen=True, slots=True)
class CanonicalInput:
    """Owned construction data; never published directly to consumers."""

    nodes: dict[int, dict[str, Any]]
    edges: list[dict[str, Any]]
    transactions: list[dict[str, Any]]


def canonical_digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str,
                         ensure_ascii=False, allow_nan=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def day_value(value: Any) -> date:
    if isinstance(value, date):
        return date(value.year, value.month, value.day)
    return date.fromisoformat(str(value)[:10])


def finite_number(value: float) -> float:
    return round(float(value), 8) if math.isfinite(float(value)) else 0.0

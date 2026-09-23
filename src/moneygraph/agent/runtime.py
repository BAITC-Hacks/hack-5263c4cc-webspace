"""Provider-neutral bounded execution over the fixed evidence registry."""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import threading
import time
from typing import Any, Callable

from openai import OpenAI, OpenAIError, RateLimitError
from pydantic import ValidationError

from .contracts import CopilotRequest, ModelAnswer, SYSTEM, FORMAT, MAX_ROUNDS, MAX_TOOL_CALLS
from .evidence import TOOLS, evidence_tool
from .memory import evidence_version

MAX_RUN_SECONDS = 45.0
MAX_CONTEXT_CHARACTERS = 80000
MAX_OUTPUT_TOKENS = 6000
_slots = threading.BoundedSemaphore(2)
_cooldown_lock = threading.Lock()
_cooldown_until = 0.0


class RunLimit(ValueError):
    pass


def offline_answer(node: dict, reason: str | None = None) -> dict:
    """A factual summary, explicitly not an AI answer to arbitrary questions."""
    gid = node["gid"]
    evidence = str(node.get("evidence", "No numeric evidence available."))
    limitations = list(node.get("limitations", []))
    limitations += ["Heuristic role and priority are not proof of illegal activity.",
                    "This is a fixed local evidence summary; free-form questions require the optional AI connection."]
    if reason:
        limitations.append(reason)
    return {"answer": f"Account {gid}: {node.get('role', 'unclassified')} hypothesis. {evidence}",
            "mode": "fallback" if reason else "offline",
            "citations": [{"label": f"node:{gid}", "gid": gid, "text": evidence}],
            "limitations": list(dict.fromkeys(limitations)), "trace": []}


def run_investigation(engine: Any, request: CopilotRequest, client: Any = None, *,
                      enabled: bool = False, client_factory: Callable = OpenAI,
                      clock: Callable[[], float] = time.monotonic) -> dict:
    global _cooldown_until
    started = clock()
    node = engine.node(request.gid)
    if node is None or request.gids and any(engine.node(gid) is None for gid in request.gids):
        raise KeyError("Unknown account")
    execution = {"run_id": secrets.token_hex(8), "model_rounds": 0, "tool_calls": 0,
                 "input_tokens": 0, "output_tokens": 0, "evidence_version": evidence_version(engine)}
    trace: list[dict] = []

    def finish(result: dict, code: str | None = None) -> dict:
        execution.update(status=result["mode"] if result["mode"] != "openai" else "completed",
                         elapsed_ms=round((clock() - started) * 1000))
        if code:
            execution["fallback_code"] = code
        result.update(execution=execution, trace=trace)
        return result

    def fallback(code: str) -> dict:
        return finish(offline_answer(node, "AI unavailable or its evidence checks failed. Showing local evidence."), code)

    def remaining() -> float:
        seconds = MAX_RUN_SECONDS - (clock() - started)
        if seconds <= 0:
            raise RunLimit("deadline_exceeded")
        return seconds

    if client is None and not enabled:
        return finish(offline_answer(node))
    with _cooldown_lock:
        cooling = client is None and time.monotonic() < _cooldown_until
    if cooling:
        return fallback("provider_cooldown")
    if not _slots.acquire(blocking=False):
        return finish(offline_answer(node, "AI capacity is busy. Local evidence remains available."), "capacity_busy")
    owned_client = client is None
    try:
        if client is None:
            # Pin the provider endpoint rather than adopting an implicit base-URL override.
            client = client_factory(timeout=20.0, max_retries=0, base_url="https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gpt-6-sol")
        context = json.dumps({"selected_gid": request.gid, "selected_cohort": request.gids or [request.gid],
                              "conversation_history": [turn.model_dump() for turn in request.history],
                              "question": request.question})
        inputs: list[Any] = [{"role": "user", "content": context}]
        context_size = len(SYSTEM) + len(context) + len(json.dumps(TOOLS)) + len(json.dumps(FORMAT))
        citations: dict[str, dict] = {}
        seen_call_ids: set[str] = set()
        cache: dict[str, dict] = {}
        for turn in range(MAX_ROUNDS):
            remaining_seconds = remaining()
            if context_size > MAX_CONTEXT_CHARACTERS:
                raise RunLimit("context_budget_exhausted")
            if execution["output_tokens"] >= MAX_OUTPUT_TOKENS:
                raise RunLimit("token_budget_exhausted")
            allowed = turn < MAX_ROUNDS - 1 and execution["tool_calls"] < MAX_TOOL_CALLS
            execution["model_rounds"] += 1
            response = client.responses.create(
                model=model, instructions=SYSTEM, input=inputs,
                tools=TOOLS if allowed else [], tool_choice="required" if turn == 0 else "auto",
                parallel_tool_calls=False, max_output_tokens=min(2000, MAX_OUTPUT_TOKENS - execution["output_tokens"]),
                timeout=min(20.0, remaining_seconds), reasoning={"effort": "low"},
                store=False, text={"format": FORMAT})
            remaining()
            usage = getattr(response, "usage", None)
            for name in ("input_tokens", "output_tokens"):
                execution[name] += max(0, int(getattr(usage, name, 0) or 0))
            if response.status != "completed":
                raise RunLimit("response_incomplete")
            # Count every item replayed into the next request, including reasoning
            # and message items, not only tool evidence. Never log this content.
            replayed = [item.model_dump(mode="json") if hasattr(item, "model_dump") else vars(item)
                        for item in response.output]
            context_size += len(json.dumps(replayed, default=str))
            if context_size > MAX_CONTEXT_CHARACTERS:
                raise RunLimit("context_budget_exhausted")
            calls = [item for item in response.output if item.type == "function_call"]
            if not calls:
                if len(response.output_text) > 12000:
                    raise RunLimit("answer_too_large")
                result = ModelAnswer.model_validate_json(response.output_text)
                if any(c not in citations for c in result.citations):
                    raise ValueError("Unretrieved citation")
                return finish({"answer": result.answer, "mode": "openai", "model": model,
                               "citations": [citations[c] for c in dict.fromkeys(result.citations)],
                               "limitations": list(dict.fromkeys(result.limitations + list(node.get("limitations", [])) + [
                                   "AI interpretation requires human review. Scores are not probabilities."]))})
            if not allowed:
                raise RunLimit("tools_disabled")
            if len(calls) + execution["tool_calls"] > MAX_TOOL_CALLS:
                raise RunLimit("tool_budget_exhausted")
            inputs.extend(response.output)
            for call in calls:
                remaining()
                if call.call_id in seen_call_ids:
                    raise ValueError("Replayed call ID")
                seen_call_ids.add(call.call_id)
                execution["tool_calls"] += 1
                tool_started = clock()
                # Validate arguments even for cached reads; a cache is not permission.
                if json.loads(call.arguments) != {}:
                    raise ValueError("Nonempty tool arguments")
                cached = call.name in cache
                if not cached:
                    cache[call.name] = evidence_tool(call.name, call.arguments, engine, request.gid, request.gids)
                result = cache[call.name]
                encoded = json.dumps(result, default=str, allow_nan=False, sort_keys=True)
                if len(encoded) > 24000:
                    raise RunLimit("evidence_too_large")
                context_size += len(encoded)
                if context_size > MAX_CONTEXT_CHARACTERS:
                    raise RunLimit("context_budget_exhausted")
                remaining()
                evidence_id = result["evidence_id"]
                citations[evidence_id] = {"label": evidence_id, "gid": request.gid,
                                         "text": f"Retrieved by {call.name}",
                                         "kind": evidence_id.split(":", 1)[0],
                                         "evidence_version": execution["evidence_version"],
                                         "payload_sha256": hashlib.sha256(encoded.encode()).hexdigest()}
                trace.append({"tool": call.name, "status": "cached" if cached else "complete",
                              "elapsed_ms": round((clock() - tool_started) * 1000)})
                inputs.append({"type": "function_call_output", "call_id": call.call_id, "output": encoded})
        raise RunLimit("round_budget_exhausted")
    except RateLimitError:
        with _cooldown_lock:
            _cooldown_until = time.monotonic() + 30
        return fallback("provider_rate_limited")
    except RunLimit as exc:
        return fallback(str(exc))
    except OpenAIError:
        return fallback("provider_error")
    except (ValidationError, ValueError, TypeError):
        return fallback("validation_failed")
    finally:
        try:
            if owned_client and client is not None:
                client.close()
        finally:
            _slots.release()

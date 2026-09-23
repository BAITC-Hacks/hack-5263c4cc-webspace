"""Offline ranking experiments. Never mutate the analysis or its default exports."""
from __future__ import annotations

import math

from .audit import provenance
from .engine import Analysis
from .rules import PRIORITY_WEIGHTS, percentiles, priority_values, score_priority


def _validate_top(top: int) -> None:
    if type(top) is not int or not 1 <= top <= 100:
        raise ValueError("top must be an integer between 1 and 100")


def _rank(scores: dict[int, float]) -> list[int]:
    return sorted(scores, key=lambda gid: (-scores[gid], gid))


def _overlap(first: list[int], second: list[int]) -> dict:
    a, b = set(first), set(second)
    return {"shared_count": len(a & b), "jaccard": round(len(a & b) / len(a | b), 8)}


def _identity(analysis: Analysis) -> dict:
    receipt = provenance(analysis)
    return {"schema_version": 1, **{key: receipt[key] for key in
                                   ("dataset_kind", "dataset_sha256", "algorithm_sha256")}}


def sensitivity_report(analysis: Analysis, *, delta: float = 0.1, top: int = 20) -> dict:
    _validate_top(top)
    if isinstance(delta, bool) or not isinstance(delta, (int, float)) or not math.isfinite(delta) or not 0 <= delta <= 0.5:
        raise ValueError("delta must be finite and between 0 and 0.5")
    # Internal records include every input node and avoid the HTTP list's 500-node cap.
    records = analysis._records
    percentile = percentiles(row["metrics"] for row in records.values())
    values = {gid: priority_values(row, row["metrics"], percentile) for gid, row in records.items()}
    baseline_order = _rank({gid: row["priority_score"] for gid, row in records.items()})
    baseline_ranks = {gid: rank for rank, gid in enumerate(baseline_order, 1)}
    baseline_top = baseline_order[:top]
    ranges = {gid: {"gid": gid, "baseline_rank": baseline_ranks[gid], "baseline_score": row["priority_score"],
                    "min_rank": baseline_ranks[gid], "max_rank": baseline_ranks[gid],
                    "min_score": row["priority_score"], "max_score": row["priority_score"], "top_inclusion_count": 0}
              for gid, row in records.items()}
    scenarios = []
    for factor in PRIORITY_WEIGHTS:
        for direction in (-1, 1):
            weights = dict(PRIORITY_WEIGHTS)
            weights[factor] *= 1 + direction * delta
            total = sum(weights.values())
            weights = {key: value / total for key, value in weights.items()}
            scores = {gid: score_priority(row, row["metrics"], values[gid], weights)[0] for gid, row in records.items()}
            ordered = _rank(scores)
            top_gids = ordered[:top]
            scenarios.append({"factor": factor, "relative_change": direction * delta, "weights": weights,
                              "top_gids": top_gids, "top_overlap": _overlap(baseline_top, top_gids)})
            for rank, gid in enumerate(ordered, 1):
                item = ranges[gid]
                item["min_rank"] = min(item["min_rank"], rank)
                item["max_rank"] = max(item["max_rank"], rank)
                item["min_score"] = min(item["min_score"], scores[gid])
                item["max_score"] = max(item["max_score"], scores[gid])
                item["top_inclusion_count"] += rank <= top
    return {**_identity(analysis), "delta": delta, "requested_top": top, "effective_top": len(baseline_top),
            "baseline": {"weights": dict(PRIORITY_WEIGHTS), "top_gids": baseline_top}, "scenarios": scenarios,
            "nodes": [ranges[gid] for gid in sorted(ranges)],
            "interpretation": "Twelve one-at-a-time relative weight perturbations, renormalized to sum to one. Rank and score ranges include the baseline. Boundary and isolated-node adjustments are retained. Stability is not accuracy; no ground-truth labels are available."}


def compare_rankings(analysis: Analysis, *, top: int = 20) -> dict:
    _validate_top(top)
    records = analysis._records
    scores = {
        "priority": {gid: r["priority_score"] for gid, r in records.items()},
        "volume": {gid: r["in_kzt"] + r["out_kzt"] for gid, r in records.items()},
        "degree": {gid: r["in_degree"] + r["out_degree"] for gid, r in records.items()},
    }
    orders = {name: _rank(values) for name, values in scores.items()}
    ranks = {name: {gid: i for i, gid in enumerate(order, 1)} for name, order in orders.items()}
    selected = {gid for order in orders.values() for gid in order[:top]}
    return {**_identity(analysis), "requested_top": top, "effective_top": min(top, len(records)),
            "rankings": {name: {"top_gids": order[:top], "overlap_with_priority": _overlap(orders["priority"][:top], order[:top])}
                         for name, order in orders.items()},
            "accounts": [{"gid": gid, "role": records[gid]["role"],
                          "ranks": {name: values[gid] for name, values in ranks.items()},
                          "scores": {name: values[gid] for name, values in scores.items()}}
                         for gid in sorted(selected, key=lambda gid: ranks["priority"][gid])],
            "definitions": {"priority": "Default composite review priority, including observation adjustments.",
                            "volume": "Observed incoming plus outgoing KZT.",
                            "degree": "Incoming plus outgoing directed neighbor counts (a reciprocal neighbor counts twice)."},
            "interpretation": "All rankings sort descending and break ties by gid. Differences show the effect of the heuristic, not superiority or measured accuracy. The input graph is incomplete."}

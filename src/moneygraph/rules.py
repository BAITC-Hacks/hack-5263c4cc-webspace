"""Shared, inspectable role rules and priority arithmetic; no data or I/O."""
from __future__ import annotations

from bisect import bisect_right
from collections.abc import Callable, Iterable

ROLES = ("consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral", "boundary_unknown")
PRIORITY_WEIGHTS = {
    "Weighted PageRank": 0.2,
    "Directed bridge position": 0.2,
    "Distinct upstream seeds": 0.2,
    "Distinct incoming payers": 0.15,
    "Observed volume": 0.15,
    "Two-day flow overlap": 0.1,
}


def percentiles(metrics: Iterable[dict]) -> Callable[[str, float], float]:
    rows = list(metrics)
    distributions = {key: sorted(row[key] for row in rows)
                     for key in ("pagerank", "betweenness", "visible_volume")}

    def percentile(key: str, value: float) -> float:
        return bisect_right(distributions[key], value) / len(rows) if value > 0 else 0.0

    return percentile


def evaluate_role_rules(node: dict, metrics: dict, bridge_percentile: float) -> list[dict]:
    """Return all rule predicates and unrounded scores in the canonical tie order."""
    m = metrics
    boundary = node["depth"] >= 4 and m["out_degree"] == 0

    def condition(field, operator, actual, expected, passed):
        return {"field": field, "operator": operator, "actual": actual,
                "expected": expected, "passed": bool(passed)}

    observed = condition("observation_boundary", "==", boundary, False, not boundary)
    nonseed = condition("is_seed", "==", node["is_seed"], False, not node["is_seed"])

    def at_least(field, minimum):
        return condition(field, ">=", m[field], minimum, m[field] >= minimum)

    rules = {}

    def rule(role, conditions, formula, calculate):
        eligible = all(c["passed"] for c in conditions)
        rules[role] = {"role": role, "conditions": conditions, "eligible": eligible,
                       "formula": formula, "score": calculate() if eligible else 0.0}

    rule("consolidator", [observed, at_least("in_degree", 3)],
         "min(0.95, 0.55 + 0.35 * min(in_degree / 12, 1) + 0.05 * min(seed_reach / 4, 1))",
         lambda: min(0.95, 0.55 + 0.35 * min(m["in_degree"] / 12, 1) + 0.05 * min(m["seed_reach"] / 4, 1)))
    rule("distributor", [observed, at_least("out_degree", 8)],
         "min(0.95, 0.65 + 0.3 * min(out_degree / 60, 1))",
         lambda: min(0.95, 0.65 + 0.3 * min(m["out_degree"] / 60, 1)))
    ratio = m["pass_through"]
    rule("transit", [observed, nonseed, at_least("out_degree", 1),
                     condition("pass_through", "between_inclusive", ratio, [0.65, 1.35],
                               ratio is not None and 0.65 <= ratio <= 1.35)],
         "0.55 + 0.2 * (1 - abs(1 - pass_through) / 0.35) + 0.2 * matched_2d_ratio",
         lambda: 0.55 + 0.2 * (1 - abs(1 - ratio) / 0.35) + 0.2 * m["matched_2d_ratio"])
    rule("terminal", [observed, nonseed, at_least("in_degree", 1),
                      condition("out_degree", "==", m["out_degree"], 0, m["out_degree"] == 0)],
         "min(0.75, 0.5 + 0.05 * in_degree)", lambda: min(0.75, 0.5 + 0.05 * m["in_degree"]))
    rule("coordinator", [observed, nonseed, at_least("in_degree", 2), at_least("out_degree", 2),
                         at_least("neighbor_clusters", 2), at_least("seed_reach", 2),
                         condition("betweenness", ">", m["betweenness"], 0, m["betweenness"] > 0),
                         condition("betweenness_percentile", ">=", bridge_percentile, 0.9, bridge_percentile >= 0.9)],
         "min(0.9, 0.55 + 0.2 * betweenness_percentile + 0.15 * min(seed_reach / 8, 1))",
         lambda: min(0.9, 0.55 + 0.2 * bridge_percentile + 0.15 * min(m["seed_reach"] / 8, 1)))
    rule("peripheral", [condition("fallback", "==", True, True, True)], "0.2", lambda: 0.2)
    rule("boundary_unknown", [condition("depth", ">=", node["depth"], 4, node["depth"] >= 4),
                              condition("out_degree", "==", m["out_degree"], 0, m["out_degree"] == 0)],
         "1.0", lambda: 1.0)
    winner = max(ROLES, key=lambda role: rules[role]["score"])
    return [{**rules[role], "selected": role == winner} for role in ROLES]


def priority_values(node: dict, metrics: dict, percentile: Callable) -> dict[str, float]:
    """Keep full feature precision until the canonical contribution rounding step."""
    m = metrics
    return {
        "Weighted PageRank": percentile("pagerank", m["pagerank"]),
        "Directed bridge position": percentile("betweenness", m["betweenness"]),
        "Distinct upstream seeds": min(m["seed_reach"] / 8, 1),
        "Distinct incoming payers": min(m["in_degree"] / 12, 1),
        "Observed volume": percentile("visible_volume", m["visible_volume"]),
        "Two-day flow overlap": m["matched_2d_ratio"] if not node["is_seed"] else 0.0,
    }


def score_priority(node: dict, metrics: dict, values: dict[str, float],
                   weights: dict[str, float] | None = None) -> tuple[float, list[dict]]:
    weights = PRIORITY_WEIGHTS if weights is None else weights
    factors = [{"label": label, "value": round(float(values[label]), 8), "weight": weight,
                "contribution": round(float(values[label] * weight), 8)} for label, weight in weights.items()]
    priority = sum(f["contribution"] for f in factors)
    if node["depth"] >= 4 and metrics["out_degree"] == 0:
        factors.append({"label": "Boundary uncertainty adjustment", "value": 0.65, "weight": 0.0,
                        "contribution": round(-0.35 * priority, 8)})
        priority *= 0.65
    if metrics["in_degree"] == metrics["out_degree"] == 0:
        factors.append({"label": "No observed transfers", "value": 0.0, "weight": 0.0,
                        "contribution": round(-priority, 8)})
        priority = 0.0
    return round(priority, 8), factors

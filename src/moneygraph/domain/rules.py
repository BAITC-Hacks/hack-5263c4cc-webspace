"""Methodology 1.0 role fit, investigation priority and uncertainty evidence.

Formula order and tie breaking are deliberately stable for byte-identical exports.
"""
from bisect import bisect_right
from typing import Any

from .models import LIMITATIONS, ROLES, finite_number as _number


def assign_roles(nodes: dict, raw: dict, cluster_map: dict) -> dict:
    distributions = {key: sorted(row[key] for row in raw.values()) for key in ("pagerank", "betweenness", "visible_volume")}

    def percentile(key: str, value: float) -> float:
        return bisect_right(distributions[key], value) / len(raw) if value > 0 else 0.0

    records = {}
    for gid, node in nodes.items():
        m = raw[gid]
        boundary = node["depth"] >= 4 and m["out_degree"] == 0
        isolated = m["in_degree"] == m["out_degree"] == 0
        scores = {role: 0.0 for role in ROLES}
        scores["peripheral"] = 0.2
        if boundary:
            scores["boundary_unknown"] = 1.0
        else:
            if m["in_degree"] >= 3:
                scores["consolidator"] = min(0.95, 0.55 + 0.35 * min(m["in_degree"] / 12, 1) + 0.05 * min(m["seed_reach"] / 4, 1))
            if m["out_degree"] >= 8:
                scores["distributor"] = min(0.95, 0.65 + 0.3 * min(m["out_degree"] / 60, 1))
            ratio = m["pass_through"]
            if not node["is_seed"] and ratio is not None and m["out_degree"] > 0 and 0.65 <= ratio <= 1.35:
                scores["transit"] = 0.55 + 0.2 * (1 - abs(1 - ratio) / 0.35) + 0.2 * m["matched_2d_ratio"]
            if not node["is_seed"] and m["in_degree"] > 0 and m["out_degree"] == 0:
                scores["terminal"] = min(0.75, 0.5 + 0.05 * m["in_degree"])
            if (not node["is_seed"] and m["in_degree"] >= 2 and m["out_degree"] >= 2
                and m["neighbor_clusters"] >= 2 and m["seed_reach"] >= 2
                and percentile("betweenness", m["betweenness"]) >= 0.9 and m["betweenness"] > 0):
                scores["coordinator"] = min(0.9, 0.55 + 0.2 * percentile("betweenness", m["betweenness"]) + 0.15 * min(m["seed_reach"] / 8, 1))
        role = max(ROLES, key=lambda name: scores[name])
        factors = [
            {"label": "Weighted PageRank", "value": percentile("pagerank", m["pagerank"]), "weight": 0.2},
            {"label": "Directed bridge position", "value": percentile("betweenness", m["betweenness"]), "weight": 0.2},
            {"label": "Distinct upstream seeds", "value": min(m["seed_reach"] / 8, 1), "weight": 0.2},
            {"label": "Distinct incoming payers", "value": min(m["in_degree"] / 12, 1), "weight": 0.15},
            {"label": "Observed volume", "value": percentile("visible_volume", m["visible_volume"]), "weight": 0.15},
            {"label": "Two-day flow overlap", "value": m["matched_2d_ratio"] if not node["is_seed"] else 0.0, "weight": 0.1},
        ]
        for factor in factors:
            factor["contribution"] = _number(factor["value"] * factor["weight"])
            factor["value"] = _number(factor["value"])
        priority = sum(f["contribution"] for f in factors)
        # Show observability adjustments instead of silently hiding them.
        if boundary:
            factors.append({"label": "Boundary uncertainty adjustment", "value": 0.65, "weight": 0.0, "contribution": _number(-0.35 * priority)})
            priority *= 0.65
        if isolated:
            factors.append({"label": "No observed transfers", "value": 0.0, "weight": 0.0, "contribution": _number(-priority)})
            priority = 0.0
        evidence = role_evidence(role, m, node)
        limitations = [LIMITATIONS[0], LIMITATIONS[4]]
        if boundary:
            limitations.insert(0, LIMITATIONS[1])
        if node["is_seed"] or (m["pass_through"] is not None and m["pass_through"] > 1):
            limitations.append(LIMITATIONS[2])
        if isolated:
            limitations.append("This node is supplied in the node table but has no observed edge. Absence of data is not evidence of inactivity.")
        if m["matched_2d_ratio"]:
            limitations.append(LIMITATIONS[5])
        if role == "terminal":
            limitations.append("No outgoing transfer is observed in this sample. Other banks, smaller transfers and later activity remain unknown.")
        observation = "boundary" if boundary else "isolated" if isolated else "seed_limited" if node["is_seed"] else "partial"
        records[gid] = {
            **node, "role": role, "role_score": _number(scores[role]), "priority_score": _number(priority),
            "cluster_id": cluster_map[gid], "evidence": evidence[:200], "truncated_by_depth": boundary,
            **{key: m[key] for key in ("in_degree", "out_degree", "in_kzt", "out_kzt")},
            "metrics": m, "role_scores": {key: _number(value) for key, value in scores.items()},
            "reasons": [
                {"label": "Observed flow", "value": f"{m['in_degree']} in / {m['out_degree']} out", "detail": evidence},
                {"label": "Upstream seed reach", "value": m["seed_reach"], "detail": "Distinct seeds reaching this node over at most four directed hops."},
                {"label": "Temporal overlap", "value": m["matched_2d_ratio"], "detail": "Share of outgoing amount matched to available visible inflows on the same day or preceding two days; not fund attribution."},
            ],
            "score_factors": factors, "limitations": limitations,
            "observability": {"label": observation.replace("_", " ").title(), "level": observation, "notes": limitations},
        }
    return records


def role_evidence(role: str, m: dict[str, Any], node: dict[str, Any]) -> str:
    if role == "boundary_unknown":
        return f"Depth {node['depth']} boundary; {m['in_degree']} visible payers; no observed outflow. Beneficiary role remains unknown."
    if role == "consolidator":
        return f"Receives from {m['in_degree']} payers; {m['in_kzt']:,.0f} KZT observed inflow; reachable from {m['seed_reach']} seeds. Consolidation hypothesis."
    if role == "distributor":
        return f"Sends to {m['out_degree']} recipients in {m['out_tx']} transfers; {m['out_kzt']:,.0f} KZT observed outflow. Distribution hypothesis."
    if role == "transit":
        return f"Visible out/in ratio {m['pass_through']:.2f}; {m['matched_2d_ratio']:.0%} outgoing amount overlaps inflow within 2 days. Transit hypothesis."
    if role == "terminal":
        return f"Depth {node['depth']}; {m['in_degree']} payers and 0 visible outgoing transfers. Observed sink only; outside activity unknown."
    if role == "coordinator":
        return f"Links {m['neighbor_clusters']} communities; reachable from {m['seed_reach']} seeds; bridge score {m['betweenness']:.4f}. Coordination hypothesis."
    return f"{m['in_degree']} visible payers, {m['out_degree']} recipients; depth {node['depth']}. No stronger documented role rule matches."

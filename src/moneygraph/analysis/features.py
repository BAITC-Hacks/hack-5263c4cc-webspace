"""Directed monetary metrics and FIFO daily overlap in fixed operation order."""
from collections import defaultdict, deque
from datetime import date
from typing import Any

import networkx as nx

from ..domain.models import RuleConfig, day_value as _day, finite_number as _number
from .graph import centrality


def daily_flows(transactions: list[dict]) -> dict:
    daily = defaultdict(lambda: defaultdict(lambda: {"in_kzt": 0.0, "out_kzt": 0.0, "in_tx": 0, "out_tx": 0}))
    for tx in transactions:
        day = _day(tx["date"])
        incoming = daily[int(tx["dst"])][day]
        outgoing = daily[int(tx["src"])][day]
        incoming["in_kzt"] += float(tx["sum_kzt"])
        incoming["in_tx"] += 1
        outgoing["out_kzt"] += float(tx["sum_kzt"])
        outgoing["out_tx"] += 1
    return {gid: dict(days) for gid, days in daily.items()}


def temporal_overlap(daily: dict, gid: int, config: RuleConfig) -> tuple[float, int]:
    # FIFO is an overlap measure, not an attribution of specific funds.
    available: deque[list[Any]] = deque()
    matched = 0.0
    total_out = 0.0
    days = daily.get(gid, {})
    for day, row in sorted(days.items()):
        while available and (day - available[0][0]).days > config.overlap_days:
            available.popleft()
        if row["in_kzt"]:
            available.append([day, row["in_kzt"]])
        outgoing = row["out_kzt"]
        total_out += outgoing
        while outgoing > 0 and available:
            amount = min(outgoing, available[0][1])
            matched += amount
            outgoing -= amount
            available[0][1] -= amount
            if available[0][1] <= 0.000001:
                available.popleft()
    return matched / total_out if total_out else 0.0, len(days)



def compute_features(nodes: dict, G: nx.DiGraph, daily: dict, cluster_map: dict, config: RuleConfig) -> dict:
    pagerank, between, seed_reach = centrality(G, nodes, config)
    raw = {}
    for gid, node in nodes.items():
        in_kzt = float(G.in_degree(gid, weight="sum_kzt"))
        out_kzt = float(G.out_degree(gid, weight="sum_kzt"))
        ratio = out_kzt / in_kzt if in_kzt else None
        temporal, active = temporal_overlap(daily, gid, config)
        neighbor_clusters = len({cluster_map[n] for n in set(G.predecessors(gid)) | set(G.successors(gid))})
        raw[gid] = {
            "in_degree": G.in_degree(gid), "out_degree": G.out_degree(gid),
            "in_kzt": _number(in_kzt), "out_kzt": _number(out_kzt),
            "in_tx": int(G.in_degree(gid, weight="n_tx")), "out_tx": int(G.out_degree(gid, weight="n_tx")),
            "pagerank": _number(pagerank[gid]), "betweenness": _number(between[gid]),
            "pass_through": _number(ratio) if ratio is not None else None,
            "seed_reach": len(seed_reach[gid]), "neighbor_clusters": neighbor_clusters,
            "matched_2d_ratio": _number(temporal), "active_days": active,
            "visible_volume": in_kzt + out_kzt,
        }
    return raw

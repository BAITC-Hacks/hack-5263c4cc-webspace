"""Deterministic analysis of an explicitly incomplete transaction graph.

No label in this module establishes wrongdoing. Scores are documented heuristic
role fit and investigation priority, never calibrated probabilities.
"""

from __future__ import annotations

from bisect import bisect_right
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
import csv
import json
import math
from pathlib import Path
import random
from time import perf_counter
from typing import Any

import networkx as nx
import polars as pl

ROLES = ("consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral", "boundary_unknown")
ROLE_COLUMNS = ("gid", "role", "role_score", "cluster_id", "priority_score", "evidence")
CLUSTER_COLUMNS = ("cluster_id", "n_nodes", "n_seed", "sum_kzt_internal", "top_gids", "hypothesis")
TOP_COLUMNS = ("rank", "gid", "role", "priority_score", "why")
LIMITATIONS = [
    "The graph follows outgoing transfers only. Inflows from outside the sample are missing.",
    "Depth-four accounts are observation boundaries; missing outflow does not establish a final beneficiary.",
    "Visible inflow and outflow are not account balances. Seed inflows are especially incomplete.",
    "Amounts below the 5,000 KZT collection threshold and transfers outside the sampled bank are not visible.",
    "Roles are review hypotheses. Scores are heuristic strength and priority, not probability of wrongdoing.",
    "Dates have daily precision. Temporal matching cannot prove that the same funds moved onward.",
]


def synthetic_frames() -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Create a reproducible, original demo with no organizer records or labels."""
    rng = random.Random(5263)
    nodes: dict[int, dict[str, Any]] = {}
    tx: list[dict[str, Any]] = []

    def add(gid: int, depth: int, seed: bool = False) -> int:
        nodes[gid] = {"gid": gid, "depth": depth, "is_seed": seed}
        return gid

    def transfer(src: int, dst: int, amount: float, day: int) -> None:
        tx.append({"src": src, "dst": dst, "date": date(2026, 7, day), "sum_kzt": float(amount)})

    collectors = []
    for group in range(3):
        base = 1000 + group * 100
        seeds = [add(base + i, 0, True) for i in range(1, 7)]
        collect = [add(base + 10 + i, 1) for i in range(2)]
        transit = [add(base + 20 + i, 2) for i in range(3)]
        distributors = [add(base + 30 + i, 3) for i in range(2)]
        boundary = [add(base + 40 + i, 4) for i in range(18)]
        terminals = [add(base + 70 + i, 3) for i in range(4)]
        collectors.append(collect)
        for cycle in range(4):
            day = 2 + cycle * 6
            for i, seed in enumerate(seeds):
                transfer(seed, collect[i % 2], rng.randrange(8, 22) * 5000, day)
                if i < 3:
                    transfer(seed, collect[(i + 1) % 2], 10000, day)
            for i, collector in enumerate(collect):
                transfer(collector, transit[i], 120000, day + 1)
                transfer(collector, transit[2], 20000, day + 1)
            transfer(transit[0], distributors[0], 115000, day + 2)
            transfer(transit[1], distributors[1], 115000, day + 2)
            for terminal in terminals:
                transfer(transit[2], terminal, 10000, day + 2)
            for i, target in enumerate(boundary):
                transfer(distributors[i % 2], target, 10000, day + 3)
        # One source-only account illustrates incomplete visible inflows.
        add(base + 90, 0, True)
    for i in range(3):
        transfer(collectors[i][0], collectors[(i + 1) % 3][1], 15000, 28)
    transactions = pl.DataFrame(tx)
    edges = transactions.group_by(["src", "dst"]).agg(
        pl.col("sum_kzt").sum(), pl.len().alias("n_tx")
    ).with_columns(
        pl.col("src").replace_strict({gid: min(row["depth"] + 1, 4) for gid, row in nodes.items()}).alias("depth")
    ).sort(["src", "dst"])
    return pl.DataFrame(list(nodes.values())).sort("gid"), edges, transactions.sort(["date", "src", "dst"])


def _day(value: Any) -> date:
    if isinstance(value, date):
        return date(value.year, value.month, value.day)
    return date.fromisoformat(str(value)[:10])


def _number(value: float) -> float:
    return round(float(value), 8) if math.isfinite(float(value)) else 0.0


class Analysis:
    def __init__(self, nodes: pl.DataFrame, edges: pl.DataFrame, transactions: pl.DataFrame,
                 *, dataset_kind: str = "synthetic", dataset_name: str = "Synthetic investigation demo"):
        started = perf_counter()
        self.dataset_kind = dataset_kind
        self.dataset_name = dataset_name
        self._validate(nodes, edges, transactions)
        self._nodes = {int(r["gid"]): {"gid": int(r["gid"]), "depth": int(r["depth"]), "is_seed": bool(r["is_seed"])}
                       for r in nodes.sort("gid").to_dicts()}
        self._edges = sorted(edges.to_dicts(), key=lambda r: (r["src"], r["dst"]))
        self._transactions = sorted(transactions.to_dicts(), key=lambda r: (_day(r["date"]), r["src"], r["dst"], r["sum_kzt"]))
        self.G = nx.DiGraph()
        self.G.add_nodes_from(self._nodes)
        for r in self._edges:
            self.G.add_edge(int(r["src"]), int(r["dst"]), sum_kzt=float(r["sum_kzt"]), n_tx=int(r["n_tx"]), depth=int(r["depth"]))
        self._daily: dict[int, dict[date, dict[str, float]]] = defaultdict(lambda: defaultdict(lambda: {"in_kzt": 0.0, "out_kzt": 0.0, "in_tx": 0, "out_tx": 0}))
        for tx in self._transactions:
            day = _day(tx["date"])
            incoming = self._daily[int(tx["dst"])][day]
            outgoing = self._daily[int(tx["src"])][day]
            incoming["in_kzt"] += float(tx["sum_kzt"])
            incoming["in_tx"] += 1
            outgoing["out_kzt"] += float(tx["sum_kzt"])
            outgoing["out_tx"] += 1
        self._cluster_map = self._find_clusters()
        self._records = self._analyze()
        self._ranked = sorted(self._records.values(), key=lambda r: (-r["priority_score"], r["gid"]))
        for rank, row in enumerate(self._ranked, 1):
            row["rank"] = rank
        self._clusters = self._cluster_summaries()
        self._activity = self._activity_summary()
        self.runtime_ms = round((perf_counter() - started) * 1000, 2)

    @staticmethod
    def _validate(nodes: pl.DataFrame, edges: pl.DataFrame, tx: pl.DataFrame) -> None:
        required = [(nodes, {"gid", "depth", "is_seed"}), (edges, {"src", "dst", "sum_kzt", "n_tx", "depth"}),
                    (tx, {"src", "dst", "date", "sum_kzt"})]
        for frame, columns in required:
            if not columns.issubset(frame.columns):
                raise ValueError(f"Input table is missing required columns: {', '.join(sorted(columns - set(frame.columns)))}")
            if any(frame.select(sorted(columns)).null_count().row(0)):
                raise ValueError("Required input fields must not contain null values")
        if not nodes.height:
            raise ValueError("The nodes table must contain at least one node")
        gids = nodes["gid"].to_list()
        if any(not isinstance(gid, int) or isinstance(gid, bool) for gid in gids):
            raise ValueError("Node identifiers must be integers")
        if len(set(gids)) != len(gids):
            raise ValueError("Node identifiers must be unique")
        if any(not isinstance(d, int) or isinstance(d, bool) or d < 0 for d in nodes["depth"]):
            raise ValueError("Node depth must be a nonnegative integer")
        if any(not isinstance(v, bool) for v in nodes["is_seed"]):
            raise ValueError("is_seed must contain boolean values")
        known = set(gids)
        for frame in (edges, tx):
            if any(not isinstance(value, int) or isinstance(value, bool)
                   for column in ("src", "dst") for value in frame[column]):
                raise ValueError("Edge and transaction endpoints must be integers")
            if not (set(frame["src"]) | set(frame["dst"])).issubset(known):
                raise ValueError("Every edge and transaction endpoint must exist in nodes")
            if any(not math.isfinite(float(v)) or float(v) <= 0 for v in frame["sum_kzt"]):
                raise ValueError("Transaction and edge amounts must be finite and positive")
        if any(not isinstance(value, int) or isinstance(value, bool) or value <= 0
               for value in edges["n_tx"]):
            raise ValueError("Edge transaction counts must be positive integers")
        if any(not isinstance(value, int) or isinstance(value, bool) or value < 0
               for value in edges["depth"]):
            raise ValueError("Edge depth must be a nonnegative integer")
        pairs = [(r["src"], r["dst"]) for r in edges.iter_rows(named=True)]
        if len(pairs) != len(set(pairs)):
            raise ValueError("Edges must have one row per directed pair")
        aggregate: dict[tuple[int, int], list[float]] = defaultdict(lambda: [0.0, 0])
        for row in tx.iter_rows(named=True):
            _day(row["date"])
            pair = aggregate[(row["src"], row["dst"])]
            pair[0] += float(row["sum_kzt"])
            pair[1] += 1
        if set(pairs) != set(aggregate):
            raise ValueError("Edges and transactions do not cover the same directed pairs")
        for r in edges.iter_rows(named=True):
            total, count = aggregate[(r["src"], r["dst"])]
            if not math.isclose(float(r["sum_kzt"]), total, rel_tol=0.0, abs_tol=0.01) or r["n_tx"] != count:
                raise ValueError("Edge amounts or counts do not match transaction aggregates")

    def _find_clusters(self) -> dict[int, int]:
        projection = nx.Graph()
        projection.add_nodes_from(self._nodes)
        for src, dst, edge in self.G.edges(data=True):
            weight = edge["sum_kzt"] + projection.get_edge_data(src, dst, {}).get("weight", 0)
            projection.add_edge(src, dst, weight=weight)
        if projection.number_of_edges():
            communities = list(nx.community.louvain_communities(projection, weight="weight", seed=42))
        else:
            communities = [{gid} for gid in self._nodes]
        communities.sort(key=lambda group: (-len(group), min(group)))
        return {gid: index for index, group in enumerate(communities) for gid in sorted(group)}

    def _temporal(self, gid: int) -> tuple[float, int]:
        # FIFO is an overlap measure, not an attribution of specific funds.
        available: deque[list[Any]] = deque()
        matched = 0.0
        total_out = 0.0
        days = self._daily.get(gid, {})
        for day, row in sorted(days.items()):
            while available and (day - available[0][0]).days > 2:
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

    def _analyze(self) -> dict[int, dict[str, Any]]:
        G = self.G
        pagerank = nx.pagerank(G, weight="sum_kzt")
        between = nx.betweenness_centrality(G, k=min(128, len(G)), weight=None, seed=42)
        seed_reach: dict[int, set[int]] = defaultdict(set)
        for gid, row in self._nodes.items():
            if row["is_seed"]:
                for target in nx.single_source_shortest_path_length(G, gid, cutoff=4):
                    if target != gid:
                        seed_reach[target].add(gid)
        raw = {}
        for gid, node in self._nodes.items():
            in_kzt = float(G.in_degree(gid, weight="sum_kzt"))
            out_kzt = float(G.out_degree(gid, weight="sum_kzt"))
            ratio = out_kzt / in_kzt if in_kzt else None
            temporal, active = self._temporal(gid)
            neighbor_clusters = len({self._cluster_map[n] for n in set(G.predecessors(gid)) | set(G.successors(gid))})
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
        distributions = {key: sorted(row[key] for row in raw.values()) for key in ("pagerank", "betweenness", "visible_volume")}

        def percentile(key: str, value: float) -> float:
            return bisect_right(distributions[key], value) / len(raw) if value > 0 else 0.0

        records = {}
        for gid, node in self._nodes.items():
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
            evidence = self._evidence(role, m, node)
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
                "cluster_id": self._cluster_map[gid], "evidence": evidence[:200], "truncated_by_depth": boundary,
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

    @staticmethod
    def _evidence(role: str, m: dict[str, Any], node: dict[str, Any]) -> str:
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

    @staticmethod
    def _brief(row: dict[str, Any]) -> dict[str, Any]:
        keys = ("gid", "role", "role_score", "priority_score", "cluster_id", "evidence", "depth", "is_seed",
                "truncated_by_depth", "in_degree", "out_degree", "in_kzt", "out_kzt", "rank")
        return {key: row[key] for key in keys}

    def _cluster_summaries(self) -> list[dict[str, Any]]:
        result = []
        for cluster_id in sorted(set(self._cluster_map.values())):
            members = [r for r in self._ranked if r["cluster_id"] == cluster_id]
            gids = {r["gid"] for r in members}
            roles = dict(Counter(r["role"] for r in members))
            turnover = sum(e["sum_kzt"] for src, dst, e in self.G.edges(data=True) if src in gids and dst in gids)
            seeds = sum(r["is_seed"] for r in members)
            if len(members) == 1 and self.G.degree(members[0]["gid"]) == 0:
                hypothesis = "Isolated supplied account; no transfer-based cluster hypothesis is supported."
            else:
                hypothesis = (f"Observed flow community with {seeds} seed accounts, {roles.get('consolidator', 0)} consolidation candidates "
                              f"and {roles.get('boundary_unknown', 0)} boundary accounts. Validate shared purpose; community membership does not establish affiliation.")
            result.append({"cluster_id": cluster_id, "n_nodes": len(members), "n_seed": seeds,
                           "sum_kzt_internal": _number(turnover), "top_gids": [r["gid"] for r in members[:5]],
                           "hypothesis": hypothesis, "roles": roles})
        return result

    def _activity_summary(self) -> list[dict[str, Any]]:
        if not self._transactions:
            return []
        start = _day(self._transactions[0]["date"])
        end = _day(self._transactions[-1]["date"])
        period_days = (end - start).days + 1
        width = (period_days + 31) // 32
        buckets = [
            {"start": (start + timedelta(days=offset)).isoformat(),
             "end": (start + timedelta(days=min(offset + width, period_days) - 1)).isoformat(),
             "n_tx": 0, "sum_kzt": 0.0}
            for offset in range(0, period_days, width)
        ]
        # Global activity counts raw transfers once, including self-transfers.
        for tx in self._transactions:
            bucket = buckets[(_day(tx["date"]) - start).days // width]
            bucket["n_tx"] += 1
            bucket["sum_kzt"] += float(tx["sum_kzt"])
        for bucket in buckets:
            bucket["sum_kzt"] = _number(bucket["sum_kzt"])
        return buckets

    def summary(self) -> dict[str, Any]:
        return {
            "dataset": {"name": self.dataset_name, "kind": self.dataset_kind,
                        "description": "Original generated demonstration; contains no organizer records." if self.dataset_kind == "synthetic" else "Locally configured dataset. Raw records remain on this machine."},
            "counts": {"nodes": len(self.G), "edges": self.G.number_of_edges(), "transactions": len(self._transactions),
                       "seeds": sum(r["is_seed"] for r in self._nodes.values()), "clusters": len(self._clusters),
                       "components": nx.number_weakly_connected_components(self.G),
                       "boundary_nodes": sum(r["truncated_by_depth"] for r in self._records.values()),
                       "isolated_nodes": len(list(nx.isolates(self.G)))},
            "period": {"start": self._activity[0]["start"] if self._activity else None,
                       "end": self._activity[-1]["end"] if self._activity else None},
            "activity": self._activity,
            "total_kzt": _number(sum(r["sum_kzt"] for r in self._edges)), "runtime_ms": self.runtime_ms,
            "role_counts": {role: sum(r["role"] == role for r in self._records.values()) for role in ROLES},
            "limitations": LIMITATIONS, "top_nodes": [self._brief(r) for r in self._ranked[:20]],
        }

    def nodes(self, query: str = "", role: str | None = None, cluster_id: int | None = None,
              limit: int = 50, offset: int = 0) -> dict[str, Any]:
        query = query.strip().casefold()
        matched = [r for r in self._ranked if (not query or query in str(r["gid"]))
                   and (not role or r["role"] == role) and (cluster_id is None or r["cluster_id"] == cluster_id)]
        start = max(0, min(offset, len(matched)))
        return {"items": [self._brief(r) for r in matched[start:start + max(0, min(limit, 500))]],
                "total": len(matched)}

    def node(self, gid: int) -> dict[str, Any] | None:
        if gid not in self._records:
            return None
        row = self._records[gid]
        incoming = [{"gid": src, "role": self._records[src]["role"], "sum_kzt": edge["sum_kzt"], "n_tx": edge["n_tx"]}
                    for src, _, edge in self.G.in_edges(gid, data=True)]
        outgoing = [{"gid": dst, "role": self._records[dst]["role"], "sum_kzt": edge["sum_kzt"], "n_tx": edge["n_tx"]}
                    for _, dst, edge in self.G.out_edges(gid, data=True)]
        return {**row, "timeline": [{"date": day.isoformat(), **{k: _number(v) for k, v in values.items()}}
                                    for day, values in sorted(self._daily.get(gid, {}).items())],
                "counterparties": {"incoming": sorted(incoming, key=lambda r: (-r["sum_kzt"], r["gid"]))[:25],
                                   "outgoing": sorted(outgoing, key=lambda r: (-r["sum_kzt"], r["gid"]))[:25]}}

    def graph(self, gid: int | None = None, hops: int = 1, limit: int = 120) -> dict[str, Any]:
        limit = max(1, min(limit, 400))
        if gid is not None and gid not in self.G:
            return {"nodes": [], "edges": [], "truncated": False, "root_gid": gid}
        if gid is None:
            ordered = [r["gid"] for r in self._ranked]
        else:
            distances = nx.single_source_shortest_path_length(self.G.to_undirected(as_view=True), gid, cutoff=max(1, min(hops, 3)))
            ordered = sorted(distances, key=lambda n: (distances[n], -self._records[n]["priority_score"], n))
        selected = set(ordered[:limit])
        nodes = [{**self._brief(self._records[n]), "id": str(n), "label": str(n), "is_root": n == gid} for n in ordered[:limit]]
        edges = [{"id": f"{src}-{dst}", "source": str(src), "target": str(dst), "src": src, "dst": dst, **data}
                 for src, dst, data in self.G.edges(data=True) if src in selected and dst in selected]
        return {"nodes": nodes, "edges": edges, "truncated": len(ordered) > limit, "root_gid": gid}

    def clusters(self) -> dict[str, Any]:
        return {"items": self._clusters}

    def export_rows(self, name: str) -> tuple[tuple[str, ...], list[dict[str, Any]]]:
        if name == "nodes_roles.csv":
            return ROLE_COLUMNS, [{key: r[key] for key in ROLE_COLUMNS} for r in sorted(self._records.values(), key=lambda r: r["gid"])]
        if name == "clusters.csv":
            return CLUSTER_COLUMNS, [{key: json.dumps(r[key]) if key == "top_gids" else r[key] for key in CLUSTER_COLUMNS} for r in self._clusters]
        if name == "top_nodes.csv":
            return TOP_COLUMNS, [{"rank": r["rank"], "gid": r["gid"], "role": r["role"], "priority_score": r["priority_score"], "why": r["evidence"]} for r in self._ranked[:max(20, min(100, len(self._ranked)))]]
        raise ValueError("Unknown export")

    def exports(self, output_dir: str | Path) -> dict[str, str]:
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        paths = {}
        for name in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv"):
            columns, rows = self.export_rows(name)
            path = output / name
            with path.open("w", newline="", encoding="utf-8") as stream:
                writer = csv.DictWriter(stream, fieldnames=columns)
                writer.writeheader()
                writer.writerows(rows)
            paths[name] = str(path)
        return paths


def load_analysis(data_dir: str | Path | None = None) -> Analysis:
    if not data_dir:
        nodes, edges, tx = synthetic_frames()
        return Analysis(nodes, edges, tx)
    directory = Path(data_dir).expanduser().resolve()
    paths = {name: directory / f"{name}.parquet" for name in ("nodes", "edges", "transactions")}
    if not all(path.is_file() for path in paths.values()):
        raise ValueError("MONEYGRAPH_DATA_DIR must contain nodes.parquet, edges.parquet and transactions.parquet")
    return Analysis(pl.read_parquet(paths["nodes"]), pl.read_parquet(paths["edges"]), pl.read_parquet(paths["transactions"]),
                    dataset_kind="official", dataset_name="Local transaction dataset")

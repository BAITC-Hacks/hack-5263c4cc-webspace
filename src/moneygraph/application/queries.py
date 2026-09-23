"""Bounded read models over one immutable published analysis."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

import networkx as nx

from ..analysis.snapshot import AnalysisSnapshot
from ..domain.models import LIMITATIONS, ROLES, day_value as _day, finite_number as _number

MAX_GRAPH_EDGES = 2000


class QueryService:
    def __init__(self, snapshot: AnalysisSnapshot):
        self.snapshot = snapshot
        self.dataset_kind = snapshot.dataset_kind
        self.dataset_name = snapshot.dataset_name
        self.runtime_ms = snapshot.runtime_ms
        tables = snapshot.canonical_tables()
        self._nodes = {row["gid"]: row for row in tables["nodes"]}
        self._edges = tables["edges"]
        self._transactions = tables["transactions"]
        self._records = snapshot.node_records()
        self._ranked = sorted(self._records.values(), key=lambda row: row["rank"])
        self._clusters = snapshot.cluster_records()
        self._graph = snapshot.graph_copy()

    @staticmethod
    def _brief(row: dict[str, Any]) -> dict[str, Any]:
        keys = ("gid", "role", "role_score", "priority_score", "cluster_id", "evidence", "depth", "is_seed",
                "truncated_by_depth", "in_degree", "out_degree", "in_kzt", "out_kzt", "rank")
        return {key: row[key] for key in keys}

    def summary(self) -> dict[str, Any]:
        dates = [_day(r["date"]) for r in self._transactions]
        return {
            "dataset": {"name": self.dataset_name, "kind": self.dataset_kind,
                        "description": "Original generated demonstration; contains no organizer records." if self.dataset_kind == "synthetic" else "Locally configured dataset. Raw records remain on this machine."},
            "counts": {"nodes": len(self._graph), "edges": self._graph.number_of_edges(), "transactions": len(self._transactions),
                       "seeds": sum(r["is_seed"] for r in self._nodes.values()), "clusters": len(self._clusters),
                       "components": nx.number_weakly_connected_components(self._graph),
                       "boundary_nodes": sum(r["truncated_by_depth"] for r in self._records.values()),
                       "isolated_nodes": len(list(nx.isolates(self._graph)))},
            "period": {"start": min(dates).isoformat() if dates else None, "end": max(dates).isoformat() if dates else None},
            "total_kzt": _number(sum(r["sum_kzt"] for r in self._edges)), "runtime_ms": self.runtime_ms,
            "role_counts": {role: sum(r["role"] == role for r in self._records.values()) for role in ROLES},
            "limitations": list(LIMITATIONS), "top_nodes": [self._brief(r) for r in self._ranked[:20]],
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
                    for src, _, edge in self._graph.in_edges(gid, data=True)]
        outgoing = [{"gid": dst, "role": self._records[dst]["role"], "sum_kzt": edge["sum_kzt"], "n_tx": edge["n_tx"]}
                    for _, dst, edge in self._graph.out_edges(gid, data=True)]
        result = {**row, "timeline": [{"date": day.isoformat(), **{k: _number(v) for k, v in values.items()}}
                                    for day, values in sorted(self.snapshot.daily_records(gid).items())],
                "counterparties": {"incoming": sorted(incoming, key=lambda r: (-r["sum_kzt"], r["gid"]))[:25],
                                   "outgoing": sorted(outgoing, key=lambda r: (-r["sum_kzt"], r["gid"]))[:25]}}
        return deepcopy(result)


    def graph(self, gid: int | None = None, hops: int = 1, limit: int = 120) -> dict[str, Any]:
        limit = max(1, min(limit, 400))
        if gid is not None and gid not in self._graph:
            return {"nodes": [], "edges": [], "truncated": False, "root_gid": gid,
                    "total_nodes": 0, "total_edges": 0, "returned_nodes": 0, "returned_edges": 0,
                    "truncation_reasons": []}
        if gid is None:
            ordered = [row["gid"] for row in self._ranked]
        else:
            distances = nx.single_source_shortest_path_length(
                self._graph.to_undirected(as_view=True), gid, cutoff=max(1, min(hops, 3)))
            ordered = sorted(distances, key=lambda node: (distances[node], -self._records[node]["priority_score"], node))
        selected = set(ordered[:limit])
        eligible = set(ordered)
        nodes = [{**self._brief(self._records[node]), "id": str(node), "label": str(node), "is_root": node == gid}
                 for node in ordered[:limit]]
        # Graph insertion is canonical (source, destination); prefix truncation is deterministic.
        total_edges = 0
        selected_edge_count = 0
        edges = []
        for src, dst, data in self._graph.edges(data=True):
            if src in eligible and dst in eligible:
                total_edges += 1
            if src in selected and dst in selected:
                selected_edge_count += 1
                if len(edges) < MAX_GRAPH_EDGES:
                    edges.append({"id": f"{src}-{dst}", "source": str(src), "target": str(dst),
                                  "src": src, "dst": dst, **data})
        reasons = []
        if len(ordered) > len(nodes):
            reasons.append("node_limit")
        if selected_edge_count > len(edges):
            reasons.append("edge_limit")
        return deepcopy({"nodes": nodes, "edges": edges, "truncated": bool(reasons), "root_gid": gid,
                         "total_nodes": len(ordered), "total_edges": total_edges,
                         "returned_nodes": len(nodes), "returned_edges": len(edges),
                         "truncation_reasons": reasons})

    def clusters(self) -> dict[str, Any]:
        return {"items": deepcopy(self._clusters)}

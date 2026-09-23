"""Bounded, deterministic investigation signals over the observed graph.

These views deliberately do not change role assignments or submission exports.
They describe motifs and structural sensitivity, never guilt or fund identity.
"""
from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from copy import deepcopy
from datetime import date, timedelta
from statistics import median
from typing import Any
from threading import RLock

import networkx as nx

from .snapshot import snapshot_of
from ..domain.models import day_value as _day, finite_number as _number

MAX_ROUTES = 20
MAX_ROUTE_PAIRS = 4096
MAX_CYCLES = 12
MAX_CYCLE_STEPS = 20000


class SignalAnalysis:
    """Read-only derived evidence. Scope is a validated node or bounded cohort."""

    def __init__(self, analysis: Any):
        self.snapshot = snapshot_of(analysis)
        self._records = self.snapshot.node_records()
        self._ranked = sorted(self._records.values(), key=lambda row: row["rank"])
        self._graph = self.snapshot.graph_copy()
        self._cache_lock = RLock()
        self._edge_days: dict[tuple[int, int], dict[date, float]] = defaultdict(lambda: defaultdict(float))
        self._incoming: dict[int, list[dict[str, Any]]] = defaultdict(list)
        self._outgoing: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for source in self.snapshot.canonical_tables()["transactions"]:
            row = {"src": int(source["src"]), "dst": int(source["dst"]),
                   "date": _day(source["date"]), "sum_kzt": float(source["sum_kzt"])}
            self._edge_days[(row["src"], row["dst"])][row["date"]] += row["sum_kzt"]
            self._incoming[row["dst"]].append(row)
            self._outgoing[row["src"]].append(row)
        self._cache: dict[int, dict[str, Any]] = {}
        self._resilience_cache: dict[int, dict[str, Any]] = {}

    def _require(self, gid: int) -> dict[str, Any]:
        node = self._records.get(gid)
        if node is None:
            raise KeyError(gid)
        return node

    @property
    def G(self) -> nx.DiGraph:
        return deepcopy(self._graph)

    def node(self, gid: int) -> dict[str, Any]:
        with self._cache_lock:
            return deepcopy(self._node(gid))

    def _node(self, gid: int) -> dict[str, Any]:
        node = self._require(gid)
        if gid in self._cache:
            return self._cache[gid]
        routes, route_limited = self._routes(gid)
        cycles, cycle_limited = self._cycles(gid)
        result = {
            "gid": gid,
            "temporal": self._temporal(gid, node),
            "routes": routes,
            "cycles": cycles,
            "anomalies": self._anomalies(gid, node),
            "limits": {"route_center_gid": gid, "max_route_pairs": MAX_ROUTE_PAIRS,
                       "max_routes": MAX_ROUTES, "max_occurrences_per_route": 12,
                       "routes_truncated": route_limited, "max_cycle_length": 4,
                       "max_cycles": MAX_CYCLES, "max_cycle_steps": MAX_CYCLE_STEPS,
                       "cycles_truncated": cycle_limited},
            "caveats": [
                "Signals describe observed structure. They do not establish criminal intent, shared ownership, or movement of the same funds.",
                "Dates have daily precision; transfers on the same day cannot be ordered.",
                "Transfers below 5,000 KZT, other banks, off-sample inflows and activity outside the window are not visible.",
                "Bounded search and an empty result do not establish that a pattern is absent from the complete network.",
            ],
        }
        if node["truncated_by_depth"]:
            result["caveats"].insert(0, "This depth-four observation boundary cannot establish a final beneficiary.")
        self._cache[gid] = result
        return result

    def _temporal(self, gid: int, node: dict[str, Any]) -> dict[str, Any]:
        daily = self.snapshot.daily_records(gid)
        volumes = [r["in_kzt"] + r["out_kzt"] for r in daily.values()]
        baseline = median(volumes) if volumes else 0
        spikes = []
        if len(volumes) >= 3 and baseline > 0:
            for day, values in sorted(daily.items()):
                volume = values["in_kzt"] + values["out_kzt"]
                if volume >= 3 * baseline:
                    spikes.append({"date": day.isoformat(), "total_kzt": _number(volume),
                                   "baseline_median_kzt": _number(baseline), "ratio": _number(volume / baseline)})
        grouped: dict[date, dict[str, Any]] = defaultdict(lambda: {"payers": set(), "sum_kzt": 0.0})
        for tx in self._incoming.get(gid, []):
            grouped[tx["date"]]["payers"].add(tx["src"])
            grouped[tx["date"]]["sum_kzt"] += tx["sum_kzt"]
        synchronized = [{"date": day.isoformat(), "payers": sorted(values["payers"])[:50],
                         "payer_count": len(values["payers"]), "sum_kzt": _number(values["sum_kzt"])}
                        for day, values in sorted(grouped.items()) if len(values["payers"]) >= 3]
        return {"overlap_2d_ratio": node["metrics"]["matched_2d_ratio"], "spikes": spikes[:31],
                "synchronized_inflows": synchronized[:31],
                "caveat": "Overlap includes same-day transfers and is not fund attribution. Spikes compare active days only (minimum three); same-day multi-payer activity does not prove intraday synchronization."}

    def _routes(self, gid: int) -> tuple[list[dict[str, Any]], bool]:
        routes, examined = [], 0
        incoming = sorted(src for src in self._graph.predecessors(gid) if src != gid)
        outgoing = sorted(dst for dst in self._graph.successors(gid) if dst != gid)
        possible = len(incoming) * len(outgoing) - len(set(incoming) & set(outgoing))
        for src in incoming:
            if examined >= MAX_ROUTE_PAIRS:
                break
            for dst in outgoing:
                if src == gid or dst == gid or src == dst:
                    continue
                if examined >= MAX_ROUTE_PAIRS:
                    break
                examined += 1
                in_days, out_days = self._edge_days[(src, gid)], self._edge_days[(gid, dst)]
                used_out: set[date] = set()
                occurrences = []
                for day, amount in sorted(in_days.items()):
                    candidates = [day + timedelta(days=lag) for lag in (1, 2)]
                    out_day = next((d for d in candidates if d in out_days and d not in used_out), None)
                    if out_day is None:
                        continue
                    used_out.add(out_day)
                    occurrences.append({"in_date": day.isoformat(), "out_date": out_day.isoformat(),
                                        "in_kzt": _number(amount), "out_kzt": _number(out_days[out_day]),
                                        "lag_days": (out_day - day).days})
                if len(occurrences) >= 2:
                    routes.append({"path": [src, gid, dst], "occurrences": occurrences[:12],
                                   "occurrence_count": len(occurrences), "distinct_start_dates": len(occurrences)})
        routes.sort(key=lambda r: (-r["occurrence_count"], r["path"]))
        return routes[:MAX_ROUTES], possible > examined or len(routes) > MAX_ROUTES

    def _cycles(self, gid: int) -> tuple[list[dict[str, Any]], bool]:
        # A selected-node DFS avoids enumerating every cycle in a dense graph.
        paths: list[list[int]] = []
        steps = 0
        limited = False

        def walk(path: list[int]) -> None:
            nonlocal steps, limited
            if limited:
                return
            for target in sorted(self._graph.successors(path[-1])):
                steps += 1
                if steps > MAX_CYCLE_STEPS:
                    limited = True
                    return
                if target == gid and 2 <= len(path) <= 4:
                    paths.append(path + [gid])
                elif target not in path and len(path) < 4:
                    walk(path + [target])
                if limited:
                    return

        walk([gid])
        paths.sort(key=lambda path: (len(path), path))
        result = []
        for path in paths[:MAX_CYCLES]:
            edges = [{"src": src, "dst": dst, "sum_kzt": _number(self._graph[src][dst]["sum_kzt"]),
                      "dates": [day.isoformat() for day in sorted(self._edge_days[(src, dst)])][:31]}
                     for src, dst in zip(path, path[1:])]
            chronology: list[dict[str, Any]] | None = []
            previous = None
            for src, dst in zip(path, path[1:]):
                available = sorted(self._edge_days[(src, dst)])
                selected = next((day for day in available if previous is None or day > previous), None)
                if selected is None:
                    chronology = None
                    break
                chronology.append({"src": src, "dst": dst, "date": selected.isoformat(),
                                   "sum_kzt": _number(self._edge_days[(src, dst)][selected])})
                previous = selected
            result.append({"path": path, "edges": edges, "chronological_example": chronology,
                           "kind": "date_consistent_cycle" if chronology else "structural_cycle"})
        return result, limited or len(paths) > MAX_CYCLES

    def _anomalies(self, gid: int, node: dict[str, Any]) -> list[dict[str, Any]]:
        result = []
        peers = [r for r in self._records.values() if r["depth"] == node["depth"]]
        if len(peers) >= 10:
            for metric, label in (("visible_volume", "visible volume"), ("in_degree", "incoming counterparties"),
                                  ("out_degree", "outgoing counterparties")):
                values = sorted(r["metrics"][metric] for r in peers)
                value = node["metrics"][metric]
                baseline = median(values)
                positives = [v for v in values if v > 0]
                comparison = baseline if baseline > 0 else (median(positives) if metric == "visible_volume" and positives else 1)
                percentile = bisect_right(values, value) / len(values)
                if value > 0 and percentile >= 0.95 and value >= 3 * comparison:
                    result.append({"id": f"depth_peer_{metric}", "title": f"High {label} for depth {node['depth']}",
                                   "evidence": f"{value:,.2f} versus depth-peer median {baseline:,.2f}; empirical percentile {percentile:.1%} across {len(peers)} accounts.",
                                   "metrics": {"value": _number(value), "peer_median": _number(baseline),
                                               "comparison_baseline": _number(comparison), "percentile": _number(percentile),
                                               "peer_count": len(peers), "depth": node["depth"]}})
        for direction, transactions in (("incoming", self._incoming.get(gid, [])), ("outgoing", self._outgoing.get(gid, []))):
            groups: dict[tuple[date, int], list[dict[str, Any]]] = defaultdict(list)
            for row in transactions:
                if row["sum_kzt"] >= 5000:
                    groups[(row["date"], round(row["sum_kzt"] * 100))].append(row)
            for (day, cents), rows in sorted(groups.items()):
                counterparties = sorted({row["src" if direction == "incoming" else "dst"] for row in rows})
                if len(rows) >= 3 and len(counterparties) >= 2:
                    result.append({"id": f"repeated_amount_{direction}_{day.isoformat()}_{cents}",
                                   "title": f"Repeated equal {direction} payments",
                                   "evidence": f"{len(rows)} transfers of {cents / 100:,.2f} KZT with {len(counterparties)} counterparties on {day.isoformat()}. Repetition alone does not establish deliberate splitting.",
                                   "metrics": {"direction": direction, "date": day.isoformat(), "amount_kzt": cents / 100,
                                               "transaction_count": len(rows), "counterparty_count": len(counterparties),
                                               "counterparties": counterparties[:20], "sum_kzt": _number(sum(r["sum_kzt"] for r in rows))}})
        return result[:25]

    def _network_metrics(self, graph: nx.DiGraph) -> dict[str, int]:
        components = list(nx.weakly_connected_components(graph))
        reach = 0
        for gid in sorted(graph):
            if self._records[gid]["is_seed"]:
                reach += len(nx.single_source_shortest_path_length(graph, gid, cutoff=4)) - 1
        return {"nodes": len(graph), "edges": graph.number_of_edges(), "weak_components": len(components),
                "largest_component_nodes": max((len(c) for c in components), default=0),
                "reachable_seed_pairs": reach}

    def resilience(self, top_n: int = 5) -> dict[str, Any]:
        with self._cache_lock:
            return deepcopy(self._resilience(top_n))

    def _resilience(self, top_n: int = 5) -> dict[str, Any]:
        if not isinstance(top_n, int) or isinstance(top_n, bool) or not 1 <= top_n <= 20:
            raise ValueError("top_n must be an integer from 1 to 20")
        if top_n in self._resilience_cache:
            return self._resilience_cache[top_n]
        removed = [r["gid"] for r in self._ranked[:top_n]]
        after_graph = self._graph.copy()
        after_graph.remove_nodes_from(removed)
        before, after = self._network_metrics(self._graph), self._network_metrics(after_graph)
        result = {"top_n": top_n, "removed_gids": removed, "baseline": before, "after": after,
                  "change": {key: after[key] - before[key] for key in
                             ("weak_components", "largest_component_nodes", "reachable_seed_pairs")},
                  "caveat": "Structural removal experiment, not an operational prediction or recommendation to block accounts. Reach counts source-target pairs from seeds within four directed hops, excluding self; removed seeds and accounts contribute to the reduction. Weak components include isolated nodes. Priority is not guilt."}
        self._resilience_cache[top_n] = result
        return result

    def collectors(self, gids: list[int], max_hops: int = 3) -> dict[str, Any]:
        if not 1 <= len(gids) <= 5 or len(set(gids)) != len(gids):
            raise ValueError("Select one to five distinct accounts")
        if not isinstance(max_hops, int) or isinstance(max_hops, bool) or not 1 <= max_hops <= 3:
            raise ValueError("max_hops must be an integer from 1 to 3")
        for gid in gids:
            self._require(gid)
        # Input order cannot change the selected paths or output ranking.
        gids = sorted(gids)
        traversals = {gid: nx.single_source_shortest_path(self._graph, gid, cutoff=max_hops) for gid in gids}
        common = set.intersection(*(set(paths) for paths in traversals.values())) - set(gids)
        ordered = sorted(common, key=lambda gid: (-self._records[gid]["priority_score"], gid))
        items = []
        for gid in ordered[:20]:
            row = self._records[gid]
            items.append({"gid": gid, "role": row["role"], "priority_score": row["priority_score"],
                          "paths": [{"source_gid": source, "path": traversals[source][gid],
                                     "hops": len(traversals[source][gid]) - 1} for source in gids],
                          "matched_sources": len(gids)})
        return {"gids": gids, "max_hops": max_hops, "items": items,
                "total": len(ordered), "truncated": len(ordered) > len(items),
                "caveat": "Candidates are reachable from every selected account over observed directed paths; they are not necessarily direct collectors. Paths do not prove the same funds moved, coordination, ownership or illegal activity. At most twenty candidates shown."}

    def dossier(self, gid: int) -> dict[str, Any]:
        node = self._require(gid)
        signals = self.node(gid)
        evidence = [node["evidence"],
                    f"Visible inflow {node['in_kzt']:,.2f} KZT from {node['in_degree']} distinct payers; visible outflow {node['out_kzt']:,.2f} KZT to {node['out_degree']} distinct recipients.",
                    f"Reachable from {node['metrics']['seed_reach']} seeds within four directed hops; community {node['cluster_id']}; priority rank {node['rank']}.",
                    f"Two-day visible flow overlap {node['metrics']['matched_2d_ratio']:.1%}; {node['metrics']['active_days']} active dates."]
        hypotheses = [f"The documented rule supports a {node['role']} role hypothesis with heuristic fit {node['role_score']:.3f}. This is not an allegation or calibrated probability."]
        if signals["routes"]:
            evidence.append(f"{len(signals['routes'])} recurring two-hop routes shown through this node; each has at least two distinct dated occurrences.")
            hypotheses.append("Repeated routes may warrant checking regular business purposes and counterparties; legitimate recurring payments remain plausible.")
        if signals["cycles"]:
            evidence.append(f"{len(signals['cycles'])} directed cycles of two to four edges shown; dates determine whether an ordered example exists.")
        missing = ["Full incoming flows, interbank transfers, account balances and payment purposes are absent.",
                   "Transfers below 5,000 KZT and activity outside the observation window are not visible.",
                   "Daily timestamps do not resolve intraday order or establish that the same funds moved onward.",
                   "No customer identity, beneficial ownership or labeled roles are supplied."]
        requests = [
            {"priority": 1, "request": "Request complete incoming and outgoing statements for the review account through the authorized bank process.",
             "reason": "Reconcile incomplete visible flows and distinguish an observed role from actual balance behavior."},
            {"priority": 2, "request": "Request transaction timestamps, references and documented payment purposes for the highlighted routes.",
             "reason": "Test timing and legitimate-business explanations without inferring fund identity from daily amounts."},
            {"priority": 3, "request": "Request an authorized extension of the period, interbank coverage and smaller-value transfers.",
             "reason": "Evaluate persistence and collection blind spots; below-threshold splitting cannot be assessed here."},
        ]
        if node["truncated_by_depth"]:
            missing.insert(0, "Outgoing activity beyond the depth-four collection boundary is unknown; final-beneficiary status cannot be established.")
            requests.insert(0, {"priority": 0, "request": "Extend the authorized outgoing graph collection beyond this depth-four account.",
                                "reason": "The current zero outflow is a collection boundary, not evidence of retained funds."})
        if node["observability"]["level"] == "isolated":
            missing.insert(0, "The node is supplied but no transfer involving it was observed; its financial role cannot be inferred from this sample.")
        if node["is_seed"]:
            missing.insert(0, "Incoming transfers to the starting seed are especially incomplete; visible out/in ratio cannot establish pass-through behavior.")
        return {"gid": gid, "title": f"Account {gid} — evidence dossier", "role": node["role"],
                "priority_score": node["priority_score"], "evidence": evidence, "hypotheses": hypotheses,
                "missing_evidence": missing, "next_requests": requests,
                "citations": [f"node:{gid}", f"signals:{gid}"]}

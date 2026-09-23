"""Graph construction, reproducible centrality and community structure."""
from collections import Counter, defaultdict
from typing import Any

import networkx as nx

from ..domain.models import CanonicalInput, RuleConfig, finite_number as _number


def build_graph(inputs: CanonicalInput) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_nodes_from(inputs.nodes)
    for row in inputs.edges:
        graph.add_edge(int(row["src"]), int(row["dst"]), sum_kzt=float(row["sum_kzt"]),
                       n_tx=int(row["n_tx"]), depth=int(row["depth"]))
    return graph


def centrality(graph: nx.DiGraph, nodes: dict, config: RuleConfig) -> tuple[dict, dict, dict]:
    pagerank = nx.pagerank(graph, weight="sum_kzt")
    between = nx.betweenness_centrality(graph, k=min(config.betweenness_samples, len(graph)), weight=None, seed=config.random_seed)
    seed_reach: dict[int, set[int]] = defaultdict(set)
    for gid, row in nodes.items():
        if row["is_seed"]:
            for target in nx.single_source_shortest_path_length(graph, gid, cutoff=config.seed_reach_hops):
                if target != gid:
                    seed_reach[target].add(gid)
    return pagerank, between, seed_reach


def find_communities(nodes: dict, graph: nx.DiGraph, config: RuleConfig) -> dict[int, int]:
    projection = nx.Graph()
    projection.add_nodes_from(nodes)
    for src, dst, edge in graph.edges(data=True):
        weight = edge["sum_kzt"] + projection.get_edge_data(src, dst, {}).get("weight", 0)
        projection.add_edge(src, dst, weight=weight)
    if projection.number_of_edges():
        communities = list(nx.community.louvain_communities(projection, weight="weight", seed=config.random_seed))
    else:
        communities = [{gid} for gid in nodes]
    communities.sort(key=lambda group: (-len(group), min(group)))
    return {gid: index for index, group in enumerate(communities) for gid in sorted(group)}


def summarize_communities(cluster_map: dict, ranked: list, graph: nx.DiGraph) -> list[dict[str, Any]]:
    result = []
    for cluster_id in sorted(set(cluster_map.values())):
        members = [r for r in ranked if r["cluster_id"] == cluster_id]
        gids = {r["gid"] for r in members}
        roles = dict(Counter(r["role"] for r in members))
        turnover = sum(e["sum_kzt"] for src, dst, e in graph.edges(data=True) if src in gids and dst in gids)
        seeds = sum(r["is_seed"] for r in members)
        if len(members) == 1 and graph.degree(members[0]["gid"]) == 0:
            hypothesis = "Isolated supplied account; no transfer-based cluster hypothesis is supported."
        else:
            hypothesis = (f"Observed flow community with {seeds} seed accounts, {roles.get('consolidator', 0)} consolidation candidates "
                          f"and {roles.get('boundary_unknown', 0)} boundary accounts. Validate shared purpose; community membership does not establish affiliation.")
        result.append({"cluster_id": cluster_id, "n_nodes": len(members), "n_seed": seeds,
                       "sum_kzt_internal": _number(turnover), "top_gids": [r["gid"] for r in members[:5]],
                       "hypothesis": hypothesis, "roles": roles})
    return result

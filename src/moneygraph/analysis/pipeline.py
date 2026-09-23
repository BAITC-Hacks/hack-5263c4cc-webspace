"""Pure in-memory analysis orchestration; adapters own all external reads."""
from __future__ import annotations

from time import perf_counter
from typing import Any

from ..domain.models import CanonicalInput, RuleConfig
from ..domain.rules import assign_roles
from .features import compute_features, daily_flows
from .graph import build_graph, find_communities, summarize_communities
from .snapshot import AnalysisSnapshot


def build_analysis(inputs: CanonicalInput, rule_config: RuleConfig = RuleConfig(), *,
                   dataset_kind: str = "synthetic", dataset_name: str = "Synthetic investigation demo",
                   calculation_manifest: dict[str, Any] | None = None) -> AnalysisSnapshot:
    started = perf_counter()
    graph = build_graph(inputs)
    daily = daily_flows(inputs.transactions)
    clusters = find_communities(inputs.nodes, graph, rule_config)
    features = compute_features(inputs.nodes, graph, daily, clusters, rule_config)
    records = assign_roles(inputs.nodes, features, clusters)
    ranked = sorted(records.values(), key=lambda row: (-row["priority_score"], row["gid"]))
    for rank, row in enumerate(ranked, 1):
        row["rank"] = rank
    summaries = summarize_communities(clusters, ranked, graph)
    return AnalysisSnapshot(
        dataset_kind=dataset_kind, dataset_name=dataset_name,
        runtime_ms=round((perf_counter() - started) * 1000, 2), rule_config=rule_config,
        _tables={"nodes": list(inputs.nodes.values()), "edges": inputs.edges, "transactions": inputs.transactions},
        _records=records, _ranked_gids=tuple(row["gid"] for row in ranked),
        _clusters=summaries, _daily=daily, _graph=graph, _manifest=calculation_manifest or {},
    )

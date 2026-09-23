"""Compatibility facade over deterministic computation and application services.

New consumers read the snapshot through public copying interfaces. Local I/O is
delegated to adapters; no environment or network access occurs during import.
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any

import networkx as nx
import polars as pl

from .adapters.filesystem import read_calculation_manifest, write_exports
from .adapters.parquet import read_parquet_tables
from .analysis.fixtures import synthetic_frames
from .analysis.pipeline import build_analysis
from .analysis.snapshot import AnalysisSnapshot
from .analysis.validation import prepare_input
from .application.exports import ExportService
from .application.queries import QueryService
from .domain.models import (CLUSTER_COLUMNS, ROLE_COLUMNS, TOP_COLUMNS, ROLES, RuleConfig,
                            LIMITATIONS as _LIMITATIONS, day_value as _day, finite_number as _number)

# Preserve the historical constant's list type without exposing the core constant.
LIMITATIONS = list(_LIMITATIONS)


class Analysis:
    def __init__(self, nodes: pl.DataFrame, edges: pl.DataFrame, transactions: pl.DataFrame,
                 *, dataset_kind: str = "synthetic", dataset_name: str = "Synthetic investigation demo",
                 rule_config: RuleConfig = RuleConfig()):
        inputs = prepare_input(nodes, edges, transactions)
        manifest = read_calculation_manifest(asdict(rule_config))
        self._snapshot = build_analysis(inputs, rule_config, dataset_kind=dataset_kind,
                                        dataset_name=dataset_name, calculation_manifest=manifest)
        self._queries = QueryService(self._snapshot)
        self._exports = ExportService(self._snapshot)

    @property
    def snapshot(self) -> AnalysisSnapshot:
        return self._snapshot

    @property
    def analysis_id(self) -> str:
        return self._snapshot.analysis_id

    @property
    def dataset_kind(self) -> str:
        return self._snapshot.dataset_kind

    @property
    def dataset_name(self) -> str:
        return self._snapshot.dataset_name

    @property
    def runtime_ms(self) -> float:
        return self._snapshot.runtime_ms

    @property
    def G(self) -> nx.DiGraph:
        """Legacy graph inspection returns a detached graph, including attributes."""
        return self.graph_copy()

    def canonical_tables(self) -> dict[str, list[dict[str, Any]]]:
        return self._snapshot.canonical_tables()

    def node_records(self) -> dict[int, dict[str, Any]]:
        return self._snapshot.node_records()

    def ranked_records(self) -> list[dict[str, Any]]:
        return self._snapshot.ranked_records()

    def daily_records(self, gid: int) -> dict:
        return self._snapshot.daily_records(gid)

    def graph_copy(self) -> nx.DiGraph:
        return self._snapshot.graph_copy()

    def summary(self) -> dict[str, Any]:
        return self._queries.summary()

    def nodes(self, query: str = "", role: str | None = None, cluster_id: int | None = None,
              limit: int = 50, offset: int = 0) -> dict[str, Any]:
        return self._queries.nodes(query, role, cluster_id, limit, offset)

    def node(self, gid: int) -> dict[str, Any] | None:
        return self._queries.node(gid)

    def graph(self, gid: int | None = None, hops: int = 1, limit: int = 120) -> dict[str, Any]:
        return self._queries.graph(gid, hops, limit)

    def clusters(self) -> dict[str, Any]:
        return self._queries.clusters()

    def export_rows(self, name: str) -> tuple[tuple[str, ...], list[dict[str, Any]]]:
        return self._exports.rows(name)

    def exports(self, output_dir: str | Path) -> dict[str, str]:
        return write_exports(self._exports, output_dir)


def load_analysis(data_dir: str | Path | None = None) -> Analysis:
    if not data_dir:
        return Analysis(*synthetic_frames())
    return Analysis(*read_parquet_tables(data_dir), dataset_kind="official", dataset_name="Local transaction dataset")

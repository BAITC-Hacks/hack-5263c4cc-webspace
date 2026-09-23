"""One completed analysis, exposing detached reads rather than mutable internals."""
from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any

import networkx as nx

from ..domain.models import RuleConfig, canonical_digest


@dataclass(frozen=True, slots=True)
class AnalysisSnapshot:
    dataset_kind: str
    dataset_name: str
    runtime_ms: float
    rule_config: RuleConfig
    _tables: dict[str, list[dict[str, Any]]] = field(repr=False)
    _records: dict[int, dict[str, Any]] = field(repr=False)
    _ranked_gids: tuple[int, ...] = field(repr=False)
    _clusters: list[dict[str, Any]] = field(repr=False)
    _daily: dict[int, dict[date, dict[str, float]]] = field(repr=False)
    _graph: nx.DiGraph = field(repr=False)
    _manifest: dict[str, Any] = field(repr=False)
    _table_hashes: dict[str, str] = field(init=False, repr=False)
    dataset_sha256: str = field(init=False)
    analysis_id: str = field(init=False)

    def __post_init__(self) -> None:
        # A frozen dataclass alone would not protect nested graph attributes or lists.
        for name in ("_tables", "_records", "_clusters", "_daily", "_graph", "_manifest"):
            object.__setattr__(self, name, deepcopy(getattr(self, name)))
        table_hashes = {name: canonical_digest(rows) for name, rows in self._tables.items()}
        object.__setattr__(self, "_table_hashes", table_hashes)
        object.__setattr__(self, "dataset_sha256", canonical_digest(table_hashes))
        identity = {"schema_version": 2, "dataset_sha256": self.dataset_sha256,
                    "rules": self.configuration(), "calculation": self._manifest}
        object.__setattr__(self, "analysis_id", canonical_digest(identity))

    def canonical_tables(self) -> dict[str, list[dict[str, Any]]]:
        return deepcopy(self._tables)

    def canonical_table_hashes(self) -> dict[str, str]:
        return dict(self._table_hashes)

    def node_records(self) -> dict[int, dict[str, Any]]:
        return deepcopy(self._records)

    def node_record(self, gid: int) -> dict[str, Any] | None:
        return deepcopy(self._records.get(gid))

    def ranked_records(self) -> list[dict[str, Any]]:
        return [deepcopy(self._records[gid]) for gid in self._ranked_gids]

    def cluster_records(self) -> list[dict[str, Any]]:
        return deepcopy(self._clusters)

    def daily_records(self, gid: int) -> dict[date, dict[str, float]]:
        return deepcopy(self._daily.get(gid, {}))

    def graph_copy(self) -> nx.DiGraph:
        return deepcopy(self._graph)

    def configuration(self) -> dict[str, Any]:
        return asdict(self.rule_config)

    def calculation_manifest(self) -> dict[str, Any]:
        return deepcopy(self._manifest)


def snapshot_of(value: Any) -> AnalysisSnapshot:
    """Accept the compatibility facade or a snapshot at application boundaries."""
    return value if isinstance(value, AnalysisSnapshot) else value.snapshot

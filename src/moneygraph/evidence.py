"""Shared read facade over one completed analysis and its derived signals.

Returned payloads belong to the caller. The underlying Analysis remains an
internal mutable implementation; this facade is not a security sandbox.
"""
from __future__ import annotations

from collections.abc import Callable
from copy import deepcopy
from threading import Lock, RLock
from typing import Any, Protocol, TypeVar

from .engine import Analysis
from .signals import SignalAnalysis

Payload = dict[str, Any]
_Result = TypeVar("_Result")
_services_lock = Lock()


class EvidenceReader(Protocol):
    """Read capabilities used by fixed-scope investigation tools."""

    def node(self, gid: int) -> Payload | None: ...
    def graph(self, gid: int | None = None, hops: int = 1, limit: int = 120) -> Payload: ...
    def clusters(self) -> Payload: ...
    def signal_node(self, gid: int) -> Payload: ...
    def resilience(self, top_n: int = 5) -> Payload: ...
    def collectors(self, gids: list[int], max_hops: int = 3) -> Payload: ...
    def dossier(self, gid: int) -> Payload: ...


class EvidenceService:
    """Reuse one signal index and return detached deterministic read results.

    Use get_evidence_service to share this instance across HTTP and AI reads.
    The analysis must be complete before it is published to readers. Mutation
    through an independently retained Analysis reference is outside this API.
    """

    def __init__(self, analysis: Analysis):
        self._analysis = analysis
        self._signals: SignalAnalysis | None = None
        self._lock = RLock()

    @property
    def dataset_kind(self) -> str:
        return self._analysis.dataset_kind

    @property
    def dataset_name(self) -> str:
        return self._analysis.dataset_name

    @property
    def evidence_version(self) -> str | None:
        metadata = getattr(self._analysis, "_snapshot_metadata", None)
        return metadata.evidence_version if metadata is not None else None

    def provenance(self) -> Payload:
        from .audit import provenance
        return self._read(lambda: provenance(self._analysis))

    def _read(self, operation: Callable[[], _Result]) -> _Result:
        with self._lock:
            return deepcopy(operation())

    def _signal_read(self, operation: Callable[[SignalAnalysis], _Result]) -> _Result:
        with self._lock:
            if self._signals is None:
                self._signals = SignalAnalysis(self._analysis)
            return deepcopy(operation(self._signals))

    def summary(self) -> Payload:
        return self._read(self._analysis.summary)

    def nodes(self, query: str = "", role: str | None = None, cluster_id: int | None = None,
              limit: int = 50, offset: int = 0) -> Payload:
        return self._read(lambda: self._analysis.nodes(query=query, role=role, cluster_id=cluster_id,
                                                      limit=limit, offset=offset))

    def node(self, gid: int) -> Payload | None:
        return self._read(lambda: self._analysis.node(gid))

    def graph(self, gid: int | None = None, hops: int = 1, limit: int = 120) -> Payload:
        return self._read(lambda: self._analysis.graph(gid=gid, hops=hops, limit=limit))

    def clusters(self) -> Payload:
        return self._read(self._analysis.clusters)

    def signal_node(self, gid: int) -> Payload:
        return self._signal_read(lambda signals: signals.node(gid))

    def resilience(self, top_n: int = 5) -> Payload:
        return self._signal_read(lambda signals: signals.resilience(top_n))

    def collectors(self, gids: list[int], max_hops: int = 3) -> Payload:
        return self._signal_read(lambda signals: signals.collectors(gids, max_hops=max_hops))

    def dossier(self, gid: int) -> Payload:
        return self._signal_read(lambda signals: signals.dossier(gid))

    def export_rows(self, name: str) -> tuple[tuple[str, ...], list[Payload]]:
        return self._read(lambda: self._analysis.export_rows(name))


def get_evidence_service(analysis: Analysis | EvidenceService) -> EvidenceService:
    """Return the single facade owned by an analysis, without a global cache."""
    if isinstance(analysis, EvidenceService):
        return analysis
    with _services_lock:
        service = getattr(analysis, "_evidence_service", None)
        if service is None:
            service = EvidenceService(analysis)
            analysis._evidence_service = service
        return service

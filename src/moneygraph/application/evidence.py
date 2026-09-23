"""Shared evidence access for HTTP and the bounded copilot."""
from copy import deepcopy
from typing import Any

from ..domain.models import canonical_digest
from .errors import AccountNotFound


class EvidenceService:
    def __init__(self, analysis: Any, signals: Any = None):
        self.analysis = analysis
        if signals is None and hasattr(analysis, "snapshot"):
            from ..signals import SignalAnalysis
            signals = SignalAnalysis(analysis)
        self.signals = signals

    def node(self, gid: int) -> dict:
        node = self.analysis.node(gid)
        if node is None:
            raise AccountNotFound(gid)
        return deepcopy(node)

    def require_selection(self, gid: int, gids: list[int] | None = None) -> dict:
        node = self.node(gid)
        for selected in gids or []:
            self.node(selected)
        return node

    def summary(self) -> dict:
        return deepcopy(self.analysis.summary())

    def nodes(self, **filters) -> dict:
        return deepcopy(self.analysis.nodes(**filters))

    def graph(self, **scope) -> dict:
        return deepcopy(self.analysis.graph(**scope))

    def clusters(self) -> dict:
        return deepcopy(self.analysis.clusters())

    def _signal_service(self):
        if self.signals is None:
            raise ValueError("Signal evidence is unavailable")
        return self.signals

    def patterns(self, gid: int) -> dict:
        self.node(gid)
        return self._signal_service().node(gid)

    def collectors(self, gids: list[int], max_hops: int = 3) -> dict:
        for gid in gids:
            self.node(gid)
        return self._signal_service().collectors(gids, max_hops=max_hops)

    def resilience(self, top_n: int = 5) -> dict:
        return self._signal_service().resilience(top_n)

    def dossier(self, gid: int) -> dict:
        self.node(gid)
        return self._signal_service().dossier(gid)

    def envelope(self, evidence_id: str, data: Any, *, coverage: dict | None = None) -> dict:
        payload = {"analysis_id": getattr(self.analysis, "analysis_id", None),
                   "evidence_id": evidence_id, "data": deepcopy(data)}
        if coverage is not None:
            payload["coverage"] = deepcopy(coverage)
        return {**payload, "evidence_sha256": canonical_digest(payload)}

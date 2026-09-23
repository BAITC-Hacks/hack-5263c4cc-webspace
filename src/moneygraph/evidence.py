"""One lazy signal index per loaded analysis context, shared by HTTP and copilot."""
from threading import Lock

from .engine import Analysis
from .signals import SignalAnalysis


class EvidenceContext:
    def __init__(self, analysis: Analysis):
        self.analysis = analysis
        self._signals: SignalAnalysis | None = None
        self._lock = Lock()

    @property
    def signals(self) -> SignalAnalysis:
        with self._lock:
            if self._signals is None:
                self._signals = SignalAnalysis(self.analysis)
            return self._signals

    def require_analysis(self, analysis: Analysis) -> None:
        if self.analysis is not analysis:
            raise ValueError("Evidence context belongs to a different loaded analysis.")

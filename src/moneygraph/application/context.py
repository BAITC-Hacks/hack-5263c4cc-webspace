"""Services owned by one loaded dataset and one application lifespan."""
from dataclasses import dataclass
from typing import TYPE_CHECKING

from ..copilot.service import CopilotService
from ..engine import Analysis
from ..signals import SignalAnalysis
from .evidence import EvidenceService
from ..agent.memory import ConversationMemory

if TYPE_CHECKING:
    from .exports import ExportService


@dataclass(frozen=True)
class ApplicationContext:
    analysis: Analysis
    signals: SignalAnalysis
    evidence: EvidenceService
    copilot: CopilotService
    exports: "ExportService"
    receipt: dict
    memory: ConversationMemory

    @property
    def analysis_id(self) -> str:
        return self.receipt["analysis_id"]

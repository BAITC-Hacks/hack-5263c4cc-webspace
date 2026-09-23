"""Composition root: the only runtime place selecting data and services."""
from dotenv import load_dotenv

from .application.context import ApplicationContext
from .application.evidence import EvidenceService
from .copilot.service import CopilotService
from .engine import Analysis, load_analysis
from .settings import Settings
from .signals import SignalAnalysis


def build_context(analysis: Analysis | None = None, settings: Settings | None = None) -> ApplicationContext:
    from .application.exports import ExportService
    from .audit import provenance
    from .agent.memory import ConversationMemory

    if settings is None:
        load_dotenv(override=False)
        settings = Settings.from_env()
    analysis = analysis if analysis is not None else load_analysis(settings.data_dir)
    signals = SignalAnalysis(analysis)
    evidence = EvidenceService(analysis, signals)
    return ApplicationContext(analysis, signals, evidence, CopilotService(evidence, settings),
                              ExportService(analysis), provenance(analysis), ConversationMemory(settings.memory_path))

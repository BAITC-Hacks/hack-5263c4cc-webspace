"""Compatibility entry points; HTTP uses its app-owned CopilotService."""
from .schemas import CopilotRequest
from .tools import evidence_tool
from .policy import TOOLS
from openai import OpenAI


def __getattr__(name):
    if name == "router":
        from ..api.investigation_routes import legacy_router
        return legacy_router
    raise AttributeError(name)


def investigate(engine, request: CopilotRequest, client=None):
    from ..application.evidence import EvidenceService
    from ..settings import Settings
    from ..signals import SignalAnalysis
    from .service import CopilotService

    signals = SignalAnalysis(engine) if hasattr(engine, "snapshot") or hasattr(engine, "G") else None
    return CopilotService(EvidenceService(engine, signals), Settings.from_env()).investigate(request, client)


__all__ = ["CopilotRequest", "TOOLS", "evidence_tool", "investigate"]

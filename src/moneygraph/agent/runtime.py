"""Compatibility adapter; normal HTTP requests use the lifespan-owned service."""
import time
from dataclasses import replace
from ..application.evidence import EvidenceService
from ..settings import Settings
from ..copilot.service import CopilotService
from ..copilot.validation import offline_answer

def run_investigation(engine, request, client=None, *, enabled=False, client_factory=None, clock=time.monotonic):
    settings = replace(Settings.from_env(), ai_enabled=enabled, allow_external_ai=enabled)
    if client is None and enabled and client_factory is not None:
        client = client_factory(timeout=20.0, max_retries=0, base_url="https://api.openai.com/v1")
        try:
            return CopilotService(EvidenceService(engine), settings, clock=clock).investigate(request, client)
        finally:
            try:
                client.close()
            except Exception:
                pass
    return CopilotService(EvidenceService(engine), settings, clock=clock).investigate(request, client)

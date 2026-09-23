"""HTTP contracts for app-owned investigation and optional conversation context."""
from contextlib import contextmanager
import sqlite3
from fastapi import APIRouter, HTTPException, Path, Request, Response
from ..agent.memory import MemoryUnavailable
from ..application.conversations import create_session, investigate
from ..copilot.schemas import CopilotRequest, SessionCreateRequest
from ..copilot.policy import MAX_HISTORY_TURNS, MAX_HISTORY_CHARACTERS, TOOLS
from ..settings import Settings
from .dependencies import context, response
from .schemas import CopilotInput, CopilotResponse, CopilotStatus, SessionInput, SessionResponse

router = APIRouter()


@contextmanager
def memory_errors():
    try:
        yield
    except MemoryUnavailable as exc:
        raise HTTPException(exc.status, exc.detail, headers={"Retry-After": "60"} if exc.status == 429 else None) from None
    except (sqlite3.Error, OSError):
        raise HTTPException(503, "Local conversation memory is unavailable.") from None


@router.get("/copilot/status", response_model=CopilotStatus)
def copilot_status(request: Request):
    app_context = getattr(request.app.state, "context", None)
    settings = app_context.copilot.settings if app_context else Settings.from_env()
    enabled = settings.provider_allowed
    result = {"enabled": enabled, "mode": "openai" if enabled else "offline", "provider_status": "not_checked",
              "message": "AI connection is configured. Provider availability is checked when you ask a question." if enabled else
                         "Local evidence summaries are available. The optional AI connection is not enabled.",
              "capabilities": {"conversation_history": True, "history_max_turns": MAX_HISTORY_TURNS,
                               "history_max_characters": MAX_HISTORY_CHARACTERS, "user_message_max_characters": 1200,
                               "assistant_message_max_characters": 5000, "read_only_tools": len(TOOLS),
                               "session_memory": True, "memory_ttl_seconds": 86400, "memory_max_sessions": 128,
                               "attachments": False, "streaming": False}}
    return response(request, result)


@router.post("/copilot", response_model=CopilotResponse)
def copilot(body: CopilotInput, request: Request):
    selection = CopilotRequest.model_validate({**body.model_dump(), "gid": int(body.gid),
        "gids": [int(gid) for gid in body.gids] if body.gids else None})
    with memory_errors():
        return response(request, investigate(context(request), selection))


def legacy_copilot(body: CopilotRequest, request: Request):
    with memory_errors():
        return investigate(context(request), body)


@router.post("/copilot/sessions", response_model=SessionResponse, status_code=201)
def create_conversation(body: SessionInput, request: Request):
    selection = SessionCreateRequest(gid=int(body.gid), gids=[int(gid) for gid in body.gids] if body.gids else None)
    with memory_errors():
        return response(request, create_session(context(request), selection))


def legacy_create_conversation(body: SessionCreateRequest, request: Request):
    with memory_errors():
        return create_session(context(request), body)


@router.delete("/copilot/sessions/{session_id}", status_code=204)
def forget_conversation(request: Request, session_id: str = Path(pattern=r"^[a-f0-9]{32}$")):
    with memory_errors():
        context(request).memory.forget(session_id)
    return Response(status_code=204)


legacy_router = APIRouter(prefix="/api")
legacy_router.add_api_route("/copilot/status", copilot_status, methods=["GET"])

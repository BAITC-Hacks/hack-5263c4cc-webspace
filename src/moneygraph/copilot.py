"""HTTP facade for modular bounded investigation and local conversation memory."""
from __future__ import annotations

import os
import sqlite3
import threading
from typing import Any

from fastapi import APIRouter, HTTPException, Path, Request, Response
from openai import OpenAI

from .agent.contracts import (CopilotRequest, ConversationTurn, SessionCreateRequest, ModelAnswer, SYSTEM, FORMAT,
                              MAX_ROUNDS, MAX_TOOL_CALLS, MAX_HISTORY_TURNS, MAX_HISTORY_CHARACTERS)
from .agent.evidence import TOOLS, evidence_tool
from .agent.runtime import offline_answer, run_investigation
from .agent.memory import ConversationMemory, MemoryUnavailable, scope_key
from .evidence import get_evidence_service
from .http_contracts import CopilotResponse, CopilotStatusResponse, SessionResponse

router = APIRouter(prefix="/api")
_memory_lock = threading.Lock()


def ai_configured() -> bool:
    """Configuration gate only; no provider request or credential disclosure."""
    return (
        os.getenv("MONEYGRAPH_AI_ENABLED", "false").lower() == "true"
        and os.getenv("MONEYGRAPH_ALLOW_EXTERNAL_AI", "false").lower() == "true"
        and bool(os.getenv("OPENAI_API_KEY", "").strip())
    )


@router.get("/copilot/status", response_model=CopilotStatusResponse)
def copilot_status():
    enabled = ai_configured()
    return {
        "enabled": enabled,
        "mode": "openai" if enabled else "offline",
        "provider_status": "not_checked",
        "message": (
            "AI connection is configured. Provider availability is checked when you ask a question."
            if enabled else
            "Local evidence summaries are available. The optional AI connection is not enabled."
        ),
        "capabilities": {
            "conversation_history": True,
            "history_max_turns": MAX_HISTORY_TURNS,
            "history_max_characters": MAX_HISTORY_CHARACTERS,
            "user_message_max_characters": 1200,
            "assistant_message_max_characters": 5000,
            "read_only_tools": len(TOOLS),
            "session_memory": True,
            "memory_ttl_seconds": 86400,
            "memory_max_sessions": 128,
            "attachments": False,
            "streaming": False,
        },
    }


def investigate(engine: Any, request: CopilotRequest, client: Any = None) -> dict:
    return run_investigation(get_evidence_service(engine), request, client, enabled=ai_configured(), client_factory=OpenAI)


def conversation_memory(app) -> ConversationMemory:
    with _memory_lock:
        if getattr(app.state, "conversation_memory", None) is None:
            app.state.conversation_memory = ConversationMemory(os.getenv("MONEYGRAPH_MEMORY_PATH") or None)
        return app.state.conversation_memory


@router.post("/copilot", response_model=CopilotResponse, response_model_exclude_unset=True)
def copilot(request: CopilotRequest, http_request: Request):
    from .api import get_engine
    store = None
    token = None
    revision = 0
    try:
        engine = getattr(http_request.app.state, "analysis", None) or get_engine()
        if engine.node(request.gid) is None or request.gids and any(engine.node(gid) is None for gid in request.gids):
            raise KeyError("Unknown account")
        current = request
        if request.remember:
            store = conversation_memory(http_request.app)
            token, revision, history = store.begin(scope_key(engine, request.gid, request.gids), request.session_id)
            current = request.model_copy(update={"history": [ConversationTurn.model_validate(turn) for turn in history],
                                                  "remember": False, "session_id": None})
        result = investigate(engine, current)
        if store and token:
            memory = store.finish(token, revision, request.question, result["answer"], retain=result["mode"] != "fallback")
            if memory:
                result["memory"] = memory
        return result
    except MemoryUnavailable as exc:
        raise HTTPException(exc.status, exc.detail, headers={"Retry-After": "60"} if exc.status == 429 else None) from None
    except KeyError:
        raise HTTPException(status_code=404, detail="Account not found") from None
    except (sqlite3.Error, OSError):
        raise HTTPException(503, "Local conversation memory is unavailable.") from None
    finally:
        if store and token:
            try:
                store.release(token, revision)
            except sqlite3.Error:
                pass  # Lease expires; never leak storage details from exception cleanup.


@router.post("/copilot/sessions", status_code=201, response_model=SessionResponse)
def create_conversation(request: SessionCreateRequest, http_request: Request):
    """Return an empty session capability before any question or model work."""
    from .api import get_engine
    engine = getattr(http_request.app.state, "analysis", None) or get_engine()
    if engine.node(request.gid) is None or request.gids and any(engine.node(gid) is None for gid in request.gids):
        raise HTTPException(404, "Account not found")
    try:
        store = conversation_memory(http_request.app)
        token, revision, _ = store.begin(scope_key(engine, request.gid, request.gids))
        return store.finish(token, revision, "", "", retain=False)
    except MemoryUnavailable as exc:
        raise HTTPException(exc.status, exc.detail, headers={"Retry-After": "60"} if exc.status == 429 else None) from None
    except (sqlite3.Error, OSError):
        raise HTTPException(503, "Local conversation memory is unavailable.") from None


@router.delete("/copilot/sessions/{session_id}", status_code=204)
def forget_conversation(http_request: Request, session_id: str = Path(pattern=r"^[a-f0-9]{32}$")):
    try:
        conversation_memory(http_request.app).forget(session_id)
    except (sqlite3.Error, OSError):
        raise HTTPException(503, "Local conversation memory is unavailable.") from None
    return Response(status_code=204)

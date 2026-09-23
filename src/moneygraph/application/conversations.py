"""Scope-bound conversation use cases; persisted text is never evidence."""
import sqlite3

from ..agent.memory import scope_key
from ..copilot.schemas import ConversationTurn, CopilotRequest, SessionCreateRequest
from .context import ApplicationContext


def investigate(context: ApplicationContext, request: CopilotRequest) -> dict:
    context.evidence.require_selection(request.gid, request.gids)
    token, revision = None, 0
    store = context.memory
    try:
        current = request
        if request.remember:
            token, revision, history = store.begin(scope_key(context.analysis, request.gid, request.gids), request.session_id)
            current = request.model_copy(update={
                "history": [ConversationTurn.model_validate(turn) for turn in history],
                "remember": False, "session_id": None,
            })
        result = context.copilot.investigate(current)
        if token:
            memory = store.finish(token, revision, request.question, result["answer"], retain=result["mode"] != "fallback")
            if memory:
                result["memory"] = memory
        return result
    finally:
        if token:
            try:
                store.release(token, revision)
            except sqlite3.Error:
                pass


def create_session(context: ApplicationContext, request: SessionCreateRequest) -> dict:
    context.evidence.require_selection(request.gid, request.gids)
    token, revision, _ = context.memory.begin(scope_key(context.analysis, request.gid, request.gids))
    try:
        return context.memory.finish(token, revision, "", "", retain=False)
    finally:
        context.memory.release(token, revision)

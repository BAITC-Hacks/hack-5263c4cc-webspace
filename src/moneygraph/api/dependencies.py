"""App-scoped services and explicit v1 identifier encoding."""
from fastapi import HTTPException, Request

from ..application.context import ApplicationContext


def context(request: Request) -> ApplicationContext:
    return request.app.state.context


def account_id(value: str | None) -> int | None:
    if value is None:
        return None
    if not value.isascii() or not value.isdecimal() or (len(value) > 1 and value[0] == "0") or len(value) > 19:
        raise HTTPException(422, "Invalid account identifier")
    number = int(value)
    if number > 2**63 - 1:
        raise HTTPException(422, "Invalid account identifier")
    return number


_SCALAR_IDS = {"gid", "src", "dst", "root_gid", "source_gid", "route_center_gid"}
_ID_LISTS = {"path", "top_gids", "gids", "removed_gids", "payers", "counterparties"}


def encode_ids(value, key=""):
    """Only declared identifier fields change; numeric metrics remain numbers."""
    if isinstance(value, dict):
        return {name: encode_ids(child, name) for name, child in value.items()}
    if isinstance(value, list):
        return [str(child) if key in _ID_LISTS and isinstance(child, int) else encode_ids(child) for child in value]
    if key in _SCALAR_IDS and value is not None:
        return str(value)
    return value


def response(request: Request, payload: dict) -> dict:
    if request.url.path.startswith("/api/v1/"):
        return {**encode_ids(payload), "analysis_id": context(request).analysis_id}
    return payload

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from ..audit import dossier_markdown
from .dependencies import account_id, context, response
from .schemas import Dossier, Provenance

router = APIRouter()


@router.get("/provenance", response_model=Provenance)
def provenance(request: Request):
    return response(request, context(request).receipt)


@router.get("/dossier/{gid}", response_model=Dossier,
            responses={200: {"content": {"text/markdown": {"schema": {"type": "string"}}}}})
def dossier(gid: str, request: Request, format: Literal["json", "markdown"] = "json"):
    selected = account_id(gid)
    services = context(request)
    services.evidence.node(selected)
    result = services.evidence.dossier(selected)
    if format == "markdown":
        return Response(dossier_markdown(result, services.receipt), media_type="text/markdown; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="account-{selected}-dossier.md"'})
    return response(request, result)


@router.get("/exports/{name}", response_class=Response,
            responses={200: {"content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}}}})
def export(name: str, request: Request):
    try:
        content = context(request).exports.render(name)
    except ValueError:
        raise HTTPException(404, "Unknown export") from None
    return Response(content, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})

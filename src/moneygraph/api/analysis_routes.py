from fastapi import APIRouter, HTTPException, Query, Request

from ..engine import ROLES
from . import schemas as dto
from .dependencies import account_id, context, response

router = APIRouter()


@router.get("/health", response_model=dto.Health)
def health(request: Request):
    return response(request, {"status": "ok", "dataset_kind": context(request).analysis.dataset_kind})


@router.get("/summary", response_model=dto.Summary)
def summary(request: Request):
    return response(request, context(request).evidence.summary())


@router.get("/nodes", response_model=dto.NodeList)
def nodes(request: Request, query: str = Query("", max_length=100), search: str = Query("", max_length=100),
          role: str | None = None, cluster_id: int | None = None, limit: int = Query(50, ge=1, le=500),
          offset: int = Query(0, ge=0, le=1_000_000)):
    if role and role not in ROLES:
        raise HTTPException(400, "Unknown role")
    result = context(request).evidence.nodes(query=query or search, role=role, cluster_id=cluster_id,
                                             limit=limit, offset=offset)
    return response(request, result)


@router.get("/nodes/{gid}", response_model=dto.NodeDetail)
def node(gid: str, request: Request):
    return response(request, context(request).evidence.node(account_id(gid)))


@router.get("/graph", response_model=dto.GraphData)
def graph(request: Request, gid: str | None = None, hops: int = Query(1, ge=1, le=3),
          limit: int = Query(120, ge=1, le=400)):
    selected = account_id(gid)
    services = context(request)
    if selected is not None:
        services.evidence.node(selected)
    return response(request, services.evidence.graph(gid=selected, hops=hops, limit=limit))


@router.get("/clusters", response_model=dto.ClusterList)
def clusters(request: Request):
    return response(request, context(request).evidence.clusters())


@router.get("/signals/{gid}", response_model=dto.SignalReport)
def node_signals(gid: str, request: Request):
    selected = account_id(gid)
    services = context(request)
    services.evidence.node(selected)
    return response(request, services.evidence.patterns(selected))


@router.get("/resilience", response_model=dto.ResilienceReport)
def resilience(request: Request, top_n: int = Query(5, ge=1, le=20)):
    return response(request, context(request).evidence.resilience(top_n))


@router.get("/collectors", response_model=dto.CollectorReport)
def collectors(request: Request, gids: str = Query(..., min_length=1, max_length=120),
               max_hops: int = Query(3, ge=1, le=3)):
    selected = [account_id(value.strip()) for value in gids.split(",")]
    if not 1 <= len(selected) <= 5 or len(set(selected)) != len(selected):
        raise HTTPException(422, "Select one to five distinct account IDs")
    services = context(request)
    for gid in selected:
        services.evidence.node(gid)
    return response(request, services.evidence.collectors(selected, max_hops=max_hops))

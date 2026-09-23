"""Read-only HTTP interface for deterministic graph evidence."""

from contextlib import asynccontextmanager
from collections.abc import Callable
import csv
from io import StringIO
import os
from pathlib import Path
import time
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .engine import Analysis, ROLES, load_analysis
from .identifiers import AccountJSONResponse
from .signals import SignalAnalysis
from .security import LocalSecurityMiddleware, RequestLimiter, SecurityConfig

load_dotenv(override=False)
_analysis: Analysis | None = None


def get_engine() -> Analysis:
    global _analysis
    if _analysis is None:
        _analysis = load_analysis(os.getenv("MONEYGRAPH_DATA_DIR"))
    return _analysis


def make_app(analysis: Analysis | None = None, *, security_config: SecurityConfig | None = None,
             clock: Callable[[], float] = time.monotonic) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        if application.state.analysis is None:
            application.state.analysis = get_engine()
        try:
            yield
        finally:
            memory = getattr(application.state, "conversation_memory", None)
            if memory is not None:
                memory.close()
                application.state.conversation_memory = None

    application = FastAPI(title="Money Graph", version="0.1.0", lifespan=lifespan,
                          default_response_class=AccountJSONResponse)
    application.state.analysis = analysis
    security = security_config or SecurityConfig.from_env()
    application.state.request_limiter = RequestLimiter(security, clock)
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]", "testserver"])
    application.add_middleware(LocalSecurityMiddleware, config=security,
                               limiter=application.state.request_limiter)
    application.state.signals = None
    # CORS wraps request rejection too, so the allowed development UI can read a
    # 429 and Retry-After instead of receiving an opaque browser network failure.
    application.add_middleware(CORSMiddleware, allow_origins=list(security.allowed_origins),
                               allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"],
                               expose_headers=["Retry-After"])

    @application.exception_handler(RequestValidationError)
    async def private_validation_error(request: Request, error: RequestValidationError):
        # Pydantic's input/ctx and even locations can contain conversation text,
        # submitted secret values or arbitrary object keys. Never reflect them.
        return JSONResponse({"detail": "Invalid request. Check field values and supported parameters."},
                            status_code=422)

    def engine(request: Request) -> Analysis:
        return request.app.state.analysis or get_engine()

    def signals(request: Request) -> SignalAnalysis:
        if request.app.state.signals is None:
            request.app.state.signals = SignalAnalysis(engine(request))
        return request.app.state.signals

    @application.get("/api/health")
    def health(request: Request):
        return {"status": "ok", "dataset_kind": engine(request).dataset_kind}

    @application.get("/api/summary")
    def summary(request: Request):
        return engine(request).summary()

    @application.get("/api/nodes")
    def nodes(request: Request, query: str = Query("", max_length=100), search: str = Query("", max_length=100),
              role: str | None = None, cluster_id: int | None = None, limit: int = Query(50, ge=1, le=500),
              offset: int = Query(0, ge=0, le=1_000_000)):
        if role and role not in ROLES:
            raise HTTPException(400, "Unknown role")
        return engine(request).nodes(query=query or search, role=role, cluster_id=cluster_id, limit=limit, offset=offset)

    @application.get("/api/nodes/{gid}")
    def node(gid: int, request: Request):
        detail = engine(request).node(gid)
        if detail is None:
            raise HTTPException(404, "Node not found in the loaded dataset")
        return detail

    @application.get("/api/graph")
    def graph(request: Request, gid: int | None = None, hops: int = Query(1, ge=1, le=3),
              limit: int = Query(120, ge=1, le=400)):
        model = engine(request)
        if gid is not None and model.node(gid) is None:
            raise HTTPException(404, "Node not found in the loaded dataset")
        return model.graph(gid=gid, hops=hops, limit=limit)

    @application.get("/api/clusters")
    def clusters(request: Request):
        return engine(request).clusters()

    @application.get("/api/signals/{gid}")
    def node_signals(gid: int, request: Request):
        try:
            return signals(request).node(gid)
        except KeyError:
            raise HTTPException(404, "Node not found in the loaded dataset") from None

    @application.get("/api/resilience")
    def resilience(request: Request, top_n: int = Query(5, ge=1, le=20)):
        return signals(request).resilience(top_n)

    @application.get("/api/collectors")
    def collectors(request: Request, gids: str = Query(..., min_length=1, max_length=120),
                   max_hops: int = Query(3, ge=1, le=3)):
        try:
            selected = [int(value.strip()) for value in gids.split(",")]
            return signals(request).collectors(selected, max_hops=max_hops)
        except (ValueError, TypeError):
            raise HTTPException(422, "Select one to five distinct integer account IDs") from None
        except KeyError:
            raise HTTPException(404, "A selected account is not in the loaded dataset") from None

    @application.get("/api/provenance")
    def analysis_provenance(request: Request):
        from .audit import provenance
        return provenance(engine(request))

    @application.get("/api/dossier/{gid}")
    def dossier(gid: int, request: Request, format: Literal["json", "markdown"] = "json"):
        try:
            result = signals(request).dossier(gid)
        except KeyError:
            raise HTTPException(404, "Node not found in the loaded dataset") from None
        if format == "markdown":
            from .audit import dossier_markdown, provenance
            return Response(dossier_markdown(result, provenance(engine(request))),
                            media_type="text/markdown; charset=utf-8",
                            headers={"Content-Disposition": f'attachment; filename="account-{gid}-dossier.md"',
                                     "Cache-Control": "no-store"})
        return result

    @application.get("/api/exports/{name}")
    def export(name: str, request: Request):
        try:
            columns, rows = engine(request).export_rows(name)
        except ValueError as error:
            raise HTTPException(404, "Unknown export") from error
        text = StringIO(newline="")
        writer = csv.DictWriter(text, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
        return Response(text.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"})

    from .copilot import router as copilot_router
    application.include_router(copilot_router)

    dist = Path(__file__).resolve().parents[2] / "web" / "dist"
    if (dist / "assets").is_dir():
        application.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @application.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "API route not found")
        file = (dist / path).resolve()
        if path and file.is_relative_to(dist.resolve()) and file.is_file():
            return FileResponse(file)
        if (dist / "index.html").is_file():
            return FileResponse(dist / "index.html")
        return {"service": "Money Graph", "message": "API is ready. Build web/dist or start the Vite frontend.", "docs": "/docs"}

    return application


create_app = make_app
app = make_app()

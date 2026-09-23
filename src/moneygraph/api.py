"""Read-only HTTP interface for deterministic graph evidence."""

from contextlib import asynccontextmanager
import csv
from io import StringIO
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .engine import Analysis, ROLES, load_analysis

load_dotenv(override=False)
_analysis: Analysis | None = None


def get_engine() -> Analysis:
    global _analysis
    if _analysis is None:
        _analysis = load_analysis(os.getenv("MONEYGRAPH_DATA_DIR"))
    return _analysis


def make_app(analysis: Analysis | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        if application.state.analysis is None:
            application.state.analysis = get_engine()
        yield

    application = FastAPI(title="Money Graph", version="0.1.0", lifespan=lifespan)
    application.state.analysis = analysis
    application.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                               allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    def engine(request: Request) -> Analysis:
        return request.app.state.analysis or get_engine()

    @application.get("/api/health")
    def health(request: Request):
        return {"status": "ok", "dataset_kind": engine(request).dataset_kind}

    @application.get("/api/summary")
    def summary(request: Request):
        return engine(request).summary()

    @application.get("/api/nodes")
    def nodes(request: Request, query: str = Query("", max_length=100), search: str = Query("", max_length=100),
              role: str | None = None, cluster_id: int | None = None, limit: int = Query(50, ge=1, le=500)):
        if role and role not in ROLES:
            raise HTTPException(400, "Unknown role")
        return engine(request).nodes(query=query or search, role=role, cluster_id=cluster_id, limit=limit)

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

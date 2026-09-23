"""FastAPI composition. Creating an app or OpenAPI schema performs no dataset I/O."""
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4
from collections.abc import Callable
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from ..bootstrap import build_context
from ..application.errors import AccountNotFound
from ..engine import Analysis
from ..settings import Settings
from ..security import LocalSecurityMiddleware, RequestLimiter, SecurityConfig
from .analysis_routes import router as analysis_router
from .export_routes import router as export_router
from .investigation_routes import legacy_copilot, legacy_create_conversation, router as investigation_router
from .schemas import ErrorResponse


def make_app(analysis: Analysis | None = None, settings: Settings | None = None, *,
             security_config: SecurityConfig | None = None, clock: Callable[[], float] = time.monotonic) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.context = build_context(analysis, settings)
        application.state.conversation_memory = application.state.context.memory
        try:
            yield
        finally:
            application.state.context.memory.close()
            application.state.conversation_memory = None
            application.state.context = None

    application = FastAPI(title="Money Graph", version="1.0.0", lifespan=lifespan)
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]", "testserver"])
    security = security_config or SecurityConfig.from_env()
    application.state.request_limiter = RequestLimiter(security, clock)
    application.add_middleware(LocalSecurityMiddleware, config=security, limiter=application.state.request_limiter)
    application.add_middleware(CORSMiddleware, allow_origins=list(security.allowed_origins),
                               allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"],
                               expose_headers=["Retry-After", "X-Request-ID"])

    @application.middleware("http")
    async def browser_headers(request: Request, call_next):
        request.state.request_id = uuid4().hex
        result = await call_next(request)
        result.headers.update({"X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
                               "X-Frame-Options": "DENY", "X-Request-ID": request.state.request_id})
        if request.url.path.startswith("/api/"):
            result.headers["Cache-Control"] = "no-store"
        return result

    def failure(request: Request, status: int, message: str, headers=None):
        if not request.url.path.startswith("/api/v1/"):
            return JSONResponse({"detail": message}, status_code=status, headers=headers)
        code = {400: "invalid_request", 404: "not_found", 422: "invalid_request"}.get(status, "request_failed")
        return JSONResponse({"error": {"code": code, "message": message,
                                       "request_id": request.state.request_id}}, status_code=status, headers=headers)

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return failure(request, exc.status_code, str(exc.detail), exc.headers)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Validation details can contain submitted text. Return a stable safe message.
        return failure(request, 422, "Invalid request parameters")

    @application.exception_handler(AccountNotFound)
    async def missing_entity(request: Request, exc: AccountNotFound):
        return failure(request, 404, "Account not found in the loaded dataset")

    errors = {code: {"model": ErrorResponse} for code in (400, 403, 404, 408, 409, 413, 415, 422, 429, 503)}
    for router in (analysis_router, export_router, investigation_router):
        application.include_router(router, prefix="/api/v1", responses=errors)
        for route in router.routes:
            if isinstance(route, APIRoute) and route.path not in {"/copilot", "/copilot/sessions"}:
                application.add_api_route("/api" + route.path, route.endpoint, methods=route.methods,
                                          response_model=None, status_code=route.status_code, include_in_schema=False)
    application.add_api_route("/api/copilot", legacy_copilot, methods=["POST"], include_in_schema=False)
    application.add_api_route("/api/copilot/sessions", legacy_create_conversation, methods=["POST"], status_code=201, include_in_schema=False)
    dist = Path(__file__).resolve().parents[3] / "web" / "dist"
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
        return {"service": "Money Graph", "message": "API is ready. Build web/dist or start Vite.", "docs": "/docs"}

    return application

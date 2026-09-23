"""Small, bounded HTTP protections for the single-process, loopback application.

These controls are not authentication or a distributed billing quota. The CLI must
disable proxy-header rewriting: client identity is the ASGI transport peer, never
an X-Forwarded-For value. Multiple workers need a shared limiter before exposure.
No prompts, account IDs, session tokens or raw validation failures are retained.
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
import math
import os
import threading
import time
from urllib.parse import urlsplit

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

DEV_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
APP_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data:; "
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
)
# FastAPI's optional API-reference pages use a CDN and an inline initialization
# script. This exception never applies to the investigation UI or API responses.
DOCS_CSP = (
    "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; "
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
)


@dataclass(frozen=True)
class SecurityConfig:
    # 96 KiB also admits JSON-escaped Unicode within the bounded history contract.
    max_body_bytes: int = 96 * 1024
    body_timeout_seconds: float = 10.0
    api_per_minute: int = 240
    api_global_per_minute: int = 1200
    copilot_per_minute: int = 12
    copilot_global_per_minute: int = 30
    max_clients: int = 1024
    allowed_origins: tuple[str, ...] = DEV_ORIGINS

    def __post_init__(self):
        for name in ("max_body_bytes", "api_per_minute", "api_global_per_minute",
                     "copilot_per_minute", "copilot_global_per_minute", "max_clients"):
            value = getattr(self, name)
            if type(value) is not int or not 1 <= value <= 1_048_576:
                raise ValueError(f"{name} must be a positive bounded integer")
        if not math.isfinite(self.body_timeout_seconds) or not 0 < self.body_timeout_seconds <= 60:
            raise ValueError("body_timeout_seconds must be between zero and 60")

    @classmethod
    def from_env(cls) -> SecurityConfig:
        values = {}
        for name in ("max_body_bytes", "api_per_minute", "api_global_per_minute",
                     "copilot_per_minute", "copilot_global_per_minute"):
            raw = os.getenv(f"MONEYGRAPH_{name.upper()}")
            if raw is not None:
                try:
                    values[name] = int(raw)
                except ValueError:
                    # Even configuration exceptions must not echo supplied values.
                    raise ValueError(f"MONEYGRAPH_{name.upper()} must be an integer") from None
        return cls(**values)


@dataclass
class _Bucket:
    capacity: int
    updated: float
    tokens: float = field(init=False)

    def __post_init__(self):
        self.tokens = float(self.capacity)

    def refill(self, now: float) -> None:
        self.tokens = min(self.capacity, self.tokens + max(0, now - self.updated) * self.capacity / 60)
        self.updated = now

    def retry_after(self) -> int:
        return max(1, math.ceil((1 - self.tokens) * 60 / self.capacity))


@dataclass
class _ClientBudget:
    api: _Bucket
    copilot: _Bucket
    last_seen: float


class RequestLimiter:
    """Atomic token buckets: stated per-minute budget is also the initial burst.

    Stale client entries are removable after 60 seconds, when both buckets have
    fully refilled. A full live table rejects new peers instead of evicting spent
    budgets. This bounds memory without making identity churn a budget bypass.
    """

    def __init__(self, config: SecurityConfig, clock: Callable[[], float] = time.monotonic):
        self.config = config
        self.clock = clock
        now = clock()
        self._api = _Bucket(config.api_global_per_minute, now)
        self._copilot = _Bucket(config.copilot_global_per_minute, now)
        self._clients: dict[str, _ClientBudget] = {}
        self._lock = threading.Lock()

    @property
    def tracked_clients(self) -> int:
        with self._lock:
            return len(self._clients)

    def check(self, peer: str, *, copilot: bool = False) -> int | None:
        """Consume one request atomically, or return whole seconds to retry."""
        with self._lock:
            now = max(self.clock(), self._api.updated)
            budget = self._clients.get(peer)
            if budget is None:
                if len(self._clients) >= self.config.max_clients:
                    self._clients = {key: value for key, value in self._clients.items()
                                     if now - value.last_seen < 60}
                if len(self._clients) >= self.config.max_clients:
                    oldest = min(value.last_seen for value in self._clients.values())
                    return max(1, math.ceil(60 - (now - oldest)))
                budget = _ClientBudget(_Bucket(self.config.api_per_minute, now),
                                       _Bucket(self.config.copilot_per_minute, now), now)
                self._clients[peer] = budget
            budget.last_seen = now
            buckets = [self._api, budget.api]
            if copilot:
                buckets += [self._copilot, budget.copilot]
            for bucket in buckets:
                bucket.refill(now)
            denied = [bucket.retry_after() for bucket in buckets if bucket.tokens < 1]
            if denied:
                return max(denied)
            for bucket in buckets:
                bucket.tokens -= 1
            return None


def _origin(value: str) -> tuple[str, str, int] | None:
    """Compare complete origins, with no suffix matches or forwarded host trust."""
    try:
        if any(ord(character) <= 32 for character in value):
            return None
        parsed = urlsplit(value)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.path or parsed.query or parsed.fragment):
            return None
        port = parsed.port if parsed.port is not None else (443 if parsed.scheme == "https" else 80)
        return parsed.scheme, parsed.hostname, port
    except ValueError:
        return None


def trusted_browser_request(scope: Scope, headers: Headers, allowed_origins: tuple[str, ...]) -> bool:
    target = _origin(f"{scope.get('scheme', 'http')}://{headers.get('host', '')}")
    allowed = {_origin(value) for value in allowed_origins}
    allowed.discard(None)
    if target is not None:
        allowed.add(target)
    origins = headers.getlist("origin")
    if origins:
        return len(origins) == 1 and _origin(origins[0]) in allowed
    # Browsers normally send Origin for these requests. Reject cross-site and
    # same-site (which can mean a different localhost port) when it is absent.
    if headers.get("sec-fetch-site") in {"cross-site", "same-site"}:
        return False
    referers = headers.getlist("referer")
    if referers:
        if len(referers) != 1:
            return False
        try:
            referer = urlsplit(referers[0])
            return _origin(f"{referer.scheme}://{referer.netloc}") in allowed
        except ValueError:
            return False
    # No-Origin native clients remain supported. This is browser protection,
    # not identity: access control is still required before any shared deployment.
    return True


class LocalSecurityMiddleware:
    """Check origin, rate and actual bytes before any JSON or model validation.

    Bounded pre-buffering intentionally avoids raising inside downstream receive:
    framework parsers can catch such exceptions and turn 413 into another status.
    The receive deadline also bounds stalled or endlessly empty chunk streams.
    """

    def __init__(self, app: ASGIApp, config: SecurityConfig, limiter: RequestLimiter):
        self.app, self.config, self.limiter = app, config, limiter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path, method = scope["path"], scope["method"]
        is_api = path == "/api" or path.startswith("/api/")

        async def secured_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
                headers["X-Frame-Options"] = "DENY"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
                headers["Content-Security-Policy"] = DOCS_CSP if path in {"/docs", "/redoc", "/docs/oauth2-redirect"} else APP_CSP
                if is_api:
                    headers["Cache-Control"] = "no-store"
                    headers.add_vary_header("Origin, Sec-Fetch-Site")
            await send(message)

        async def reject(status: int, detail: str, extra_headers: dict[str, str] | None = None) -> None:
            await JSONResponse({"detail": detail}, status_code=status, headers=extra_headers)(scope, receive, secured_send)

        if not is_api:
            await self.app(scope, receive, secured_send)
            return

        headers = Headers(scope=scope)
        if method not in SAFE_METHODS and not trusted_browser_request(scope, headers, self.config.allowed_origins):
            await reject(403, "Request origin is not allowed.")
            return
        if method in {"POST", "PUT", "PATCH"}:
            content_types = headers.getlist("content-type")
            if len(content_types) != 1 or content_types[0].split(";", 1)[0].strip().lower() != "application/json":
                await reject(415, "Use application/json for API requests.")
                return
        if headers.get("content-encoding", "identity").lower() != "identity":
            await reject(415, "Compressed request bodies are not supported.")
            return
        lengths = headers.getlist("content-length")
        if lengths:
            if (len(lengths) != 1 or len(lengths[0]) > 10 or not lengths[0].isascii()
                    or not lengths[0].isdigit() or headers.get("transfer-encoding")):
                await reject(400, "Invalid request body framing.")
                return
            if int(lengths[0]) > self.config.max_body_bytes:
                await reject(413, "Request body is too large.")
                return
        if method != "OPTIONS":
            # Deliberately ignore Forwarded and X-Forwarded-* headers.
            client = scope.get("client")
            peer = str(client[0]) if client else "unknown"
            retry_after = self.limiter.check(peer, copilot=method == "POST" and path.rstrip("/") == "/api/copilot")
            if retry_after is not None:
                await reject(429, "Request limit reached. Retry after the indicated delay.",
                             {"Retry-After": str(retry_after)})
                return

        body = bytearray()
        too_large = False
        try:
            async with asyncio.timeout(self.config.body_timeout_seconds):
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    chunk = message.get("body", b"")
                    if len(body) + len(chunk) > self.config.max_body_bytes:
                        too_large = True
                        break
                    body.extend(chunk)
                    if not message.get("more_body", False):
                        break
        except TimeoutError:
            await reject(408, "Request body timed out.")
            return
        if too_large:
            await reject(413, "Request body is too large.")
            return
        if lengths and len(body) != int(lengths[0]):
            await reject(400, "Invalid request body framing.")
            return

        buffered = bytes(body)
        body.clear()
        delivered = False

        async def replay() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": buffered, "more_body": False}
            return await receive()

        await self.app(scope, replay, secured_send)

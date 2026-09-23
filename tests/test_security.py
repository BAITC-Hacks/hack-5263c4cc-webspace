import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
import pytest

from moneygraph.api import make_app
from moneygraph.engine import load_analysis
from moneygraph.security import LocalSecurityMiddleware, RequestLimiter, SecurityConfig


class Clock:
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        return self.now


@pytest.fixture(scope="module")
def analysis():
    return load_analysis()


def test_token_refill_and_atomic_global_budget():
    clock = Clock()
    config = SecurityConfig(copilot_per_minute=2, copilot_global_per_minute=3)
    limiter = RequestLimiter(config, clock)
    assert limiter.check("one", copilot=True) is None
    assert limiter.check("one", copilot=True) is None
    assert limiter.check("one", copilot=True) == 30
    assert limiter.check("two", copilot=True) is None
    assert limiter.check("three", copilot=True) == 20
    clock.now += 30
    assert limiter.check("one", copilot=True) is None
    assert limiter.check("one", copilot=True) == 30

    limiter = RequestLimiter(SecurityConfig(copilot_global_per_minute=3), clock)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda i: limiter.check(str(i), copilot=True), range(40)))
    assert results.count(None) == 3


def test_client_memory_is_bounded_without_eviction_bypass():
    clock = Clock()
    limiter = RequestLimiter(SecurityConfig(max_clients=2, api_per_minute=1), clock)
    assert limiter.check("one") is None
    assert limiter.check("two") is None
    assert limiter.check("three") == 60
    assert limiter.check("one") == 60
    assert limiter.tracked_clients == 2
    clock.now += 60
    assert limiter.check("three") is None
    assert limiter.tracked_clients == 1


def test_rate_limit_ignores_forwarded_client_identity_and_exposes_retry(analysis, monkeypatch):
    monkeypatch.setenv("MONEYGRAPH_AI_ENABLED", "false")
    clock = Clock()
    config = SecurityConfig(copilot_per_minute=1)
    app = make_app(analysis, security_config=config, clock=clock)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    with TestClient(app) as client:
        headers = {"Origin": "http://localhost:5173", "X-Forwarded-For": "198.51.100.1"}
        assert client.post("/api/copilot", json={"gid": gid, "question": "Evidence?"}, headers=headers).status_code == 200
        headers.update({"X-Forwarded-For": "198.51.100.2", "Forwarded": "for=203.0.113.2"})
        denied = client.post("/api/copilot", json={"gid": gid, "question": "Evidence?"}, headers=headers)
        assert denied.status_code == 429
        assert denied.headers["retry-after"] == "60"
        assert denied.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert "Retry-After" in denied.headers["access-control-expose-headers"]
        assert denied.headers["cache-control"] == "no-store"
        assert client.get("/api/health").status_code == 200
        clock.now += 60
        assert client.post("/api/copilot", json={"gid": gid, "question": "Evidence?"}).status_code == 200


@pytest.mark.parametrize("headers", [
    {"Origin": "https://untrusted.example"},
    {"Origin": "null"},
    {"Origin": "http://localhost:5173.attacker.example"},
    {"Origin": "http://localhost:5173/path"},
    {"Origin": "http://localhost:5173@attacker.example"},
    {"Origin": "http://localhost:5174"},
    {"Origin": "https://testserver"},
    {"Origin": "http://testserver:0"},
    {"Origin": "http://evil.example", "X-Forwarded-Host": "evil.example"},
    {"Sec-Fetch-Site": "cross-site"},
    {"Sec-Fetch-Site": "same-site"},
    {"Referer": "http://evil.example/form"},
])
def test_foreign_browser_mutations_rejected_before_endpoint(analysis, headers):
    with TestClient(make_app(analysis)) as client:
        for method in ("POST", "DELETE"):
            response = client.request(method, "/api/copilot", json={}, headers=headers)
            assert response.status_code == 403
            assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("headers", [
    {},
    {"Origin": "http://testserver"},
    {"Origin": "http://testserver:80"},
    {"Origin": "http://localhost:5173"},
    {"Origin": "http://127.0.0.1:5173", "Sec-Fetch-Site": "cross-site"},
    {"Referer": "http://testserver/docs", "Sec-Fetch-Site": "same-origin"},
])
def test_native_same_origin_and_explicit_development_origins_are_supported(analysis, headers):
    with TestClient(make_app(analysis)) as client:
        # An invalid model reaches schema validation, proving origin acceptance.
        assert client.post("/api/copilot", json={}, headers=headers).status_code == 422


def test_duplicate_origin_simple_content_type_and_compression_are_rejected(analysis):
    with TestClient(make_app(analysis)) as client:
        response = client.post("/api/copilot", json={},
                               headers=[("Origin", "http://testserver"), ("Origin", "http://evil.example")])
        assert response.status_code == 403
        for content_type in ("text/plain", "application/x-www-form-urlencoded", "multipart/form-data"):
            assert client.post("/api/copilot", content=b"{}", headers={"Content-Type": content_type}).status_code == 415
        assert client.post("/api/copilot", json={}, headers={"Content-Encoding": "gzip"}).status_code == 415
        preflight = client.options("/api/copilot/sessions/example", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "DELETE"})
        assert preflight.status_code == 200


def test_validation_errors_do_not_reflect_questions_history_or_arbitrary_keys(analysis):
    private = "private-account-note-and-secret"
    with TestClient(make_app(analysis)) as client:
        for body in (
            {"gid": private, "question": private, "history": [{"role": "system", "content": private}]},
            {"gid": 1, "question": "x" * 1201, private: private},
            {"gid": 1, "question": "Question", "history": [{"role": "user", "content": private * 100}]},
        ):
            response = client.post("/api/copilot", json=body)
            assert response.status_code == 422
            assert private not in response.text
            assert "input" not in response.json()
        malformed = client.post("/api/copilot", content='{"question":"' + private,
                                headers={"Content-Type": "application/json"})
        assert malformed.status_code == 422
        assert private not in malformed.text
        assert private not in client.get("/api/graph", params={"hops": private}).text


def test_body_limit_precedes_json_parsing(analysis):
    with TestClient(make_app(analysis, security_config=SecurityConfig(max_body_bytes=64))) as client:
        response = client.post("/api/copilot", content=b"not json" * 20,
                               headers={"Content-Type": "application/json"})
        assert response.status_code == 413
        assert response.headers["x-content-type-options"] == "nosniff"


def run_boundary(messages, *, headers=(), config=None, slow=False):
    config = config or SecurityConfig(max_body_bytes=8)
    received = 0
    seen = []
    response = []

    async def receive():
        nonlocal received
        if slow:
            await asyncio.sleep(0.05)
        received += 1
        if received <= len(messages):
            return messages[received - 1]
        return {"type": "http.disconnect"}

    async def endpoint(scope, receive, send):
        seen.append(await receive())
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    async def send(message):
        response.append(message)

    scope = {"type": "http", "method": "POST", "path": "/api/copilot", "scheme": "http",
             "headers": [(b"host", b"localhost"), (b"content-type", b"application/json"), *headers],
             "client": ("127.0.0.1", 45678)}
    asyncio.run(LocalSecurityMiddleware(endpoint, config, RequestLimiter(config))(scope, receive, send))
    return received, seen, response


def test_chunked_and_understated_bodies_stop_before_parser():
    messages = [{"type": "http.request", "body": b"12345", "more_body": True},
                {"type": "http.request", "body": b"67890", "more_body": True},
                {"type": "http.request", "body": b"unread", "more_body": False}]
    for headers in ([], [(b"transfer-encoding", b"chunked")], [(b"content-length", b"1")]):
        received, seen, response = run_boundary(messages, headers=headers)
        assert received == 2
        assert not seen
        assert response[0]["status"] == 413


def test_at_limit_body_is_replayed_once_and_declared_oversize_never_read():
    messages = [{"type": "http.request", "body": b"1234", "more_body": True},
                {"type": "http.request", "body": b"5678", "more_body": False}]
    received, seen, response = run_boundary(messages)
    assert received == 2
    assert seen == [{"type": "http.request", "body": b"12345678", "more_body": False}]
    assert response[0]["status"] == 204
    received, seen, response = run_boundary(messages, headers=[(b"content-length", b"9")])
    assert received == 0 and not seen
    assert response[0]["status"] == 413


@pytest.mark.parametrize("headers", [
    [(b"content-length", b"-1")],
    [(b"content-length", b"not-a-number")],
    [(b"content-length", b"1"), (b"content-length", b"1")],
    [(b"content-length", b"1"), (b"transfer-encoding", b"chunked")],
])
def test_ambiguous_body_framing_is_rejected(headers):
    received, seen, response = run_boundary([], headers=headers)
    assert received == 0 and not seen
    assert response[0]["status"] == 400


def test_incomplete_length_slow_body_and_disconnection_never_reach_parser():
    _, seen, response = run_boundary([{"type": "http.request", "body": b"x", "more_body": False}],
                                    headers=[(b"content-length", b"8")])
    assert not seen and response[0]["status"] == 400
    _, seen, response = run_boundary([], config=SecurityConfig(body_timeout_seconds=0.001), slow=True)
    assert not seen and response[0]["status"] == 408
    _, seen, response = run_boundary([{"type": "http.disconnect"}])
    assert not seen and not response


def test_application_csp_and_private_headers_cover_errors(analysis):
    with TestClient(make_app(analysis)) as client:
        for path in ("/", "/api/health", "/api/missing"):
            response = client.get(path)
            csp = response.headers["content-security-policy"]
            assert "script-src 'self';" in csp
            assert "frame-ancestors 'none'" in csp
            assert "https:" not in csp
            assert "'unsafe-eval'" not in csp
            assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
        assert "https://cdn.jsdelivr.net" in client.get("/docs").headers["content-security-policy"]


def test_environment_limits_are_bounded_and_errors_do_not_echo_configuration(monkeypatch):
    monkeypatch.setenv("MONEYGRAPH_COPILOT_PER_MINUTE", "2")
    assert SecurityConfig.from_env().copilot_per_minute == 2
    for invalid in ("0", "-1", "999999999999", "secret-supplied-value"):
        monkeypatch.setenv("MONEYGRAPH_COPILOT_PER_MINUTE", invalid)
        with pytest.raises(ValueError) as error:
            SecurityConfig.from_env()
        assert invalid not in str(error.value)

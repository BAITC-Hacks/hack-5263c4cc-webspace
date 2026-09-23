"""Application isolation and bounded provider contracts."""
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from moneygraph.api import make_app
from moneygraph.engine import Analysis, synthetic_frames


def test_apps_own_independent_contexts_and_shared_evidence_services():
    frames = synthetic_frames()
    first = make_app(Analysis(*frames, dataset_name="First"))
    nodes, edges, tx = frames
    changed_edges = edges.with_columns((edges["sum_kzt"] * 2).alias("sum_kzt"))
    changed_tx = tx.with_columns((tx["sum_kzt"] * 2).alias("sum_kzt"))
    second = make_app(Analysis(nodes, changed_edges, changed_tx, dataset_name="Second"))
    with TestClient(first) as one, TestClient(second) as two:
        for client, name in ((one, "First"), (two, "Second"), (one, "First")):
            assert client.get("/api/summary").json()["dataset"]["name"] == name
        assert first.state.context is not second.state.context
        assert one.get("/api/v1/provenance").json()["analysis_id"] != two.get("/api/v1/provenance").json()["analysis_id"]
        assert two.get("/api/summary").json()["total_kzt"] == 2 * one.get("/api/summary").json()["total_kzt"]
        context = first.state.context
        assert context.evidence.signals is context.signals
        assert context.copilot.evidence is context.evidence


def test_provider_deadline_rejects_late_answer_and_releases_capacity():
    from moneygraph.application.evidence import EvidenceService
    from moneygraph.copilot import CopilotRequest
    from moneygraph.copilot.service import CopilotService
    from moneygraph.settings import Settings
    from test_copilot import Engine, FakeClient, answer_response, tool_response

    now = [0.0]

    class SlowClient(FakeClient):
        def create(self, **kwargs):
            result = super().create(**kwargs)
            now[0] += 61
            return result

    service = CopilotService(EvidenceService(Engine()), Settings(), clock=lambda: now[0])
    result = service.investigate(CopilotRequest(gid=7, question="Explain"), SlowClient([tool_response()]))
    assert result["mode"] == "fallback"
    assert result["trace"] == []
    client = FakeClient([tool_response(), answer_response()])
    assert service.investigate(CopilotRequest(gid=7, question="Again"), client)["mode"] == "openai"
    assert all(0 < call["timeout"] <= 20 for call in client.requests)


def test_structured_numeric_claim_must_match_retrieved_evidence():
    from moneygraph.copilot import CopilotRequest, investigate
    from test_copilot import Engine, FakeClient, tool_response

    def response(value):
        return SimpleNamespace(status="completed", output=[], output_text=json.dumps({
            "answer": "Account depth is 4.", "citations": ["node:7"], "limitations": [],
            "numeric_claims": [{"evidence_id": "node:7", "path": ["depth"], "value": value}],
        }))

    for value, mode in ((4, "openai"), (9, "fallback"), (True, "fallback"), ("4", "fallback")):
        result = investigate(Engine(), CopilotRequest(gid=7, question="Explain"),
                             FakeClient([tool_response(), response(value)]))
        assert result["mode"] == mode


def test_two_concurrent_investigations_and_busy_fallback():
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier, Event
    from moneygraph.application.evidence import EvidenceService
    from moneygraph.copilot import CopilotRequest
    from moneygraph.copilot.service import CopilotService
    from moneygraph.settings import Settings
    from test_copilot import Engine, FakeClient, answer_response, tool_response

    entered = Barrier(3)
    release = Event()

    class BlockingClient(FakeClient):
        def create(self, **kwargs):
            if not self.requests:
                entered.wait(timeout=5)
                assert release.wait(timeout=5)
            return super().create(**kwargs)

    service = CopilotService(EvidenceService(Engine()), Settings())
    request = CopilotRequest(gid=7, question="Explain")
    with ThreadPoolExecutor(max_workers=2) as pool:
        pending = [pool.submit(service.investigate, request,
                               BlockingClient([tool_response(), answer_response()])) for _ in range(2)]
        entered.wait(timeout=5)
        try:
            rejected = FakeClient([])
            result = service.investigate(request, rejected)
            assert result["mode"] == "fallback"
            assert "busy" in " ".join(result["limitations"])
            assert not rejected.requests
        finally:
            release.set()
        assert all(result.result()["mode"] == "openai" for result in pending)
    assert service.investigate(request, FakeClient([tool_response(), answer_response()]))["mode"] == "openai"


def test_provider_cleanup_failure_cannot_replace_safe_response(monkeypatch):
    from moneygraph.application.evidence import EvidenceService
    from moneygraph.copilot import CopilotRequest
    from moneygraph.copilot.service import CopilotService
    from moneygraph.settings import Settings
    from test_copilot import Engine, FakeClient, answer_response, tool_response

    class Provider:
        def __init__(self, settings, client):
            self.client = client

        def create(self, remaining, **kwargs):
            return self.client.create(**kwargs)

        def close(self):
            raise RuntimeError("provider cleanup contains private content")

    monkeypatch.setattr("moneygraph.copilot.service.ResponsesProvider", Provider)
    service = CopilotService(EvidenceService(Engine()), Settings())
    for _ in range(3):
        result = service.investigate(CopilotRequest(gid=7, question="Explain"),
                                     FakeClient([tool_response(), answer_response()]))
        assert result["mode"] == "openai"
        assert "private content" not in str(result)


def test_tool_evidence_is_bound_to_snapshot_and_content():
    from moneygraph.bootstrap import build_context
    from moneygraph.copilot.tools import evidence_tool
    from moneygraph.domain.models import canonical_digest
    from moneygraph.engine import load_analysis
    from moneygraph.settings import Settings

    context = build_context(load_analysis(), Settings())
    first = evidence_tool("inspect_patterns", "{}", context.evidence, 1020)
    assert first["analysis_id"] == context.analysis_id
    assert first["evidence_sha256"] == canonical_digest({
        "analysis_id": context.analysis_id, "evidence_id": first["evidence_id"], "data": first["data"],
    })
    expected = first["evidence_sha256"]
    first["data"]["routes"].clear()
    assert evidence_tool("inspect_patterns", "{}", context.evidence, 1020)["evidence_sha256"] == expected


def test_last_provider_round_cannot_run_another_tool():
    from moneygraph.copilot import CopilotRequest, investigate
    from test_copilot import Engine, FakeClient, tool_response

    responses = [tool_response() for _ in range(3)]
    for index, response in enumerate(responses):
        response.output[0].call_id = str(index)
    result = investigate(Engine(), CopilotRequest(gid=7, question="Keep reading"), FakeClient(responses))
    assert result["mode"] == "fallback"
    assert len(result["trace"]) == 2

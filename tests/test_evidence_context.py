from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient
import pytest

from moneygraph.api import make_app
from moneygraph.copilot import CopilotRequest, evidence_tool, investigate
from moneygraph.engine import load_analysis
from moneygraph.signals import SignalAnalysis


def test_context_constructs_one_lazy_index_even_for_concurrent_readers(monkeypatch):
    from moneygraph import evidence
    built = []

    def create(model):
        built.append(model)
        return SignalAnalysis(model)

    monkeypatch.setattr(evidence, "SignalAnalysis", create)
    context = evidence.EvidenceContext(load_analysis())
    assert built == []
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: context.signals, range(16)))
    assert len(built) == 1
    assert all(result is results[0] for result in results)


def test_api_and_copilot_share_index_without_clipping_cached_evidence(monkeypatch):
    from moneygraph import copilot
    from moneygraph.evidence import EvidenceContext
    model = load_analysis()
    app = make_app(model)
    contexts = []

    def run(engine, request, client=None, *, context=None):
        contexts.append(context)
        return evidence_tool("inspect_patterns", "{}", engine, request.gid, context=context)

    monkeypatch.setattr(copilot, "investigate", run)
    with TestClient(app) as client:
        full = client.get("/api/signals/1020").json()
        context = app.state.evidence
        assert isinstance(context, EvidenceContext)
        before = deepcopy(context.signals.node(1020))
        response = client.post("/api/copilot", json={"gid": 1020, "question": "Explain"})
        assert response.status_code == 200
        assert contexts == [context]
        assert len(response.json()["data"]["routes"]) <= 4
        assert context.signals.node(1020) == before
        assert client.get("/api/signals/1020").json() == full
    with TestClient(make_app(model)) as other:
        other.get("/api/signals/1020")
        assert other.app.state.evidence.signals is not context.signals


def test_context_cannot_substitute_a_different_dataset_or_broaden_tool_scope():
    from moneygraph.evidence import EvidenceContext
    model, other = load_analysis(), load_analysis()
    context = EvidenceContext(model)
    with pytest.raises(ValueError):
        evidence_tool("inspect_patterns", "{}", other, 1020, context=context)
    with pytest.raises(ValueError):
        evidence_tool("inspect_patterns", '{"gid": 1010}', model, 1020, context=context)


def test_standalone_investigation_reuses_indices_between_tool_rounds(monkeypatch):
    from moneygraph import evidence
    built = []

    def create(model):
        built.append(model)
        return SignalAnalysis(model)

    class Client:
        def __init__(self):
            self.responses = self
            self.names = iter(["inspect_patterns", "inspect_missing_evidence", None])

        def create(self, **kwargs):
            name = next(self.names)
            calls = [] if name is None else [SimpleNamespace(type="function_call", name=name, arguments="{}", call_id=name)]
            answer = json.dumps({"answer": "Observed patterns require review.", "citations": ["patterns:1020"], "limitations": []})
            return SimpleNamespace(status="completed", output=calls, output_text=answer)

    monkeypatch.setattr(evidence, "SignalAnalysis", create)
    response = investigate(load_analysis(), CopilotRequest(gid=1020, question="Explain"), Client())
    assert response["mode"] == "openai"
    assert len(response["trace"]) == 2
    assert len(built) == 1

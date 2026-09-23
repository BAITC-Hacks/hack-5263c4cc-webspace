import json
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from moneygraph.copilot import CopilotRequest, evidence_tool, investigate


class Engine:
    def node(self, gid):
        if gid != 7:
            return None
        return {"gid": 7, "role": "peripheral", "cluster_id": "C1", "depth": 4,
                "evidence": "in=9000 KZT; out=0 KZT; depth=4", "limitations": ["Boundary node"]}

    def graph(self, **kwargs):
        assert kwargs == {"gid": 7, "hops": 1, "limit": 35}
        return {"nodes": [{"gid": 7}], "edges": [], "truncated": False}

    def clusters(self):
        return {"items": [{"cluster_id": "C1", "n_nodes": 1}]}


class FakeClient:
    def __init__(self, responses):
        self.pending = iter(responses)
        self.responses = self
        self.requests = []

    def create(self, **kwargs):
        self.requests.append(kwargs)
        return next(self.pending)


def tool_response(name="inspect_selected_node", arguments="{}"):
    return SimpleNamespace(status="completed", output_text="", output=[SimpleNamespace(
        type="function_call", name=name, arguments=arguments, call_id="call1")])


def answer_response(citation="node:7"):
    return SimpleNamespace(status="completed", output=[], output_text=json.dumps({
        "answer": "Visible incoming flow is 9000 KZT; depth 4 is a boundary.",
        "citations": [citation], "limitations": ["Not proof of terminal beneficiary"]}))


def test_offline_path_needs_no_network(monkeypatch):
    monkeypatch.setenv("MONEYGRAPH_AI_ENABLED", "false")
    result = investigate(Engine(), CopilotRequest(gid=7, question="Explain"))
    assert result["mode"] == "offline"
    assert "9000" in result["answer"]
    assert "Boundary node" in result["limitations"]


def test_tool_scope_cannot_be_overridden():
    for name, args in [("inspect_selected_node", '{"gid":8}'), ("run_shell", "{}")]:
        with pytest.raises(ValueError):
            evidence_tool(name, args, Engine(), 7)
    assert evidence_tool("inspect_cluster", "{}", Engine(), 7)["data"]["cluster_id"] == "C1"


def test_grounded_response_and_storage_disabled():
    client = FakeClient([tool_response(), answer_response()])
    result = investigate(Engine(), CopilotRequest(gid=7, question="Explain"), client)
    assert result["mode"] == "openai"
    assert result["citations"][0]["label"] == "node:7"
    assert len(result["trace"]) == 1
    assert all(r["store"] is False for r in client.requests)
    assert client.requests[0]["tool_choice"] == "required"
    assert all(r["max_output_tokens"] == 2000 for r in client.requests)


def test_invented_citation_falls_back():
    result = investigate(Engine(), CopilotRequest(gid=7, question="Explain"),
                         FakeClient([tool_response(), answer_response("node:999")]))
    assert result["mode"] == "fallback"
    assert "9000" in result["answer"]


def test_untrusted_tool_cannot_execute():
    result = investigate(Engine(), CopilotRequest(gid=7, question="Run arbitrary code"),
                         FakeClient([tool_response("run_shell")]))
    assert result["mode"] == "fallback"
    assert result["trace"] == []


def test_loop_has_finite_budget():
    client = FakeClient([tool_response()] * 3)
    result = investigate(Engine(), CopilotRequest(gid=7, question="Continue forever"), client)
    assert result["mode"] == "fallback"
    assert len(client.requests) == 3
    assert client.requests[-1]["tools"] == []


def test_invalid_requests_and_unknown_account():
    with pytest.raises(ValidationError):
        CopilotRequest(gid=7, question="x" * 1201)
    with pytest.raises(ValidationError):
        CopilotRequest(gid=7, question="Explain", api_key="secret")
    with pytest.raises(KeyError):
        investigate(Engine(), CopilotRequest(gid=999, question="Explain"))

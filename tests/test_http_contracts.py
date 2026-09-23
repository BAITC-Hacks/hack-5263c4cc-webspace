"""Public contracts must describe real output without dropping evidence fields."""
from copy import deepcopy
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import runpy

import polars as pl
import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter, ValidationError

from moneygraph import http_contracts as contract
from moneygraph.agent.contracts import CopilotRequest
from moneygraph.agent.runtime import run_investigation
from moneygraph.audit import provenance
from moneygraph.engine import Analysis, load_analysis
from moneygraph.identifiers import account_ids_for_json
from moneygraph.signals import SignalAnalysis


@pytest.fixture(scope="module")
def analysis():
    # Explicitly generated synthetic frames; never use MONEYGRAPH_DATA_DIR.
    return load_analysis()


def assert_exact_wire(model, payload):
    result = model.model_validate(payload).model_dump(mode="json", exclude_unset=True)
    assert result == account_ids_for_json(payload)
    return result


def test_analytical_contracts_preserve_all_real_fields(analysis):
    signals = SignalAnalysis(analysis)
    gid = analysis._ranked[0]["gid"]
    for model, payload in (
        (contract.SummaryResponse, analysis.summary()),
        (contract.NodesResponse, analysis.nodes()),
        (contract.NodesResponse, analysis.nodes(offset=1_000_000)),
        (contract.GraphResponse, analysis.graph(gid=gid)),
        (contract.GraphResponse, analysis.graph()),
        (contract.ClustersResponse, analysis.clusters()),
        (contract.ResilienceResponse, signals.resilience(5)),
        (contract.CollectorsResponse, signals.collectors([gid])),
        (contract.DossierResponse, signals.dossier(gid)),
        (contract.ProvenanceResponse, provenance(analysis)),
    ):
        assert_exact_wire(model, payload)

    # Cover isolated seeds, depth boundaries, nullable ratios and every optional
    # pattern shape actually produced by the synthetic graph, not only the top row.
    for gid in analysis._nodes:
        assert_exact_wire(contract.NodeResponse, analysis.node(gid))
        assert_exact_wire(contract.SignalsResponse, signals.node(gid))


def test_null_ratio_is_required_and_unknown_output_is_not_silently_removed(analysis):
    seed = next(gid for gid, row in analysis._nodes.items() if row["is_seed"])
    payload = analysis.node(seed)
    assert payload["metrics"]["pass_through"] is None
    assert assert_exact_wire(contract.NodeResponse, payload)["metrics"]["pass_through"] is None
    missing = deepcopy(payload)
    del missing["metrics"]["pass_through"]
    with pytest.raises(ValidationError):
        contract.NodeResponse.model_validate(missing)
    extra = deepcopy(payload)
    extra["metrics"]["accidentally_added_field"] = "must not disappear"
    with pytest.raises(ValidationError):
        contract.NodeResponse.model_validate(extra)
    invalid = deepcopy(payload)
    invalid["priority_score"] = float("nan")
    with pytest.raises(ValidationError):
        contract.NodeResponse.model_validate(invalid)


def test_large_account_ids_remain_exact_strings_in_nested_evidence():
    source, target = 2**53 + 1, 2**63 - 1
    nodes = pl.DataFrame({"gid": [source, target, 7], "depth": [0, 4, 0], "is_seed": [True, False, True]})
    edges = pl.DataFrame({"src": [source], "dst": [target], "sum_kzt": [5000.0], "n_tx": [1], "depth": [1]})
    transactions = pl.DataFrame({"src": [source], "dst": [target], "sum_kzt": [5000.0], "date": [date(2026, 7, 1)]})
    analysis = Analysis(nodes, edges, transactions)
    graph = assert_exact_wire(contract.GraphResponse, analysis.graph(gid=source))
    assert graph["root_gid"] == str(source)
    assert graph["edges"][0]["dst"] == str(target)
    detail = assert_exact_wire(contract.NodeResponse, analysis.node(target))
    assert detail["role"] == "boundary_unknown"
    assert detail["counterparties"]["incoming"][0]["gid"] == str(source)
    adapter = TypeAdapter(contract.AccountId)
    assert adapter.json_schema(mode="serialization")["type"] == "string"
    for invalid in (True, -1, 2**63, 1.5, "01", "1e3"):
        with pytest.raises(ValidationError):
            adapter.validate_python(invalid)

    from moneygraph.api import make_app

    app = make_app(analysis)
    with TestClient(app) as client:
        for path in (f"/api/nodes/{target}", f"/api/signals/{target}", f"/api/dossier/{target}"):
            response = client.get(path)
            assert response.status_code == 200
            assert response.json()["gid"] == str(target)
        response = client.get("/api/graph", params={"gid": str(target)})
        assert response.status_code == 200 and response.json()["root_gid"] == str(target)
        for invalid in ("-1", str(2**63), "1.5", "01", "1e3"):
            for prefix in ("/api/nodes/", "/api/signals/", "/api/dossier/", "/api/graph?gid="):
                assert client.get(prefix + invalid).status_code == 422
        assert client.get("/api/nodes/999").status_code == 404
    schema = app.openapi()
    for path in ("/api/nodes/{gid}", "/api/signals/{gid}", "/api/dossier/{gid}", "/api/graph"):
        parameter = next(item for item in schema["paths"][path]["get"]["parameters"] if item["name"] == "gid")
        shape = parameter["schema"]
        variants = shape.get("anyOf", [shape])
        assert any(variant.get("type") == "string" and variant.get("pattern") for variant in variants)
        assert all(variant.get("type") != "integer" for variant in variants)


@pytest.mark.parametrize("question", ["/priority", "/patterns", "/collectors", "/resilience", "/missing-evidence", "/challenge", "/brief", "unrecognized text"])
def test_offline_copilot_contract_preserves_source_receipts_and_absent_fields(analysis, question):
    gid = analysis._ranked[0]["gid"]
    payload = run_investigation(analysis, CopilotRequest(gid=gid, question=question), enabled=False)
    result = assert_exact_wire(contract.CopilotResponse, payload)
    assert "model" not in result and "memory" not in result
    assert result["citations"][0]["source"] == payload["citations"][0]["source"]
    # JsonValue source schemas must not coerce integers, booleans, nulls, or strings;
    # those exact bytes are separately hashed in each evidence receipt.
    assert json.dumps(result["citations"][0]["source"], sort_keys=True) == json.dumps(payload["citations"][0]["source"], sort_keys=True)
    for citation in result["citations"]:
        assert hashlib.sha256(citation["source_json"].encode("utf-8")).hexdigest() == citation["payload_sha256"]
        assert json.loads(citation["source_json"]) == citation["source"]


def test_http_validation_keeps_real_evidence_and_sanitizes_contract_failures(analysis, caplog):
    from moneygraph.api import make_app

    app = make_app(analysis)
    marker = "private evidence must not appear in validation errors"

    @app.get("/api/invalid-contract", response_model=contract.NodeSummary)
    def invalid_contract():
        return {"gid": marker}

    # The application ends with its SPA catch-all route; put this test endpoint
    # before it so the request exercises response validation rather than a 404.
    app.router.routes.insert(0, app.router.routes.pop())
    gid = analysis._ranked[0]["gid"]
    signals = SignalAnalysis(analysis)
    with TestClient(app) as client:
        for path, expected in (
            ("/api/summary", analysis.summary()),
            ("/api/nodes?limit=50", analysis.nodes()),
            (f"/api/nodes/{gid}", analysis.node(gid)),
            (f"/api/graph?gid={gid}", analysis.graph(gid=gid)),
            ("/api/clusters", analysis.clusters()),
            (f"/api/signals/{gid}", signals.node(gid)),
            ("/api/resilience", signals.resilience(5)),
            (f"/api/collectors?gids={gid}", signals.collectors([gid])),
            (f"/api/dossier/{gid}", signals.dossier(gid)),
            ("/api/provenance", provenance(analysis)),
        ):
            response = client.get(path)
            assert response.status_code == 200, response.text
            assert response.json() == account_ids_for_json(expected)
        response = client.get("/api/invalid-contract")
        assert response.status_code == 500
        assert response.json() == {"detail": "The response could not be validated."}
        assert marker not in response.text and marker not in caplog.text


def test_openapi_documents_each_json_success_and_actual_validation_error_shape():
    from moneygraph.api import make_app

    schema = make_app().openapi()
    responses = {
        ("get", "/api/health", "200"): "HealthResponse",
        ("get", "/api/summary", "200"): "SummaryResponse",
        ("get", "/api/nodes", "200"): "NodesResponse",
        ("get", "/api/nodes/{gid}", "200"): "NodeResponse",
        ("get", "/api/graph", "200"): "GraphResponse",
        ("get", "/api/clusters", "200"): "ClustersResponse",
        ("get", "/api/signals/{gid}", "200"): "SignalsResponse",
        ("get", "/api/resilience", "200"): "ResilienceResponse",
        ("get", "/api/collectors", "200"): "CollectorsResponse",
        ("get", "/api/provenance", "200"): "ProvenanceResponse",
        ("get", "/api/dossier/{gid}", "200"): "DossierResponse",
        ("get", "/api/copilot/status", "200"): "CopilotStatusResponse",
        ("post", "/api/copilot", "200"): "CopilotResponse",
        ("post", "/api/copilot/sessions", "201"): "SessionResponse",
    }
    for (method, path, status), name in responses.items():
        operation = schema["paths"][path][method]["responses"]
        assert operation[status]["content"]["application/json"]["schema"] == {"$ref": f"#/components/schemas/{name}"}
        assert operation["422"]["content"]["application/json"]["schema"] == {"$ref": "#/components/schemas/ErrorResponse"}
    assert "application/json" not in schema["paths"]["/api/exports/{name}"]["get"]["responses"]["200"]["content"]
    assert "content" not in schema["paths"]["/api/copilot/sessions/{session_id}"]["delete"]["responses"]["204"]


def test_export_openapi_does_not_load_dataset_or_start_runtime(monkeypatch):
    import moneygraph.api as api

    def forbidden(*args, **kwargs):
        raise AssertionError("Schema generation must not load data or start runtime")

    monkeypatch.setattr(api, "get_engine", forbidden)
    monkeypatch.setattr(api, "load_analysis", forbidden)
    monkeypatch.setenv("MONEYGRAPH_DATA_DIR", "/not-a-real-private-dataset")
    monkeypatch.setenv("PYTHON_DOTENV_DISABLED", "original-value")
    make_app = api.make_app

    def schema_only_app():
        assert os.environ["PYTHON_DOTENV_DISABLED"] == "1"
        return make_app()

    monkeypatch.setattr(api, "make_app", schema_only_app)
    script = Path(__file__).resolve().parents[1] / "scripts" / "export_openapi.py"
    generate = runpy.run_path(str(script))["schema_bytes"]
    first = generate()
    assert first == generate()
    assert os.environ["PYTHON_DOTENV_DISABLED"] == "original-value"
    schema = json.loads(first)
    assert schema["openapi"].startswith("3.")
    assert "/api/nodes/{gid}" in schema["paths"]
    assert "/not-a-real-private-dataset" not in first.decode()

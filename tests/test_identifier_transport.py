"""Synthetic int64 regressions; no organizer records are included."""

import csv
from io import StringIO
import json

from fastapi.testclient import TestClient
import polars as pl
from pydantic import ValidationError
import pytest

from moneygraph.agent.contracts import CopilotRequest, SessionCreateRequest
from moneygraph.api import make_app
from moneygraph.engine import Analysis, synthetic_frames
from moneygraph.identifiers import account_ids_for_json


def large_id(gid):
    # Odd values above 2**60 always lose precision if parsed as JS numbers.
    return 2**60 + gid * 2 + 1


@pytest.fixture(scope="module")
def large_engine():
    nodes, edges, transactions = synthetic_frames()
    mapping = {gid: large_id(gid) for gid in nodes["gid"]}
    return Analysis(
        nodes.with_columns(pl.col("gid").replace_strict(mapping)),
        edges.with_columns(pl.col(name).replace_strict(mapping) for name in ("src", "dst")),
        transactions.with_columns(pl.col(name).replace_strict(mapping) for name in ("src", "dst")),
    )


def test_browser_roundtrip_selects_exact_int64_account_and_preserves_csv(large_engine):
    before = {name: large_engine.export_rows(name) for name in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")}
    gid = str(large_id(1010))
    assert int(float(gid)) != int(gid)  # Regression would fail with JSON numbers.
    with TestClient(make_app(large_engine)) as client:
        summary = client.get("/api/summary").json()
        assert all(isinstance(node["gid"], str) for node in summary["top_nodes"])
        result = client.get("/api/nodes", params={"query": gid}).json()
        assert [node["gid"] for node in result["items"]] == [gid]
        selected = result["items"][0]["gid"]
        detail = client.get(f"/api/nodes/{selected}").json()
        assert detail["gid"] == gid
        assert type(detail["cluster_id"]) is int
        assert type(detail["in_degree"]) is int
        assert type(detail["priority_score"]) is float
        assert all(isinstance(row["gid"], str) for rows in detail["counterparties"].values() for row in rows)
        graph = client.get("/api/graph", params={"gid": selected}).json()
        assert graph["root_gid"] == gid
        assert any(node["gid"] == gid and node["is_root"] for node in graph["nodes"])
        assert all(type(edge[key]) is str for edge in graph["edges"] for key in ("src", "dst", "source", "target"))
        assert all(edge["source"] == edge["src"] and edge["target"] == edge["dst"] for edge in graph["edges"])
        exported = client.get("/api/exports/nodes_roles.csv")
        roles = list(csv.DictReader(StringIO(exported.text)))
        assert {row["gid"] for row in roles} == {str(gid) for gid in large_engine.G}
        clusters = list(csv.DictReader(StringIO(client.get("/api/exports/clusters.csv").text)))
        assert all(type(gid) is int for row in clusters for gid in json.loads(row["top_gids"]))
    assert before == {name: large_engine.export_rows(name) for name in before}


def test_nested_signal_cohort_and_community_ids_are_lossless(large_engine):
    gid = str(large_id(1010))
    sources = [str(large_id(1001)), str(large_id(1002))]
    with TestClient(make_app(large_engine)) as client:
        signals = client.get(f"/api/signals/{gid}").json()
        assert signals["gid"] == signals["limits"]["route_center_gid"] == gid
        assert signals["routes"]
        assert all(type(part) is str for route in signals["routes"] for part in route["path"])
        assert signals["temporal"]["synchronized_inflows"]
        assert all(type(payer) is str for row in signals["temporal"]["synchronized_inflows"] for payer in row["payers"])
        collectors = client.get("/api/collectors", params={"gids": ",".join(sources)}).json()
        assert collectors["gids"] == sources
        assert collectors["items"]
        assert all(type(item["gid"]) is str for item in collectors["items"])
        assert all(type(path["source_gid"]) is str and all(type(part) is str for part in path["path"])
                   for item in collectors["items"] for path in item["paths"])
        communities = client.get("/api/clusters").json()["items"]
        assert all(type(row["cluster_id"]) is int and all(type(gid) is str for gid in row["top_gids"]) for row in communities)
        removal = client.get("/api/resilience?top_n=3").json()
        assert len(removal["removed_gids"]) == 3
        assert all(type(gid) is str for gid in removal["removed_gids"])
        assert type(removal["baseline"]["nodes"]) is int
        assert client.get(f"/api/dossier/{gid}").json()["gid"] == gid


def test_large_string_scope_supports_session_and_copilot_citations(large_engine, monkeypatch):
    monkeypatch.setenv("MONEYGRAPH_AI_ENABLED", "false")
    monkeypatch.setenv("MONEYGRAPH_ALLOW_EXTERNAL_AI", "false")
    gid = str(large_id(1010))
    sources = [str(large_id(1001)), str(large_id(1002))]
    with TestClient(make_app(large_engine)) as client:
        session = client.post("/api/copilot/sessions", json={"gid": gid, "gids": sources})
        assert session.status_code == 201
        response = client.post("/api/copilot", json={"gid": gid, "gids": sources,
            "question": "Explain this account", "remember": True, "session_id": session.json()["session_id"]})
        assert response.status_code == 200
        answer = response.json()
        assert answer["mode"] == "offline"
        assert answer["citations"]
        assert all(citation["gid"] == gid for citation in answer["citations"])
        assert all(client.get(f"/api/nodes/{citation['gid']}").status_code == 200 for citation in answer["citations"])
        assert answer["memory"]["session_id"] == session.json()["session_id"]


@pytest.mark.parametrize("model", [CopilotRequest, SessionCreateRequest])
def test_canonical_string_scopes_normalize_to_exact_engine_integers(model):
    gid = large_id(1010)
    kwargs = {"question": "Explain"} if model is CopilotRequest else {}
    parsed = model(gid=str(gid), gids=[str(gid), 1001], **kwargs)
    assert parsed.gid == gid and parsed.gids == [gid, 1001]
    assert model(gid=gid, **kwargs).gid == gid  # Preserve exact Python/API clients.
    with pytest.raises(ValidationError):
        model(gid=str(gid), gids=[gid, str(gid)], **kwargs)


@pytest.mark.parametrize("invalid", [True, 1.5, -1, "01", "+1", " 1", "1 ", "1.0", "1e3", "", "9223372036854775808", 2**63])
def test_scope_rejects_lossy_or_noncanonical_identifiers(invalid):
    with pytest.raises(ValidationError):
        CopilotRequest(gid=invalid, question="Explain")
    with pytest.raises(ValidationError):
        SessionCreateRequest(gid="1", gids=[invalid])


def test_transport_copies_nested_cycle_and_anomaly_ids_without_changing_numbers():
    gid = large_id(1010)
    payload = {"cycles": [{"path": [gid, gid + 2, gid], "edges": [{"src": gid, "dst": gid + 2, "sum_kzt": 5000.0}]}],
               "anomalies": [{"metrics": {"counterparties": [gid], "counterparty_count": 1}}],
               "citations": [{"gid": gid}], "root_gid": None, "cluster_id": 2, "n_nodes": 3}
    converted = account_ids_for_json(payload)
    assert converted["cycles"][0]["path"] == [str(gid), str(gid + 2), str(gid)]
    assert converted["cycles"][0]["edges"][0] == {"src": str(gid), "dst": str(gid + 2), "sum_kzt": 5000.0}
    assert converted["anomalies"][0]["metrics"] == {"counterparties": [str(gid)], "counterparty_count": 1}
    assert converted["citations"][0]["gid"] == str(gid)
    assert converted["root_gid"] is None and converted["cluster_id"] == 2 and converted["n_nodes"] == 3
    assert payload["citations"][0]["gid"] == gid

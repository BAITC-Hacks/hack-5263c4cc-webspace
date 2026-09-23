import hashlib

import polars as pl
import pytest
from fastapi.testclient import TestClient

from moneygraph.api import make_app
from moneygraph.engine import Analysis, synthetic_frames


@pytest.fixture(scope="module")
def large_id_client():
    nodes, edges, tx = synthetic_frames()
    shift = 2**53
    nodes = nodes.with_columns((pl.col("gid") + shift).alias("gid"))
    edges = edges.with_columns((pl.col("src") + shift).alias("src"), (pl.col("dst") + shift).alias("dst"))
    tx = tx.with_columns((pl.col("src") + shift).alias("src"), (pl.col("dst") + shift).alias("dst"))
    with TestClient(make_app(Analysis(nodes, edges, tx))) as client:
        yield client


def test_v1_keeps_every_identifier_exact(large_id_client):
    client = large_id_client
    summary = client.get("/api/v1/summary").json()
    gid = summary["top_nodes"][0]["gid"]
    assert isinstance(gid, str) and int(gid) > 2**53
    analysis_id = summary["analysis_id"]
    assert len(analysis_id) == 64
    paths = [f"/nodes/{gid}", "/nodes?limit=2&offset=1", f"/graph?gid={gid}",
             "/clusters", f"/signals/{gid}", f"/collectors?gids={gid}",
             "/resilience", f"/dossier/{gid}", "/provenance", "/health"]
    id_fields = {"gid", "src", "dst", "root_gid", "source_gid", "route_center_gid"}
    id_lists = {"path", "top_gids", "gids", "removed_gids", "payers", "counterparties"}

    def check(value, key=""):
        if isinstance(value, dict):
            for child_key, child in value.items():
                check(child, child_key)
        elif isinstance(value, list):
            for child in value:
                if key in id_lists and not isinstance(child, dict):
                    assert isinstance(child, str) and int(child) > 2**53
                else:
                    check(child)
        elif key in id_fields and value is not None:
            assert isinstance(value, str) and int(value) > 2**53

    for path in paths:
        response = client.get("/api/v1" + path)
        assert response.status_code == 200, (path, response.text)
        assert response.json()["analysis_id"] == analysis_id
        check(response.json())
    ai = client.post("/api/v1/copilot", json={"gid": gid, "question": "Explain"})
    assert ai.status_code == 200
    assert ai.json()["citations"][0]["gid"] == gid
    assert ai.json()["analysis_id"] == analysis_id


def test_versioned_exports_reuse_exact_legacy_bytes(large_id_client):
    client = large_id_client
    receipt = client.get("/api/v1/provenance").json()
    for item in receipt["exports"]:
        legacy = client.get("/api/exports/" + item["name"])
        versioned = client.get("/api/v1/exports/" + item["name"])
        assert versioned.content == legacy.content
        assert hashlib.sha256(versioned.content).hexdigest() == item["sha256"]


def test_v1_errors_are_stable_and_do_not_echo_input(large_id_client):
    for path in ("/nodes/-1", "/nodes/01", "/nodes/9223372036854775808", "/graph?gid=1.5"):
        response = large_id_client.get("/api/v1" + path)
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_request"
        assert response.json()["error"]["request_id"] == response.headers["x-request-id"]
    assert large_id_client.post("/api/v1/copilot", json={"gid": 12, "question": "Explain"}).status_code == 422
    response = large_id_client.get("/api/v1/nodes/1")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_successful_openapi_responses_are_concrete(large_id_client):
    schema = large_id_client.get("/openapi.json").json()
    for path, operations in schema["paths"].items():
        if "/exports/" in path:
            continue
        for operation in operations.values():
            for status, result in operation["responses"].items():
                if status in {"200", "201"}:
                    assert result["content"]["application/json"]["schema"], path
    assert schema["components"]["schemas"]["NodeSummary"]["properties"]["gid"]["type"] == "string"

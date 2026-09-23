import csv
from io import StringIO

from fastapi.testclient import TestClient
import pytest

from moneygraph.api import make_app
from moneygraph.engine import load_analysis


@pytest.fixture(scope="module")
def client():
    with TestClient(make_app(load_analysis())) as session:
        yield session


def test_complete_analyst_workflow(client):
    summary = client.get("/api/summary").json()
    assert summary["dataset"]["kind"] == "synthetic"
    top = summary["top_nodes"][0]
    gid = top["gid"]
    found = client.get("/api/nodes", params={"query": gid, "role": top["role"]}).json()
    assert gid in [n["gid"] for n in found["items"]]
    detail = client.get(f"/api/nodes/{gid}").json()
    assert detail["evidence"] and detail["timeline"] and detail["limitations"]
    graph = client.get("/api/graph", params={"gid": gid, "hops": 1, "limit": 12}).json()
    assert len(graph["nodes"]) <= 12
    assert any(n["is_root"] for n in graph["nodes"])
    response = client.get("/api/exports/nodes_roles.csv")
    rows = list(csv.DictReader(StringIO(response.text)))
    assert len(rows) == summary["counts"]["nodes"]
    assert "attachment" in response.headers["content-disposition"]
    assert client.get("/api/clusters").json()["items"]


def test_unknown_entities_and_bounded_queries(client):
    assert client.get("/api/nodes/99999999").status_code == 404
    assert client.get("/api/graph?gid=99999999").status_code == 404
    assert client.get("/api/nodes?role=criminal").status_code == 400
    assert client.get("/api/nodes?limit=50000").status_code == 422
    assert client.get("/api/graph?hops=99").status_code == 422
    assert client.get("/api/exports/secrets.env").status_code == 404
    assert client.get("/api/unknown").status_code == 404


def test_exports_cover_required_three_contracts(client):
    expected = {
        "nodes_roles.csv": ["gid", "role", "role_score", "cluster_id", "priority_score", "evidence"],
        "clusters.csv": ["cluster_id", "n_nodes", "n_seed", "sum_kzt_internal", "top_gids", "hypothesis"],
        "top_nodes.csv": ["rank", "gid", "role", "priority_score", "why"],
    }
    for name, columns in expected.items():
        response = client.get(f"/api/exports/{name}")
        assert response.status_code == 200
        reader = csv.DictReader(StringIO(response.text))
        assert reader.fieldnames == columns
        rows = list(reader)
        assert rows
        if name == "top_nodes.csv":
            assert len(rows) >= 20


def test_local_host_boundary_and_private_response_headers():
    from moneygraph.api import make_app
    from moneygraph.engine import load_analysis
    with TestClient(make_app(load_analysis())) as local:
        assert local.get('/api/summary', headers={'Host':'untrusted.example'}).status_code == 400
        response = local.get('/api/summary')
        assert response.headers['cache-control'] == 'no-store'
        assert response.headers['x-content-type-options'] == 'nosniff'
        assert response.headers['x-frame-options'] == 'DENY'
        foreign = local.options('/api/copilot', headers={'Origin':'https://untrusted.example',
                         'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'})
        assert 'access-control-allow-origin' not in foreign.headers

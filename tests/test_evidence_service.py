"""Synthetic regression coverage for shared, detached evidence reads."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier

import pytest

from moneygraph.engine import load_analysis
from moneygraph.evidence import EvidenceService, get_evidence_service
from moneygraph.signals import SignalAnalysis


@pytest.fixture
def analysis():
    return load_analysis()


def test_facade_preserves_existing_evidence_and_export_contracts(analysis):
    service = get_evidence_service(analysis)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    assert service.summary() == analysis.summary()
    assert service.nodes(limit=3, offset=1) == analysis.nodes(limit=3, offset=1)
    assert service.node(gid) == analysis.node(gid)
    assert service.graph(gid=gid, hops=2, limit=6) == analysis.graph(gid=gid, hops=2, limit=6)
    assert service.clusters() == analysis.clusters()
    signals = SignalAnalysis(analysis)
    assert service.signal_node(gid) == signals.node(gid)
    assert service.dossier(gid) == signals.dossier(gid)
    assert service.resilience(3) == signals.resilience(3)
    assert service.collectors([gid], max_hops=2) == signals.collectors([gid], max_hops=2)
    for name in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv"):
        assert service.export_rows(name) == analysis.export_rows(name)


def test_core_payload_mutation_does_not_change_later_reads(analysis):
    service = get_evidence_service(analysis)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    node = service.node(gid)
    expected_node = deepcopy(node)
    node["metrics"]["matched_2d_ratio"] = -1
    node["score_factors"][0]["contribution"] = -1
    node["limitations"].append("caller-owned mutation")
    assert service.node(gid) == expected_node

    for read in (service.summary, service.clusters, lambda: service.graph(gid=gid)):
        payload = read()
        expected = deepcopy(payload)
        # Clear all nested containers rather than only replacing a top-level key.
        for value in payload.values():
            if isinstance(value, (dict, list)):
                value.clear()
        assert read() == expected


def test_signal_cache_payloads_are_detached_at_every_read(analysis):
    service = get_evidence_service(analysis)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    patterns = service.signal_node(gid)
    expected = deepcopy(patterns)
    patterns["temporal"]["overlap_2d_ratio"] = -1
    patterns["limits"]["max_routes"] = -1
    patterns["routes"].clear()
    patterns["caveats"].clear()
    assert service.signal_node(gid) == expected

    simulation = service.resilience(5)
    original = deepcopy(simulation)
    simulation["baseline"]["nodes"] = -1
    simulation["removed_gids"].clear()
    assert service.resilience(5) == original


def test_http_and_ai_style_reads_share_one_signal_index(analysis, monkeypatch):
    import moneygraph.evidence as evidence_module

    constructed = []
    routes_computed = []

    class CountingSignals(SignalAnalysis):
        def __init__(self, source):
            constructed.append(source)
            super().__init__(source)

        def _routes(self, gid):
            routes_computed.append(gid)
            return super()._routes(gid)

    monkeypatch.setattr(evidence_module, "SignalAnalysis", CountingSignals)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    http_service = get_evidence_service(analysis)
    ai_service = get_evidence_service(analysis)
    http_service.signal_node(gid)
    ai_service.dossier(gid)
    ai_service.signal_node(gid)
    assert http_service is ai_service
    assert constructed == [analysis]
    assert routes_computed == [gid]


def test_concurrent_first_reads_initialize_and_cache_once(analysis, monkeypatch):
    import moneygraph.evidence as evidence_module

    constructed = []
    routes_computed = []

    class CountingSignals(SignalAnalysis):
        def __init__(self, source):
            constructed.append(source)
            super().__init__(source)

        def _routes(self, gid):
            routes_computed.append(gid)
            return super()._routes(gid)

    monkeypatch.setattr(evidence_module, "SignalAnalysis", CountingSignals)
    gid = analysis.summary()["top_nodes"][0]["gid"]
    barrier = Barrier(8)

    def read(_):
        barrier.wait(timeout=5)
        service = get_evidence_service(analysis)
        return service, service.signal_node(gid)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(read, range(8)))
    assert all(service is results[0][0] for service, _ in results)
    assert constructed == [analysis]
    assert routes_computed == [gid]
    assert all(payload == results[0][1] for _, payload in results)
    assert len({id(payload["temporal"]) for _, payload in results}) == 8


def test_analysis_instances_do_not_share_signal_state(analysis):
    other = load_analysis()
    first = get_evidence_service(analysis)
    second = get_evidence_service(other)
    assert first is not second
    assert isinstance(first, EvidenceService)
    assert first.dataset_kind == analysis.dataset_kind


def test_existing_missing_account_and_scope_bounds_are_preserved(analysis):
    service = get_evidence_service(analysis)
    assert service.node(-1) is None
    with pytest.raises(KeyError):
        service.signal_node(-1)
    with pytest.raises(KeyError):
        service.dossier(-1)
    for count in (0, 21, True):
        with pytest.raises(ValueError):
            service.resilience(count)
    for gids in ([], [1001, 1001], list(range(6))):
        with pytest.raises(ValueError):
            service.collectors(gids)


def test_tool_reads_reuse_service_and_keep_signal_projection_detached(analysis, monkeypatch):
    import moneygraph.evidence as evidence_module
    from moneygraph.agent.evidence import evidence_tool

    constructed = []

    class CountingSignals(SignalAnalysis):
        def __init__(self, source):
            constructed.append(source)
            super().__init__(source)

    monkeypatch.setattr(evidence_module, "SignalAnalysis", CountingSignals)
    service = get_evidence_service(analysis)
    expected = service.signal_node(1020)
    tool_result = evidence_tool("inspect_patterns", "{}", analysis, 1020)
    assert len(tool_result["data"]["routes"]) <= 4
    assert all(len(route["occurrences"]) <= 3 for route in tool_result["data"]["routes"])
    tool_result["data"]["limits"]["max_routes"] = -1
    assert service.signal_node(1020) == expected
    evidence_tool("inspect_investigation_brief", "{}", service, 1020)
    assert constructed == [analysis]
    assert get_evidence_service(service) is service


def test_invalid_tool_arguments_fail_before_service_access(monkeypatch):
    import moneygraph.agent.evidence as agent_evidence

    def unexpected_service(_):
        pytest.fail("Invalid tool arguments must fail before evidence access")

    monkeypatch.setattr(agent_evidence, "get_evidence_service", unexpected_service)
    with pytest.raises(ValueError):
        agent_evidence.evidence_tool("inspect_selected_node", '{"gid": 9}', object(), 7)


def test_http_and_tool_reads_share_one_analysis_owned_signal_index(analysis, monkeypatch):
    from fastapi.testclient import TestClient
    from moneygraph.agent.evidence import evidence_tool
    from moneygraph.api import make_app
    import moneygraph.evidence as evidence_module

    constructed = []

    class CountingSignals(SignalAnalysis):
        def __init__(self, source):
            constructed.append(source)
            super().__init__(source)

    monkeypatch.setattr(evidence_module, "SignalAnalysis", CountingSignals)
    with TestClient(make_app(analysis)) as client:
        response = client.get("/api/signals/1020")
        assert response.status_code == 200
        tool = evidence_tool("inspect_patterns", "{}", analysis, 1020)
        assert tool["data"]["gid"] == 1020
        dossier = client.get("/api/dossier/1020")
        assert dossier.status_code == 200
    assert constructed == [analysis]

"""Architecture guarantees beyond the financial-methodology examples."""
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
from pathlib import Path
from threading import Barrier, Lock

import polars as pl
import pytest

from moneygraph.audit import export_content, provenance
from moneygraph.engine import Analysis, synthetic_frames
from moneygraph.signals import SignalAnalysis


EXPECTED_EXPORTS = {
    "nodes_roles.csv": "73fdb85d0f7cabcb8bd1468ed8edb62f59e9f42b6052e7768988d21bd7721be2",
    "clusters.csv": "d15cb27b55a4c1ce4ef1af0ffb91741494fb2737415a18ed6c7b4ca43e332a7e",
    "top_nodes.csv": "f5fdbb50b33952beca5096815fa2983b7bb376e9c2064debae381850e1fa40f8",
}


@pytest.fixture
def analysis():
    return Analysis(*synthetic_frames())


def export_hashes(analysis):
    return {name: hashlib.sha256(export_content(analysis, name).encode("utf-8")).hexdigest()
            for name in EXPECTED_EXPORTS}


def test_synthetic_csv_bytes_are_unchanged(analysis):
    assert export_hashes(analysis) == EXPECTED_EXPORTS


def test_returned_node_nested_data_cannot_change_analysis(analysis):
    gid = analysis.nodes()["items"][0]["gid"]
    expected = deepcopy(analysis.node(gid))
    node = analysis.node(gid)
    node["metrics"]["in_kzt"] = -1
    node["role_scores"]["transit"] = -1
    node["score_factors"][0]["contribution"] = -1
    node["limitations"].append("corrupted")
    node["observability"]["notes"].clear()
    assert analysis.node(gid) == expected
    assert export_hashes(analysis) == EXPECTED_EXPORTS


def test_returned_clusters_cannot_change_analysis_or_exports(analysis):
    expected = deepcopy(analysis.clusters())
    clusters = analysis.clusters()
    clusters["items"][0]["top_gids"].clear()
    clusters["items"][0]["roles"].clear()
    clusters["items"][0]["hypothesis"] = "corrupted"
    assert analysis.clusters() == expected
    assert export_hashes(analysis) == EXPECTED_EXPORTS


def test_returned_signals_cannot_change_cached_evidence(analysis):
    signals = SignalAnalysis(analysis)
    expected = deepcopy(signals.node(1010))
    result = signals.node(1010)
    result["temporal"]["overlap_2d_ratio"] = -1
    result["routes"].clear()
    result["caveats"].append("corrupted")
    assert signals.node(1010) == expected
    assert export_hashes(analysis) == EXPECTED_EXPORTS


def test_returned_resilience_and_dossier_are_independent(analysis):
    signals = SignalAnalysis(analysis)
    expected_removal = deepcopy(signals.resilience(5))
    result = signals.resilience(5)
    result["removed_gids"].clear()
    result["after"]["nodes"] = -1
    assert signals.resilience(5) == expected_removal
    expected_dossier = deepcopy(signals.dossier(1010))
    dossier = signals.dossier(1010)
    dossier["next_requests"][0]["request"] = "corrupted"
    dossier["evidence"].clear()
    assert signals.dossier(1010) == expected_dossier
    assert export_hashes(analysis) == EXPECTED_EXPORTS


def test_public_snapshot_reads_are_detached(analysis):
    snapshot = analysis.snapshot
    expected = deepcopy(analysis.node(1010))
    snapshot.node_records()[1010]["metrics"]["in_kzt"] = -1
    snapshot.ranked_records()[0]["limitations"].clear()
    snapshot.cluster_records()[0]["top_gids"].clear()
    tables = snapshot.canonical_tables()
    tables["nodes"][0]["is_seed"] = False
    tables["transactions"].clear()
    snapshot.daily_records(1010).clear()
    graph = snapshot.graph_copy()
    src, dst = next(iter(graph.edges))
    graph[src][dst]["sum_kzt"] = -1
    graph.remove_node(1010)
    assert analysis.node(1010) == expected
    assert export_hashes(analysis) == EXPECTED_EXPORTS
    assert snapshot.analysis_id == analysis.analysis_id


def test_concurrent_cached_signal_reads_are_independent(analysis):
    signals = SignalAnalysis(analysis)
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(signals.node, [1010] * 24))
    expected = deepcopy(results[0])
    for result in results:
        assert result == expected
        result["routes"].clear()
    assert signals.node(1010) == expected


def test_dense_graph_edge_cap_is_deterministic_and_disclosed():
    ids = list(range(1, 47))
    nodes = pl.DataFrame({"gid": ids, "depth": [1] * 46, "is_seed": [False] * 46})
    tx = pl.DataFrame([{"src": src, "dst": dst, "date": date(2026, 7, 1), "sum_kzt": 5000.0}
                       for src in ids for dst in ids if src != dst])
    edges = tx.select("src", "dst", "sum_kzt").with_columns(
        pl.lit(1).alias("n_tx"), pl.lit(1).alias("depth"))
    first = Analysis(nodes, edges, tx).graph(limit=400)
    second = Analysis(nodes.reverse(), edges.reverse(), tx.reverse()).graph(limit=400)
    assert first == second
    assert len(first["edges"]) == 2000
    assert first["total_edges"] == 2070
    assert first["returned_edges"] == 2000
    assert first["truncated"] is True
    assert first["truncation_reasons"] == ["edge_limit"]


def test_receipt_v2_has_stable_calculation_identity(analysis):
    receipt = provenance(analysis)
    assert receipt["schema_version"] == 2
    assert receipt["analysis_id"] == analysis.analysis_id
    assert receipt["rules_version"]
    assert receipt["source_manifest"]["files"]
    assert len(receipt["dependency_lock_sha256"]) == 64
    reversed_analysis = Analysis(*(frame.reverse() for frame in synthetic_frames()))
    assert provenance(reversed_analysis) == receipt


def test_manifest_normalizes_checkout_line_endings_and_tracks_all_inputs():
    from moneygraph.application.provenance import build_manifest

    source = {"domain/rules.py": "score = 0.2\n", "analysis/features.py": "value = 2\n"}
    configuration = {"rules_version": "1.0", "random_seed": 42}
    original = build_manifest(source, configuration, "version = 1\n")
    windows_source = {name.replace("/", "\\"): text.replace("\n", "\r\n")
                      for name, text in reversed(list(source.items()))}
    assert build_manifest(windows_source, configuration, b"version = 1\r\n") == original
    changed_source = {**source, "domain/rules.py": "score = 0.3\n"}
    assert build_manifest(changed_source, configuration, "version = 1\n")["algorithm_sha256"] != original["algorithm_sha256"]
    assert build_manifest(source, {**configuration, "random_seed": 43}, "version = 1\n")["algorithm_sha256"] != original["algorithm_sha256"]
    assert build_manifest(source, configuration, "version = 2\n")["algorithm_sha256"] != original["algorithm_sha256"]


def test_manifest_explicitly_covers_every_calculation_module(analysis):
    from moneygraph.adapters.filesystem import CALCULATION_SOURCES

    package = Path(__file__).resolve().parents[1] / "src" / "moneygraph"
    calculation_modules = {path.relative_to(package).as_posix()
                           for directory in ("analysis", "domain") for path in (package / directory).rglob("*.py")}
    assert calculation_modules <= set(CALCULATION_SOURCES)
    manifest_files = {item["path"] for item in provenance(analysis)["source_manifest"]["files"]}
    assert manifest_files == set(CALCULATION_SOURCES)
    assert {"application/exports.py", "application/queries.py", "application/provenance.py"} <= manifest_files


def test_export_service_is_the_same_byte_contract_as_files_and_receipts(analysis, tmp_path):
    from moneygraph.application.exports import ExportService

    exports = ExportService(analysis.snapshot)
    paths = analysis.exports(tmp_path)
    receipt = provenance(analysis)
    for item in receipt["exports"]:
        content = exports.render(item["name"])
        assert content == Path(paths[item["name"]]).read_bytes()
        assert b"\r\n" in content and b"\n" not in content.replace(b"\r\n", b"")
        assert hashlib.sha256(content).hexdigest() == item["sha256"] == EXPECTED_EXPORTS[item["name"]]
        assert len(content) == item["bytes"]


def test_simultaneous_same_node_requests_compute_expensive_signals_once(analysis, monkeypatch):
    signals = SignalAnalysis(analysis)
    calls = 0
    count_lock = Lock()
    start = Barrier(8)
    original = signals._routes

    def counted_routes(gid):
        nonlocal calls
        with count_lock:
            calls += 1
        return original(gid)

    def request(_):
        start.wait(timeout=5)
        return signals.node(1010)

    monkeypatch.setattr(signals, "_routes", counted_routes)
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(request, range(8)))
    assert all(result == results[0] for result in results)
    assert calls == 1


def test_graph_node_truncation_counts_and_returned_graph_cannot_mutate_snapshot(analysis):
    graph = analysis.graph(1010, hops=2, limit=3)
    assert graph["total_nodes"] > graph["returned_nodes"] == 3
    assert graph["total_edges"] >= graph["returned_edges"] == len(graph["edges"])
    assert graph["truncation_reasons"] == ["node_limit"]
    expected = deepcopy(graph)
    graph["nodes"][0]["priority_score"] = -1
    graph["edges"].clear()
    assert analysis.graph(1010, hops=2, limit=3) == expected


def test_pure_pipeline_does_not_read_files_or_environment(monkeypatch):
    from moneygraph.analysis.pipeline import build_analysis
    from moneygraph.analysis.validation import prepare_input
    from moneygraph.application.exports import ExportService

    inputs = prepare_input(*synthetic_frames())

    def reject_io(*args, **kwargs):
        raise AssertionError("Pure computation attempted external I/O")

    monkeypatch.setattr(Path, "read_bytes", reject_io)
    monkeypatch.setattr(Path, "read_text", reject_io)
    monkeypatch.setattr("os.getenv", reject_io)
    snapshot = build_analysis(inputs)
    exports = ExportService(snapshot)
    assert {name: hashlib.sha256(exports.render(name)).hexdigest() for name in EXPECTED_EXPORTS} == EXPECTED_EXPORTS

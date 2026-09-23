from datetime import date

from fastapi.testclient import TestClient
import polars as pl
import pytest

from moneygraph.api import make_app
from moneygraph.engine import Analysis, load_analysis
from moneygraph.signals import SignalAnalysis


def model(rows, *, node_ids=None, depths=None, seeds=(1,)):
    ids = sorted(node_ids or {gid for row in rows for gid in row[:2]})
    nodes = pl.DataFrame({"gid": ids, "depth": [(depths or {}).get(gid, 1) for gid in ids],
                          "is_seed": [gid in seeds for gid in ids]})
    tx = pl.DataFrame([{"src": src, "dst": dst, "sum_kzt": float(amount), "date": date(2026, 7, day)}
                       for src, dst, amount, day in rows])
    edges = tx.group_by(["src", "dst"]).agg(pl.col("sum_kzt").sum(), pl.len().alias("n_tx")).with_columns(pl.lit(1).alias("depth"))
    return Analysis(nodes, edges, tx)


def test_recurring_routes_require_separate_dates_and_preserve_proof():
    engine = model([(1, 2, 10000, 1), (2, 3, 12000, 2), (1, 2, 9000, 6), (2, 3, 13000, 8)])
    signal = SignalAnalysis(engine).node(2)
    assert signal["routes"] == [{"path": [1, 2, 3], "occurrences": [
        {"in_date": "2026-07-01", "out_date": "2026-07-02", "in_kzt": 10000.0, "out_kzt": 12000.0, "lag_days": 1},
        {"in_date": "2026-07-06", "out_date": "2026-07-08", "in_kzt": 9000.0, "out_kzt": 13000.0, "lag_days": 2},
    ], "occurrence_count": 2, "distinct_start_dates": 2}]
    same_day = model([(1, 2, 10000, 1), (2, 3, 10000, 1), (1, 2, 10000, 6), (2, 3, 10000, 6)])
    assert SignalAnalysis(same_day).node(2)["routes"] == []
    one_date = model([(1, 2, 10000, 1), (1, 2, 10000, 1), (2, 3, 10000, 2)])
    assert SignalAnalysis(one_date).node(2)["routes"] == []


def test_return_cycle_requires_strictly_ordered_dates_for_temporal_claim():
    increasing = model([(1, 2, 10000, 1), (2, 3, 8000, 2), (3, 1, 5000, 3)])
    cycle = SignalAnalysis(increasing).node(1)["cycles"][0]
    assert cycle["path"] == [1, 2, 3, 1]
    assert cycle["kind"] == "date_consistent_cycle"
    assert [r["date"] for r in cycle["chronological_example"]] == ["2026-07-01", "2026-07-02", "2026-07-03"]
    assert all(edge["dates"] for edge in cycle["edges"])
    for days in [(1, 1, 1), (3, 2, 1)]:
        engine = model([(1, 2, 10000, days[0]), (2, 3, 8000, days[1]), (3, 1, 5000, days[2])])
        structural = SignalAnalysis(engine).node(1)["cycles"][0]
        assert structural["kind"] == "structural_cycle"
        assert structural["chronological_example"] is None


def test_long_cycles_are_outside_declared_search_bound():
    engine = model([(1, 2, 10000, 1), (2, 3, 10000, 2), (3, 4, 10000, 3),
                    (4, 5, 10000, 4), (5, 1, 10000, 5)])
    signals = SignalAnalysis(engine).node(1)
    assert signals["cycles"] == []
    assert signals["limits"]["max_cycle_length"] == 4
    assert any("Bounded" in note for note in signals["caveats"])


def test_daily_spikes_and_same_day_payers_do_not_claim_intraday_order():
    engine = model([(1, 4, 10000, 1), (2, 4, 10000, 1), (3, 4, 10000, 1),
                    (1, 4, 5000, 2), (1, 4, 5000, 3)])
    temporal = SignalAnalysis(engine).node(4)["temporal"]
    assert temporal["spikes"] == [{"date": "2026-07-01", "total_kzt": 30000.0, "baseline_median_kzt": 5000.0, "ratio": 6.0}]
    assert temporal["synchronized_inflows"][0]["payers"] == [1, 2, 3]
    assert temporal["synchronized_inflows"][0]["sum_kzt"] == 30000
    assert "does not prove intraday" in temporal["caveat"]


def test_repeated_amount_motif_never_claims_invisible_below_threshold_splitting():
    valid = model([(1, 4, 5000, 1), (1, 4, 5000, 1), (2, 4, 5000, 1)])
    motifs = SignalAnalysis(valid).node(4)["anomalies"]
    assert len(motifs) == 1
    assert motifs[0]["metrics"]["transaction_count"] == 3
    assert "does not establish deliberate splitting" in motifs[0]["evidence"]
    for rows in [[(1, 4, 4900, 1), (1, 4, 4900, 1), (2, 4, 4900, 1)],
                 [(1, 4, 5000, 1), (1, 4, 5000, 1), (1, 4, 5000, 1)]]:
        assert SignalAnalysis(model(rows)).node(4)["anomalies"] == []


def test_depth_peer_anomaly_handles_zero_heavy_cohorts_without_nan():
    ids = list(range(1, 16))
    engine = model([(1, target, 5000, 1) for target in (2, 3, 4, 5)], node_ids=ids)
    signals = SignalAnalysis(engine)
    assert signals.node(15)["anomalies"] == []
    degree = next(a for a in signals.node(1)["anomalies"] if a["id"] == "depth_peer_out_degree")
    assert degree["metrics"]["peer_median"] == 0
    assert degree["metrics"]["comparison_baseline"] == 1
    assert degree["metrics"]["value"] == 4
    small_cohort = model([(1, 2, 50000, 1), (1, 3, 50000, 1)], node_ids=[1, 2, 3])
    assert not any(a["id"].startswith("depth_peer") for a in SignalAnalysis(small_cohort).node(1)["anomalies"])


def test_resilience_is_deterministic_and_does_not_mutate_the_graph():
    engine = model([(1, 2, 10000, 1), (2, 3, 10000, 2), (3, 4, 10000, 3)], node_ids=[1, 2, 3, 4, 5])
    signals = SignalAnalysis(engine)
    original = list(engine.G.edges)
    result = signals.resilience(1)
    assert result["removed_gids"] == [engine._ranked[0]["gid"]]
    assert result["baseline"] == {"nodes": 5, "edges": 3, "weak_components": 2, "largest_component_nodes": 4, "reachable_seed_pairs": 3}
    assert result["after"]["nodes"] == 4
    assert result["after"]["reachable_seed_pairs"] < 3
    assert list(engine.G.edges) == original
    assert result == SignalAnalysis(engine).resilience(1)
    assert signals.resilience(20)["after"]["nodes"] == 0
    for count in (0, 21, True, 1.5):
        with pytest.raises(ValueError):
            signals.resilience(count)


def test_common_collectors_are_directed_bounded_and_proven_by_paths():
    engine = model([(1, 3, 10000, 1), (2, 3, 10000, 1), (3, 4, 10000, 2),
                    (4, 5, 10000, 3), (5, 6, 10000, 4), (7, 1, 10000, 1)], seeds=(1, 2))
    signals = SignalAnalysis(engine)
    result = signals.collectors([1, 2])
    assert {r["gid"] for r in result["items"]} == {3, 4, 5}
    assert all(r["matched_sources"] == 2 for r in result["items"])
    assert result == signals.collectors([2, 1])
    for item in result["items"]:
        for route in item["paths"]:
            assert route["hops"] <= 3
            assert route["path"][0] == route["source_gid"]
            assert route["path"][-1] == item["gid"]
            assert all(engine.G.has_edge(src, dst) for src, dst in zip(route["path"], route["path"][1:]))
    assert len(signals.collectors([1, 2], max_hops=1)["items"]) == 1
    for invalid in ([], [1, 1], [1, 2, 3, 4, 5, 6]):
        with pytest.raises(ValueError):
            signals.collectors(invalid)
    with pytest.raises(KeyError):
        signals.collectors([999])


def test_boundary_dossier_prioritizes_missing_outgoing_collection():
    engine = model([(1, 2, 5000, 1)], depths={1: 0, 2: 4}, node_ids=[1, 2, 3])
    signals = SignalAnalysis(engine)
    dossier = signals.dossier(2)
    assert dossier["role"] == "boundary_unknown"
    assert "boundary" in dossier["missing_evidence"][0]
    assert "Extend" in dossier["next_requests"][0]["request"]
    assert "not evidence" in dossier["next_requests"][0]["reason"]
    assert any("no transfer" in note for note in signals.dossier(3)["missing_evidence"])


def test_signals_and_dossiers_do_not_change_submission_exports():
    engine = load_analysis()
    before = {name: engine.export_rows(name) for name in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")}
    signals = SignalAnalysis(engine)
    gid = engine._ranked[0]["gid"]
    first = signals.node(gid)
    assert first == SignalAnalysis(engine).node(gid)
    signals.dossier(gid)
    signals.resilience(5)
    signals.collectors([gid])
    assert before == {name: engine.export_rows(name) for name in before}


def test_signal_api_contract_bounds_and_provenance_download():
    engine = model([(1, 3, 10000, 1), (2, 3, 10000, 1), (3, 4, 10000, 2)])
    with TestClient(make_app(engine)) as client:
        assert client.get("/api/signals/3").json()["gid"] == 3
        assert client.get("/api/signals/999").status_code == 404
        assert client.get("/api/resilience?top_n=21").status_code == 422
        assert client.get("/api/resilience?top_n=1").json()["top_n"] == 1
        assert client.get("/api/collectors?gids=1,2").json()["items"]
        for selected in ("1,1", "1,2,3,4,5,6", "1,abc", ""):
            assert client.get("/api/collectors", params={"gids": selected}).status_code == 422
        assert client.get("/api/collectors?gids=999").status_code == 404
        assert client.get("/api/collectors?gids=1&max_hops=4").status_code == 422
        assert client.get("/api/dossier/3").json()["evidence"]
        assert client.get("/api/dossier/3?format=html").status_code == 422
        assert client.get("/api/dossier/999").status_code == 404
        assert client.get("/api/provenance").status_code == 200
        download = client.get("/api/dossier/3?format=markdown")
        assert download.status_code == 200
        assert "attachment" in download.headers["content-disposition"]
        assert "Account 3" in download.text
        assert "no-store" == download.headers["cache-control"]

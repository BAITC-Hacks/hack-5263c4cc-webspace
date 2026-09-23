import csv
from datetime import date

import polars as pl
import pytest

from moneygraph.engine import Analysis, ROLE_COLUMNS, TOP_COLUMNS, CLUSTER_COLUMNS, load_analysis, synthetic_frames


def frames(transactions=None):
    nodes = pl.DataFrame({"gid": [1, 2, 3, 4, 5, 6], "depth": [0, 1, 2, 4, 0, 0],
                          "is_seed": [True, False, False, False, True, True]})
    transactions = transactions or [
        {"src": 1, "dst": 2, "date": date(2026, 7, 1), "sum_kzt": 20000.0},
        {"src": 2, "dst": 3, "date": date(2026, 7, 2), "sum_kzt": 14000.0},
        {"src": 2, "dst": 6, "date": date(2026, 7, 2), "sum_kzt": 5000.0},
        {"src": 6, "dst": 4, "date": date(2026, 7, 3), "sum_kzt": 5000.0},
    ]
    tx = pl.DataFrame(transactions)
    edges = tx.group_by(["src", "dst"]).agg(pl.col("sum_kzt").sum(), pl.len().alias("n_tx")).with_columns(pl.lit(1).alias("depth"))
    return nodes, edges, tx


def test_isolated_seeds_are_present_in_all_views_and_clusters():
    analysis = Analysis(*frames())
    assert analysis.summary()["counts"]["nodes"] == 6
    assert analysis.node(5)["role"] == "peripheral"
    assert analysis.node(5)["priority_score"] == 0
    assert analysis.node(5)["observability"]["level"] == "isolated"
    assert analysis.graph(5)["nodes"][0]["gid"] == 5
    assert sum(c["n_nodes"] for c in analysis.clusters()["items"]) == 6
    assert analysis.node(5)["cluster_id"] >= 0


def test_boundary_never_becomes_terminal_and_seed_ratio_does_not_imply_transit():
    analysis = Analysis(*frames())
    assert analysis.node(4)["role"] == "boundary_unknown"
    assert analysis.node(4)["role_scores"]["terminal"] == 0
    assert analysis.node(3)["role"] == "terminal"
    assert analysis.node(6)["metrics"]["pass_through"] == 1
    assert analysis.node(6)["role"] != "transit"
    assert any("balances" in note for note in analysis.node(6)["limitations"])


def test_temporal_matching_obeys_dates_and_does_not_double_count_inflow():
    tx = [
        {"src": 1, "dst": 2, "date": date(2026, 7, 5), "sum_kzt": 10000.0},
        {"src": 2, "dst": 3, "date": date(2026, 7, 6), "sum_kzt": 10000.0},
        {"src": 2, "dst": 4, "date": date(2026, 7, 7), "sum_kzt": 10000.0},
    ]
    assert Analysis(*frames(tx)).node(2)["metrics"]["matched_2d_ratio"] == 0.5
    tx[0]["date"] = date(2026, 7, 10)
    assert Analysis(*frames(tx)).node(2)["metrics"]["matched_2d_ratio"] == 0
    tx[0]["date"] = date(2026, 7, 1)
    assert Analysis(*frames(tx)).node(2)["metrics"]["matched_2d_ratio"] == 0


def test_exports_schema_coverage_order_and_determinism(tmp_path):
    source = synthetic_frames()
    first = Analysis(*source)
    second = Analysis(*(frame.reverse() for frame in source))
    for name, columns in [("nodes_roles.csv", ROLE_COLUMNS), ("clusters.csv", CLUSTER_COLUMNS), ("top_nodes.csv", TOP_COLUMNS)]:
        assert first.export_rows(name) == second.export_rows(name)
        assert first.export_rows(name)[0] == columns
    paths = first.exports(tmp_path)
    with open(paths["nodes_roles.csv"], newline="") as stream:
        roles = list(csv.DictReader(stream))
    with open(paths["top_nodes.csv"], newline="") as stream:
        top = list(csv.DictReader(stream))
    assert len(roles) == source[0].height
    assert len(top) >= 20
    assert all(0 <= float(r["role_score"]) <= 1 and 0 <= float(r["priority_score"]) <= 1 for r in roles)
    assert all(r["evidence"] and len(r["evidence"]) <= 200 for r in roles)
    scores = [float(r["priority_score"]) for r in top]
    assert scores == sorted(scores, reverse=True)


def test_aggregation_mismatch_is_rejected():
    nodes, edges, tx = frames()
    bad = edges.with_columns((pl.col("sum_kzt") + 5000).alias("sum_kzt"))
    with pytest.raises(ValueError, match="amounts or counts"):
        Analysis(nodes, bad, tx)
    with pytest.raises(ValueError, match="unique"):
        Analysis(pl.concat([nodes, nodes.head(1)]), edges, tx)


def test_graph_is_bounded_and_has_valid_endpoints():
    analysis = load_analysis()
    node = analysis.summary()["top_nodes"][0]["gid"]
    graph = analysis.graph(node, hops=2, limit=3)
    ids = {n["id"] for n in graph["nodes"]}
    assert str(node) in ids
    assert len(ids) <= 3
    assert graph["truncated"]
    assert all(edge["source"] in ids and edge["target"] in ids for edge in graph["edges"])


def test_priority_contributions_explain_final_priority():
    analysis = load_analysis()
    for row in analysis.nodes(limit=500)["items"]:
        node = analysis.node(row["gid"])
        assert sum(f["contribution"] for f in node["score_factors"]) == pytest.approx(node["priority_score"], abs=1e-6)


def test_missing_explicit_dataset_fails_instead_of_silently_using_demo(tmp_path):
    with pytest.raises(ValueError, match="must contain"):
        load_analysis(tmp_path)

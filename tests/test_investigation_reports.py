import math

import polars as pl
import pytest

from moneygraph.engine import Analysis, ROLES, load_analysis, synthetic_frames
from moneygraph.exports import EXPORT_NAMES, export_bytes


@pytest.fixture(scope="module")
def model():
    return load_analysis()


def test_explanations_reconcile_with_every_actual_role_and_priority(model):
    from moneygraph.explain import explain_node
    for row in model.export_rows("nodes_roles.csv")[1]:
        report = explain_node(model, row["gid"])
        assert report["role"] == row["role"]
        assert report["role_score"] == row["role_score"]
        assert [rule["role"] for rule in report["rules"]] == list(ROLES)
        winner = next(rule for rule in report["rules"] if rule["selected"])
        assert winner["role"] == row["role"]
        assert winner["score"] == row["role_score"]
        assert sum(rule["selected"] for rule in report["rules"]) == 1
        assert sum(item["contribution"] for item in report["priority_factors"]) == pytest.approx(row["priority_score"], abs=1e-6)
        assert all(rule["conditions"] and rule["formula"] for rule in report["rules"])


def test_boundary_and_seed_restrictions_are_visible_in_the_trace(model):
    from moneygraph.explain import explain_node
    boundary = explain_node(model, 1040)
    terminal = next(rule for rule in boundary["rules"] if rule["role"] == "terminal")
    assert not terminal["eligible"]
    assert any(c["field"] == "observation_boundary" and not c["passed"] for c in terminal["conditions"])
    seed = explain_node(model, 1001)
    for rule in seed["rules"]:
        if rule["role"] in {"transit", "terminal", "coordinator"}:
            assert any(c["field"] == "is_seed" and not c["passed"] for c in rule["conditions"])
    with pytest.raises(KeyError):
        explain_node(model, 999999)


def test_sensitivity_zero_delta_keeps_exact_baseline_and_does_not_mutate(model):
    from moneygraph.ranking import sensitivity_report
    before = {name: export_bytes(model, name) for name in EXPORT_NAMES}
    report = sensitivity_report(model, delta=0, top=20)
    assert len(report["scenarios"]) == 12
    assert all(s["top_gids"] == report["baseline"]["top_gids"] for s in report["scenarios"])
    assert all(n["min_rank"] == n["max_rank"] == n["baseline_rank"] for n in report["nodes"])
    assert before == {name: export_bytes(model, name) for name in EXPORT_NAMES}


def test_sensitivity_normalizes_weights_and_preserves_observation_adjustments(model):
    from moneygraph.ranking import sensitivity_report
    report = sensitivity_report(model, delta=.1)
    assert report == sensitivity_report(model, delta=.1)
    for scenario in report["scenarios"]:
        assert sum(scenario["weights"].values()) == pytest.approx(1)
        assert 0 <= scenario["top_overlap"]["jaccard"] <= 1
        assert scenario["top_overlap"]["shared_count"] <= 20
    nodes = {n["gid"]: n for n in report["nodes"]}
    assert nodes[1090]["min_score"] == nodes[1090]["max_score"] == 0
    assert all(0 <= n["min_score"] <= n["max_score"] <= 1 for n in nodes.values())
    assert all(0 <= n["top_inclusion_count"] <= 12 for n in nodes.values())
    assert all(n["min_rank"] <= n["max_rank"] for n in nodes.values())
    assert "accuracy" in report["interpretation"].lower()


@pytest.mark.parametrize("delta", [-.01, .51, float("nan"), float("inf")])
def test_sensitivity_rejects_invalid_delta(model, delta):
    from moneygraph.ranking import sensitivity_report
    with pytest.raises(ValueError):
        sensitivity_report(model, delta=delta)


@pytest.mark.parametrize("top", [0, 101, 1.5, True])
def test_ranking_reports_reject_invalid_top(model, top):
    from moneygraph.ranking import compare_rankings, sensitivity_report
    for function in (compare_rankings, sensitivity_report):
        with pytest.raises(ValueError):
            function(model, top=top)


def test_comparison_baselines_follow_the_declared_features(model):
    from moneygraph.ranking import compare_rankings
    report = compare_rankings(model, top=20)
    all_nodes = [model.node(row["gid"]) for row in model.export_rows("nodes_roles.csv")[1]]
    volume = sorted(all_nodes, key=lambda n: (-(n["in_kzt"] + n["out_kzt"]), n["gid"]))
    degree = sorted(all_nodes, key=lambda n: (-(n["in_degree"] + n["out_degree"]), n["gid"]))
    assert report["rankings"]["volume"]["top_gids"] == [n["gid"] for n in volume[:20]]
    assert report["rankings"]["degree"]["top_gids"] == [n["gid"] for n in degree[:20]]
    assert report["rankings"]["priority"]["top_gids"] == [n["gid"] for n in model.export_rows("top_nodes.csv")[1]][:20]
    assert report["accounts"]
    assert all(set(row["ranks"]) == {"priority", "volume", "degree"} for row in report["accounts"])


def test_reports_include_all_nodes_beyond_the_http_limit_and_handle_ties():
    from moneygraph.ranking import compare_rankings, sensitivity_report
    _, edges, tx = synthetic_frames()
    nodes = pl.DataFrame({"gid": list(range(650)), "depth": [0] * 650, "is_seed": [True] * 650})
    model = Analysis(nodes, edges.head(0), tx.head(0))
    sensitivity = sensitivity_report(model)
    assert len(sensitivity["nodes"]) == 650
    assert sensitivity["baseline"]["top_gids"] == list(range(20))
    comparison = compare_rankings(model)
    assert all(r["top_gids"] == list(range(20)) for r in comparison["rankings"].values())
    assert all(math.isfinite(n["min_score"]) for n in sensitivity["nodes"])


def test_reports_are_input_order_invariant():
    from moneygraph.ranking import compare_rankings, sensitivity_report
    frames = synthetic_frames()
    first, second = Analysis(*frames), Analysis(*(f.reverse() for f in frames))
    assert compare_rankings(first) == compare_rankings(second)
    assert sensitivity_report(first) == sensitivity_report(second)

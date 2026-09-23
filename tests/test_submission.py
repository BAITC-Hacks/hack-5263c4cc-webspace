import csv
import hashlib
import json
from pathlib import Path

import pytest

from moneygraph.audit import provenance
from moneygraph.engine import Analysis, load_analysis, synthetic_frames


@pytest.fixture(scope="module")
def analysis():
    return load_analysis()


def validate(analysis, directory):
    from moneygraph.submission import validate_submission
    return validate_submission(analysis, directory)


def change_rows(directory, name, change):
    path = directory / name
    with path.open(newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        columns, rows = reader.fieldnames, list(reader)
    change(rows)
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def test_valid_submission_and_optional_receipt_are_verified(analysis, tmp_path):
    analysis.exports(tmp_path)
    report = validate(analysis, tmp_path)
    assert report["valid"]
    assert report["counts"]["nodes"] == analysis.summary()["counts"]["nodes"]
    assert all(check["status"] in {"pass", "skip"} for check in report["checks"])
    (tmp_path / "provenance.json").write_text(json.dumps(provenance(analysis)))
    assert validate(analysis, tmp_path)["valid"]


@pytest.mark.parametrize("mutation", [
    lambda rows: rows.pop(),
    lambda rows: rows.append(rows[0].copy()),
    lambda rows: rows[0].update(priority_score="nan"),
    lambda rows: rows[0].update(role_score="1.01"),
    lambda rows: rows[0].update(evidence=""),
    lambda rows: rows[0].update(evidence="x" * 201),
    lambda rows: rows[0].update(role="invented"),
    lambda rows: rows[0].update(cluster_id="999999"),
    lambda rows: rows[0].update(gid="1.5"),
    lambda rows: rows[0].update(priority_score="0.12345678"),
])
def test_node_corruption_is_reported_without_rewriting_files(analysis, tmp_path, mutation):
    analysis.exports(tmp_path)
    change_rows(tmp_path, "nodes_roles.csv", mutation)
    before = (tmp_path / "nodes_roles.csv").read_bytes()
    result = validate(analysis, tmp_path)
    assert not result["valid"]
    assert any(check["status"] == "fail" for check in result["checks"])
    assert (tmp_path / "nodes_roles.csv").read_bytes() == before


@pytest.mark.parametrize("name,mutation", [
    ("clusters.csv", lambda rows: rows[0].update(n_nodes="999")),
    ("clusters.csv", lambda rows: rows[0].update(n_seed="999")),
    ("clusters.csv", lambda rows: rows[0].update(sum_kzt_internal="inf")),
    ("clusters.csv", lambda rows: rows[0].update(top_gids='[999999]')),
    ("clusters.csv", lambda rows: rows[0].update(hypothesis=" ")),
    ("top_nodes.csv", lambda rows: rows.reverse()),
    ("top_nodes.csv", lambda rows: rows.__delitem__(slice(19, None))),
    ("top_nodes.csv", lambda rows: rows[1].update(gid=rows[0]["gid"])),
    ("top_nodes.csv", lambda rows: rows[0].update(rank="2")),
    ("top_nodes.csv", lambda rows: rows[0].update(why="")),
])
def test_clusters_and_top_are_cross_checked(analysis, tmp_path, name, mutation):
    analysis.exports(tmp_path)
    change_rows(tmp_path, name, mutation)
    assert not validate(analysis, tmp_path)["valid"]


def test_missing_malformed_and_wrong_header_files_return_a_report(analysis, tmp_path):
    assert not validate(analysis, tmp_path)["valid"]
    analysis.exports(tmp_path)
    (tmp_path / "nodes_roles.csv").write_text('gid,role\n1,"unterminated', encoding="utf-8")
    assert not validate(analysis, tmp_path)["valid"]
    analysis.exports(tmp_path)
    path = tmp_path / "nodes_roles.csv"
    path.write_text(path.read_text().replace("gid,role,", "role,gid,", 1))
    assert not validate(analysis, tmp_path)["valid"]


def test_receipt_does_not_hide_csv_tampering(analysis, tmp_path):
    analysis.exports(tmp_path)
    receipt = provenance(analysis)
    receipt["dataset_sha256"] = "0" * 64
    (tmp_path / "provenance.json").write_text(json.dumps(receipt))
    assert not validate(analysis, tmp_path)["valid"]
    (tmp_path / "provenance.json").write_text("{bad json")
    assert not validate(analysis, tmp_path)["valid"]


def test_small_fixture_uses_input_size_instead_of_hardcoded_official_counts(tmp_path):
    nodes, edges, tx = synthetic_frames()
    isolated = nodes.filter(nodes["gid"] == 1090)
    model = Analysis(isolated, edges.head(0), tx.head(0))
    model.exports(tmp_path)
    report = validate(model, tmp_path)
    assert report["valid"]
    assert report["counts"]["nodes"] == 1
    assert report["counts"]["top_nodes"] == 1


def test_serialization_keeps_original_synthetic_csv_bytes(analysis, tmp_path):
    expected = {
        "nodes_roles.csv": "73fdb85d0f7cabcb8bd1468ed8edb62f59e9f42b6052e7768988d21bd7721be2",
        "clusters.csv": "d15cb27b55a4c1ce4ef1af0ffb91741494fb2737415a18ed6c7b4ca43e332a7e",
        "top_nodes.csv": "f5fdbb50b33952beca5096815fa2983b7bb376e9c2064debae381850e1fa40f8",
    }
    for name, path in analysis.exports(tmp_path).items():
        assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == expected[name]


def test_http_export_is_identical_to_cli_and_receipt(analysis, tmp_path):
    from fastapi.testclient import TestClient
    from moneygraph.api import make_app
    paths = analysis.exports(tmp_path)
    with TestClient(make_app(analysis)) as client:
        for name, path in paths.items():
            assert client.get(f"/api/exports/{name}").content == Path(path).read_bytes()

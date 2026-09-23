import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

import polars as pl
import pytest

from moneygraph.audit import provenance
from moneygraph.engine import load_analysis
from moneygraph.exports import EXPORT_NAMES


def cli(tmp_path, *arguments):
    environment = {**os.environ, "MONEYGRAPH_DATA_DIR": "", "MONEYGRAPH_AI_ENABLED": "false",
                   "MONEYGRAPH_ALLOW_EXTERNAL_AI": "false", "PYTHONIOENCODING": "utf-8",
                   "PYTHONPATH": str(Path(__file__).resolve().parents[1] / "src")}
    return subprocess.run([sys.executable, "-m", "moneygraph", *map(str, arguments)], cwd=tmp_path,
                          env=environment, capture_output=True, text=True, encoding="utf-8", timeout=30)


@pytest.fixture(scope="module")
def model():
    return load_analysis()


def exported(model, directory):
    model.exports(directory)
    (directory / "provenance.json").write_text(json.dumps(provenance(model)), encoding="utf-8")


def test_export_bundle_is_deterministic_and_only_contains_allowlisted_files(tmp_path):
    directory = tmp_path / "outputs"
    directory.mkdir()
    (directory / "nodes.parquet").write_bytes(b"PRIVATE INPUT")
    (directory / ".env").write_text("PRIVATE CONFIG")
    archive = tmp_path / "nested" / "submission.zip"
    first = cli(tmp_path, "export", "--out", directory, "--bundle", archive)
    assert first.returncode == 0, first.stderr
    assert json.loads(first.stdout)["bundle"] == str(archive)
    before = archive.read_bytes()
    second = cli(tmp_path, "export", "--out", directory, "--bundle", archive)
    assert second.returncode == 0, second.stderr
    assert archive.read_bytes() == before
    with zipfile.ZipFile(archive) as zipped:
        assert set(zipped.namelist()) == {*EXPORT_NAMES, "provenance.json", "validation.json"}
        assert zipped.testzip() is None
        for name in (*EXPORT_NAMES, "provenance.json"):
            assert zipped.read(name) == (directory / name).read_bytes()
        assert json.loads(zipped.read("validation.json"))["valid"] is True


def test_bundle_rejects_corrupt_submission_without_replacing_existing_archive(model, tmp_path):
    from moneygraph.bundle import build_bundle
    exported(model, tmp_path)
    archive = tmp_path / "submission.zip"
    archive.write_bytes(b"KEEP EXISTING")
    (tmp_path / "nodes_roles.csv").write_text("broken")
    with pytest.raises(ValueError):
        build_bundle(model, tmp_path, archive)
    assert archive.read_bytes() == b"KEEP EXISTING"


def test_bundle_requires_receipt_and_protects_csv_destinations(model, tmp_path):
    from moneygraph.bundle import build_bundle
    model.exports(tmp_path)
    with pytest.raises(ValueError):
        build_bundle(model, tmp_path, tmp_path / "submission.zip")
    exported(model, tmp_path)
    before = (tmp_path / "nodes_roles.csv").read_bytes()
    with pytest.raises(ValueError):
        build_bundle(model, tmp_path, tmp_path / "nodes_roles.csv")
    assert (tmp_path / "nodes_roles.csv").read_bytes() == before


def test_validation_exit_codes_and_report_file(model, tmp_path):
    directory = tmp_path / "outputs"
    exported(model, directory)
    report_path = tmp_path / "reports" / "validation.json"
    result = cli(tmp_path, "validate-submission", "--out", directory, "--report", report_path)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == json.loads(report_path.read_text(encoding="utf-8"))
    assert json.loads(result.stdout)["dataset_kind"] == "synthetic"
    (directory / "top_nodes.csv").unlink()
    failed = cli(tmp_path, "validate-submission", "--out", directory)
    assert failed.returncode == 1
    assert json.loads(failed.stdout)["valid"] is False
    assert "Traceback" not in failed.stderr


def test_explain_human_and_json_modes(tmp_path):
    plain = cli(tmp_path, "explain", "--gid", 1040)
    assert plain.returncode == 0, plain.stderr
    assert "Dataset: synthetic" in plain.stdout
    assert "boundary_unknown" in plain.stdout
    assert "FAIL: observation_boundary" in plain.stdout
    assert "Priority contributions:" in plain.stdout
    path = tmp_path / "explanation.json"
    structured = cli(tmp_path, "explain", "--gid", 1040, "--json", "--report", path)
    assert structured.returncode == 0, structured.stderr
    assert json.loads(structured.stdout) == json.loads(path.read_text(encoding="utf-8"))
    assert json.loads(structured.stdout)["gid"] == 1040


@pytest.mark.parametrize("arguments", [
    ["explain", "--gid", "999999"], ["explain"],
    ["sensitivity", "--delta", "nan"], ["sensitivity", "--delta", "-0.1"],
    ["compare-rankings", "--top", "0"], ["compare-rankings", "--top", "101"],
    ["export", "--data", "missing"], ["export", "--bundle", "nodes_roles.csv"],
])
def test_invalid_cli_input_is_actionable_without_tracebacks(tmp_path, arguments):
    result = cli(tmp_path, *arguments)
    assert result.returncode == 2
    assert "error:" in result.stderr.lower()
    assert "Traceback" not in result.stderr


def test_cli_reports_and_explicit_parquet_input(tmp_path):
    directory = tmp_path / "fixture"
    assert cli(tmp_path, "demo-data", "--out", directory).returncode == 0
    comparison = cli(tmp_path, "compare-rankings", "--data", directory, "--top", 10)
    assert comparison.returncode == 0, comparison.stderr
    assert json.loads(comparison.stdout)["effective_top"] == 10
    sensitivity = cli(tmp_path, "sensitivity", "--data", directory, "--delta", "0", "--top", "10")
    assert sensitivity.returncode == 0, sensitivity.stderr
    report = json.loads(sensitivity.stdout)
    assert len(report["scenarios"]) == 12
    assert all(s["top_gids"] == report["baseline"]["top_gids"] for s in report["scenarios"])


def test_report_cannot_overwrite_submission_receipt(model, tmp_path):
    exported(model, tmp_path)
    receipt = tmp_path / "provenance.json"
    before = receipt.read_bytes()
    result = cli(tmp_path, "validate-submission", "--out", tmp_path, "--report", receipt)
    assert result.returncode == 2
    assert receipt.read_bytes() == before


@pytest.mark.parametrize("column", ["date", "sum_kzt"])
def test_bad_input_error_does_not_echo_private_cell_contents(tmp_path, column):
    from moneygraph.engine import synthetic_frames
    for name, frame in zip(("nodes", "edges", "transactions"), synthetic_frames(), strict=True):
        if name == "transactions":
            frame = frame.with_columns(pl.lit("SECRET1234").alias(column))
        frame.write_parquet(tmp_path / f"{name}.parquet")
    result = cli(tmp_path, "compare-rankings", "--data", tmp_path)
    assert result.returncode == 2
    assert "SECRET1234" not in result.stderr
    assert "Traceback" not in result.stderr


def test_bundle_uses_validated_snapshot_even_if_disk_contents_change(model, tmp_path, monkeypatch):
    from moneygraph import bundle
    exported(model, tmp_path)
    inspect = bundle._inspect_submission
    original = (tmp_path / "nodes_roles.csv").read_bytes()

    def inspect_then_change(analysis, directory):
        result = inspect(analysis, directory)
        (directory / "nodes_roles.csv").write_bytes(b"CHANGED AFTER VALIDATION")
        return result

    monkeypatch.setattr(bundle, "_inspect_submission", inspect_then_change)
    archive = bundle.build_bundle(model, tmp_path, tmp_path / "submission.zip")
    with zipfile.ZipFile(archive) as zipped:
        assert zipped.read("nodes_roles.csv") == original


def test_failed_zip_write_preserves_previous_archive_and_cleans_temporary_file(model, tmp_path, monkeypatch):
    from moneygraph import bundle
    exported(model, tmp_path)
    archive = tmp_path / "submission.zip"
    archive.write_bytes(b"PREVIOUS ARCHIVE")

    def fail(*args, **kwargs):
        raise OSError("Simulated write failure")

    monkeypatch.setattr(bundle.ZipFile, "writestr", fail)
    with pytest.raises(OSError):
        bundle.build_bundle(model, tmp_path, archive)
    assert archive.read_bytes() == b"PREVIOUS ARCHIVE"
    assert not list(tmp_path.glob(".moneygraph-*.tmp"))

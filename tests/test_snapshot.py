"""Synthetic evidence identity stays tied to analysis construction."""
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest

from moneygraph.agent.memory import evidence_version
from moneygraph.audit import provenance
from moneygraph.engine import load_analysis
from moneygraph.evidence import get_evidence_service


def test_captured_receipt_is_detached_and_metadata_is_frozen():
    analysis = load_analysis()
    receipt = provenance(analysis)
    original = provenance(analysis)
    receipt["exports"][0]["sha256"] = "caller changed this"
    receipt["source_sha256"]["engine.py"] = "caller changed this"
    assert provenance(analysis) == original
    assert evidence_version(analysis) == original["evidence_version"]
    with pytest.raises(FrozenInstanceError):
        analysis._snapshot_metadata.evidence_version = "changed"
    analysis.runtime_ms += 1000
    assert provenance(analysis) == original


@pytest.mark.parametrize("module", ["engine.py", "signals.py", "exports.py", "agent/grounding.py"])
def test_source_changes_affect_new_analyses_only(monkeypatch, module):
    import moneygraph.snapshot as snapshot_module

    first = load_analysis()
    original = provenance(first)
    target = Path(snapshot_module.__file__).parent / module
    read_bytes = Path.read_bytes

    def changed_source(path):
        content = read_bytes(path)
        return content + b"\n# simulated source change\n" if path == target else content

    monkeypatch.setattr(Path, "read_bytes", changed_source)
    # Deliberately make the first memory read after the simulated source change.
    assert evidence_version(first) == original["evidence_version"]
    assert provenance(first) == original
    second = load_analysis()
    updated = provenance(second)
    assert updated["dataset_sha256"] == original["dataset_sha256"]
    assert updated["exports"] == original["exports"]
    assert updated["source_sha256"][module] != original["source_sha256"][module]
    assert evidence_version(second) != evidence_version(first)


def test_version_and_receipt_reads_need_no_source_file_access(monkeypatch):
    analysis = load_analysis()
    service = get_evidence_service(analysis)
    expected = provenance(analysis)

    def unexpected_read(_):
        pytest.fail("Published analysis identity must not re-read live source files")

    monkeypatch.setattr(Path, "read_bytes", unexpected_read)
    assert provenance(analysis) == expected
    assert service.provenance() == expected
    assert evidence_version(analysis) == evidence_version(service) == expected["evidence_version"]


def test_source_manifest_covers_analysis_signals_exports_and_agent_behavior():
    receipt = provenance(load_analysis())
    required = {"engine.py", "signals.py", "exports.py", "audit.py", "snapshot.py",
                "evidence.py", "identifiers.py", "copilot.py", "agent/contracts.py",
                "agent/evidence.py", "agent/runtime.py", "agent/memory.py",
                "agent/grounding.py", "agent/offline.py"}
    assert required <= receipt["source_sha256"].keys()
    assert all(len(value) == 64 for value in receipt["source_sha256"].values())
    assert receipt["algorithm_sha256"] == receipt["source_sha256"]["engine.py"]
    assert set(receipt["runtime_versions"]) == {"python", "networkx", "polars", "numpy", "scipy"}


def test_unversioned_adapters_do_not_receive_a_fabricated_identity():
    class Adapter:
        pass

    assert evidence_version(Adapter()) is None
    assert evidence_version(get_evidence_service(Adapter())) is None

"""Identity captured when deterministic analysis completes.

The receipt identifies loaded data, export bytes, source files and runtime
versions. It is not data authentication, an immutable engine, or a code sandbox.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
from importlib import metadata
import json
from pathlib import Path
import platform
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .engine import Analysis


@dataclass(frozen=True, slots=True)
class SnapshotMetadata:
    """Immutable metadata; decoding a receipt gives the caller its own copy."""

    receipt_json: str
    evidence_version: str

    def receipt(self) -> dict[str, Any]:
        return json.loads(self.receipt_json)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False)


def build_snapshot_metadata(analysis: Analysis) -> SnapshotMetadata:
    """Capture once at construction, never lazily on an evidence or memory read."""
    from .audit import _build_provenance

    receipt = _build_provenance(analysis)
    package = Path(__file__).parent
    modules = [package / name for name in (
        "engine.py", "signals.py", "exports.py", "audit.py", "evidence.py",
        "snapshot.py", "identifiers.py", "copilot.py",
    )]
    modules.extend(sorted((package / "agent").glob("*.py")))
    source_hashes = {path.relative_to(package).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in modules}
    runtime_versions = {"python": platform.python_version()}
    for distribution in ("networkx", "polars", "numpy", "scipy"):
        runtime_versions[distribution] = metadata.version(distribution)
    receipt["algorithm_sha256"] = source_hashes["engine.py"]
    receipt["source_sha256"] = source_hashes
    receipt["runtime_versions"] = runtime_versions
    version = hashlib.sha256(_canonical_json(receipt).encode("utf-8")).hexdigest()
    receipt["evidence_version"] = version
    return SnapshotMetadata(receipt_json=_canonical_json(receipt), evidence_version=version)

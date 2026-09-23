"""Pure hashing of canonical inputs, calculation manifests and exact CSV bytes."""
from __future__ import annotations

from collections.abc import Mapping
import hashlib
from typing import Any

from ..analysis.snapshot import snapshot_of
from ..domain.models import canonical_digest
from .exports import EXPORT_NAMES, ExportService


def normalized_source(value: str | bytes) -> bytes:
    """Make checkout line endings irrelevant while preserving the source text."""
    text = value.decode("utf-8-sig") if isinstance(value, bytes) else value.removeprefix("\ufeff")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def build_manifest(sources: Mapping[str, str | bytes], configuration: Mapping[str, Any],
                   dependency_lock: str | bytes) -> dict[str, Any]:
    """Hash supplied sources/configuration; callers own how those bytes are loaded."""
    normalized = {name.replace("\\", "/"): value for name, value in sources.items()}
    if len(normalized) != len(sources):
        raise ValueError("Source manifest paths must be unique after normalization")
    files = [{"path": name, "sha256": hashlib.sha256(normalized_source(normalized[name])).hexdigest()}
             for name in sorted(normalized)]
    source_manifest = {"version": 1, "normalization": "utf-8-lf", "files": files,
                       "sha256": canonical_digest(files)}
    configuration_hash = canonical_digest(dict(configuration))
    dependency_hash = hashlib.sha256(normalized_source(dependency_lock)).hexdigest()
    algorithm_hash = canonical_digest({"source_manifest_sha256": source_manifest["sha256"],
                                       "configuration_sha256": configuration_hash,
                                       "dependency_lock_sha256": dependency_hash})
    return {"source_manifest": source_manifest, "configuration_sha256": configuration_hash,
            "dependency_lock_sha256": dependency_hash, "algorithm_sha256": algorithm_hash}


def provenance(analysis: Any) -> dict[str, Any]:
    snapshot = snapshot_of(analysis)
    manifest = snapshot.calculation_manifest()
    # A caller building the pure pipeline directly can explicitly identify its in-memory configuration.
    if not manifest:
        manifest = build_manifest({}, snapshot.configuration(), b"")
    exports = ExportService(snapshot)
    artifacts = []
    for name in EXPORT_NAMES:
        content = exports.render(name)
        artifacts.append({"name": name, "sha256": hashlib.sha256(content).hexdigest(),
                          "bytes": len(content), "rows": len(exports.rows(name)[1])})
    return {"schema_version": 2, "dataset_kind": snapshot.dataset_kind,
            "dataset_sha256": snapshot.dataset_sha256,
            "canonical_table_sha256": snapshot.canonical_table_hashes(),
            "analysis_id": snapshot.analysis_id, "rules_version": snapshot.rule_config.rules_version,
            **manifest, "exports": artifacts,
            "interpretation": "Hashes identify canonical loaded evidence and exact export bytes; they do not prove data authenticity or analytical accuracy. In schema version 2, algorithm_sha256 combines the normalized calculation-source manifest, rule configuration and dependency lock; it is not a fingerprint of the complete application."}

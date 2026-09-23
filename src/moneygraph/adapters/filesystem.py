"""Local artifact writes and calculation-source reads, outside the analysis core."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..application.exports import EXPORT_NAMES, ExportService
from ..application.provenance import build_manifest

# Keep this explicit list synchronized with the calculation packages (checked in tests).
CALCULATION_SOURCES = (
    "domain/__init__.py", "domain/models.py", "domain/rules.py",
    "analysis/__init__.py", "analysis/fixtures.py", "analysis/validation.py", "analysis/graph.py",
    "analysis/features.py", "analysis/pipeline.py", "analysis/snapshot.py", "analysis/signals.py",
    "application/queries.py", "application/exports.py", "application/provenance.py",
    "adapters/parquet.py", "adapters/filesystem.py", "engine.py", "signals.py", "audit.py",
)


def read_calculation_manifest(configuration: dict[str, Any], *, source_root: Path | None = None,
                              dependency_lock: Path | None = None) -> dict[str, Any]:
    package = source_root or Path(__file__).resolve().parents[1]
    lock = dependency_lock or package.parents[1] / "uv.lock"
    sources = {name: (package / name).read_bytes() for name in CALCULATION_SOURCES}
    return build_manifest(sources, configuration, lock.read_bytes())


def write_exports(exports: ExportService, output_dir: str | Path) -> dict[str, str]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    paths = {}
    for name in EXPORT_NAMES:
        path = output / name
        path.write_bytes(exports.render(name))
        paths[name] = str(path)
    return paths

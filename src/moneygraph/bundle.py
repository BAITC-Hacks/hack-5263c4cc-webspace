"""Deterministic submission archive built from the exact bytes that were validated."""
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from .engine import Analysis
from .exports import EXPORT_NAMES
from .submission import _inspect_submission


def build_bundle(analysis: Analysis, directory: str | Path, destination: str | Path) -> Path:
    target = Path(destination)
    if target.suffix.lower() != ".zip":
        raise ValueError("Bundle destination must end in .zip")
    report, contents = _inspect_submission(analysis, directory)
    if not report["valid"] or "provenance.json" not in contents:
        raise ValueError("Bundle requires three valid CSVs and a matching provenance.json")
    contents["validation.json"] = (json.dumps(report, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8")
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(dir=target.parent, prefix=".moneygraph-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for name in (*EXPORT_NAMES, "provenance.json", "validation.json"):
                entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                entry.create_system = 3
                entry.external_attr = 0o100600 << 16
                archive.writestr(entry, contents[name], compress_type=ZIP_DEFLATED, compresslevel=9)
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return target

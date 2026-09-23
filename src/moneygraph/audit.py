"""Reproducibility receipts without serializing private records into logs."""
from __future__ import annotations

import csv
import hashlib
import io
import json
from pathlib import Path
from typing import Any


def _digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str,
                         ensure_ascii=False, allow_nan=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def export_content(analysis: Any, name: str) -> str:
    columns, rows = analysis.export_rows(name)
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def provenance(analysis: Any) -> dict:
    """Hash canonical input rows and exact CSV bytes, independent of wall-clock time."""
    inputs = {
        "nodes": sorted(analysis._nodes.values(), key=lambda row: row["gid"]),
        "edges": analysis._edges,
        "transactions": analysis._transactions,
    }
    table_hashes = {name: _digest(rows) for name, rows in inputs.items()}
    engine_path = Path(__file__).with_name("engine.py")
    algorithm_hash = hashlib.sha256(engine_path.read_bytes()).hexdigest()
    exports = []
    for name in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv"):
        content = export_content(analysis, name).encode()
        exports.append({"name": name, "sha256": hashlib.sha256(content).hexdigest(),
                        "bytes": len(content), "rows": len(analysis.export_rows(name)[1])})
    return {"schema_version": 1, "dataset_kind": analysis.dataset_kind,
            "dataset_sha256": _digest(table_hashes), "canonical_table_sha256": table_hashes,
            "algorithm_sha256": algorithm_hash, "exports": exports,
            "interpretation": "Hashes identify canonical loaded evidence and exact export bytes; they do not prove data authenticity or analytical accuracy."}


def dossier_markdown(dossier: dict, receipt: dict) -> str:
    """Portable analyst handoff; no model or network dependency."""
    lines = [f"# {dossier['title']}", "", f"Account: {dossier['gid']}",
             f"Role hypothesis: {dossier['role']}",
             f"Heuristic review priority: {dossier['priority_score']:.4f}", "",
             "This document records observations and hypotheses, not a finding of wrongdoing.", ""]
    for key, title in [("evidence", "Observed evidence"), ("hypotheses", "Hypotheses for review"),
                       ("missing_evidence", "Missing evidence")]:
        lines += [f"## {title}", ""] + [f"- {item}" for item in dossier.get(key, [])] + [""]
    lines += ["## Next evidence requests", ""]
    for item in dossier.get("next_requests", []):
        lines += [f"- Priority {item['priority']}: {item['request']} {item['reason']}"]
    lines += ["", "## Evidence receipt", "",
              f"Dataset SHA-256: `{receipt['dataset_sha256']}`", "",
              f"Algorithm SHA-256: `{receipt['algorithm_sha256']}`", "",
              "The input dataset remains local. Preserve the matching CSV exports with this receipt.", ""]
    return "\n".join(lines)

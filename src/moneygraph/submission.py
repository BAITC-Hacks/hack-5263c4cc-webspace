"""Read-only checks of actual submission files against the loaded analysis."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re

from .audit import provenance
from .engine import Analysis
from .exports import EXPORT_NAMES


def _integer(value: str) -> int:
    if not isinstance(value, str) or re.fullmatch(r"-?[0-9]+", value) is None:
        raise ValueError("Expected an integer")
    return int(value)


def _parse(row: dict, name: str) -> dict:
    if any(not isinstance(v, str) or not v.strip() for v in row.values()):
        raise ValueError("Empty or malformed fields")
    result = dict(row)
    for key in ("gid", "rank", "cluster_id", "n_nodes", "n_seed"):
        if key in row:
            result[key] = _integer(row[key])
    for key in ("role_score", "priority_score", "sum_kzt_internal"):
        if key in row:
            value = float(row[key])
            if not math.isfinite(value) or value < 0 or (key.endswith("score") and value > 1):
                raise ValueError("Invalid numerical range")
            result[key] = value
    if "evidence" in row and len(row["evidence"]) > 200:
        raise ValueError("Evidence exceeds 200 characters")
    if name == "clusters.csv":
        gids = json.loads(row["top_gids"])
        if not isinstance(gids, list) or any(type(gid) is not int for gid in gids):
            raise ValueError("top_gids must be an integer JSON array")
        result["top_gids"] = gids
    return result


def _same(actual: dict, expected: dict) -> bool:
    for key, value in expected.items():
        if isinstance(value, float):
            if not math.isclose(actual[key], value, rel_tol=0, abs_tol=1e-8):
                return False
        elif actual[key] != value:
            return False
    return True


def _inspect_submission(analysis: Analysis, directory: str | Path) -> tuple[dict, dict[str, bytes]]:
    """Check schema, coverage, calculated values and any supplied hash receipt.

    Counts follow the input, including tiny fixtures. Top lists may contain any
    correct ranking prefix from min(20, input nodes) to the full input size.
    No files are rewritten, and invalid row contents are not copied into reports.
    """
    directory = Path(directory)
    checks: list[dict] = []
    expected_nodes = analysis.export_rows("nodes_roles.csv")[1]
    count = len(expected_nodes)
    parsed: dict[str, list[dict]] = {}
    contents: dict[str, bytes] = {}

    def check(name: str, passed: bool, message: str):
        checks.append({"id": name, "status": "pass" if passed else "fail", "message": message})

    for name in EXPORT_NAMES:
        path = directory / name
        columns = analysis.export_rows(name)[0]
        try:
            # Bound malformed inputs without imposing official-data row constants.
            if path.stat().st_size > max(1_000_000, count * 4096):
                raise ValueError("Submission file exceeds the input-relative size limit")
            raw = path.read_bytes()
            contents[name] = raw
            reader = csv.DictReader(io.StringIO(raw.decode("utf-8"), newline=""), strict=True)
            if reader.fieldnames != list(columns):
                check(f"{name}.schema", False, "Column names and order must match the required contract.")
                continue
            rows = []
            for row in reader:
                if set(row) != set(columns) or len(rows) >= count:
                    raise ValueError("Malformed row or excess row count")
                rows.append(_parse(row, name))
            parsed[name] = rows
            check(f"{name}.schema", True, "Exact columns, valid field types and bounded values.")
        except (OSError, UnicodeError, csv.Error, ValueError, OverflowError, TypeError):
            check(f"{name}.schema", False, "File is missing, unreadable, malformed, too large, or contains invalid fields.")

    if "nodes_roles.csv" in parsed:
        rows = parsed["nodes_roles.csv"]
        expected = {row["gid"]: row for row in expected_nodes}
        unique = {row["gid"]: row for row in rows}
        coverage = len(rows) == len(unique) == count and set(unique) == set(expected)
        check("nodes.coverage", coverage, "Every input node must occur exactly once, including isolated seeds.")
        matches = coverage and all(_same(row, expected[row["gid"]]) for row in rows)
        check("nodes.results", matches, "Roles, scores, cluster IDs and explanations must match this analysis.")

    if "clusters.csv" in parsed:
        rows = parsed["clusters.csv"]
        expected = {row["cluster_id"]: {**row, "top_gids": json.loads(row["top_gids"])}
                    for row in analysis.export_rows("clusters.csv")[1]}
        unique = {row["cluster_id"]: row for row in rows}
        coverage = len(rows) == len(unique) == len(expected) and set(unique) == set(expected)
        check("clusters.coverage", coverage, "Every calculated cluster must occur exactly once.")
        matches = coverage and all(_same(row, expected[row["cluster_id"]]) for row in rows)
        check("clusters.results", matches, "Membership counts, seed counts, turnover, representatives and hypotheses must reconcile.")

    if "top_nodes.csv" in parsed:
        rows = parsed["top_nodes.csv"]
        expected = sorted(expected_nodes, key=lambda row: (-row["priority_score"], row["gid"]))
        size_ok = min(20, count) <= len(rows) <= count
        check("top.size", size_ok, "At least min(20, input nodes) unique accounts are required.")
        matches = size_ok and all(_same(row, {
            "rank": i + 1, "gid": expected[i]["gid"], "role": expected[i]["role"],
            "priority_score": expected[i]["priority_score"], "why": expected[i]["evidence"],
        }) for i, row in enumerate(rows))
        check("top.results", matches, "Ranks must be contiguous and follow calculated priority, with gid tie-breaking and explanations.")

    receipt = provenance(analysis)
    receipt_path = directory / "provenance.json"
    if receipt_path.exists():
        try:
            if receipt_path.stat().st_size > 1_000_000:
                raise ValueError("Receipt too large")
            contents["provenance.json"] = receipt_path.read_bytes()
            saved = json.loads(contents["provenance.json"].decode("utf-8"))
            if not isinstance(saved, dict):
                raise ValueError("Receipt must be an object")
            identity = all(saved.get(key) == receipt[key] for key in (
                "schema_version", "dataset_kind", "dataset_sha256", "canonical_table_sha256", "algorithm_sha256"))
            exports = saved.get("exports", [])
            files_match = isinstance(exports, list) and len(exports) == 3
            seen = set()
            for item in exports:
                if not isinstance(item, dict):
                    raise ValueError("Malformed receipt export")
                name = item.get("name")
                if name not in EXPORT_NAMES or name in seen or name not in contents or name not in parsed:
                    files_match = False
                    continue
                seen.add(name)
                raw = contents[name]
                files_match &= (item.get("sha256") == hashlib.sha256(raw).hexdigest()
                                and item.get("bytes") == len(raw) and item.get("rows") == len(parsed[name]))
            check("receipt", identity and files_match and seen == set(EXPORT_NAMES),
                  "Receipt must match this dataset, algorithm and the actual bytes of all three files.")
        except (OSError, UnicodeError, ValueError, TypeError, AttributeError):
            check("receipt", False, "Cannot verify the supplied provenance receipt.")
    else:
        checks.append({"id": "receipt", "status": "skip", "message": "Optional provenance.json is absent."})

    report = {"schema_version": 1, "valid": all(c["status"] != "fail" for c in checks),
            "dataset_kind": analysis.dataset_kind, "dataset_sha256": receipt["dataset_sha256"],
            "algorithm_sha256": receipt["algorithm_sha256"],
            "counts": {"nodes": count, "clusters": len(parsed.get("clusters.csv", [])),
                       "top_nodes": len(parsed.get("top_nodes.csv", []))}, "checks": checks,
            "interpretation": "Checks reproducible output contracts against the loaded analysis, not financial-role accuracy or data authenticity."}
    return report, contents


def validate_submission(analysis: Analysis, directory: str | Path) -> dict:
    """Validate actual files without rewriting them or returning their raw contents."""
    return _inspect_submission(analysis, directory)[0]

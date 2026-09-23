"""Compatibility entry points for receipts and portable analyst handoffs."""
from typing import Any

from .application.exports import ExportService
from .application.provenance import provenance
from .domain.models import canonical_digest as _digest


def export_content(analysis: Any, name: str) -> str:
    return ExportService(analysis).render(name).decode("utf-8")


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

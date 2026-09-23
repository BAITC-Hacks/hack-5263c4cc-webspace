"""Deterministic fallback and evidence validation."""
from decimal import Decimal


def validate_claims(answer, evidence: dict[str, dict]) -> None:
    """Validate structured facts, without claiming to verify arbitrary prose semantics."""
    if any(citation not in evidence for citation in answer.citations):
        raise ValueError("Unretrieved citation")
    for claim in answer.numeric_claims:
        if claim.evidence_id not in answer.citations:
            raise ValueError("A numeric claim must cite its source")
        value = evidence[claim.evidence_id]
        try:
            for part in claim.path:
                value = value[int(part)] if isinstance(value, list) else value[part]
        except (KeyError, IndexError, TypeError, ValueError):
            raise ValueError("Invalid evidence path") from None
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("Claim source is not numeric")
        if Decimal(str(value)) != Decimal(str(claim.value)):
            raise ValueError("Numeric claim differs from evidence")


def offline_answer(node: dict, reason: str | None = None) -> dict:
    """A factual summary, explicitly not an AI answer to arbitrary questions."""
    gid = node["gid"]
    evidence = str(node.get("evidence", "No numeric evidence available."))
    limitations = list(node.get("limitations", []))
    limitations += ["Heuristic role and priority are not proof of illegal activity.",
                    "This is a fixed local evidence summary; free-form questions require the optional AI connection."]
    if reason:
        limitations.append(reason)
    return {"answer": f"Account {gid}: {node.get('role', 'unclassified')} hypothesis. {evidence}",
            "mode": "fallback" if reason else "offline",
            "citations": [{"label": f"node:{gid}", "gid": gid, "text": evidence}],
            "limitations": list(dict.fromkeys(limitations)), "trace": []}

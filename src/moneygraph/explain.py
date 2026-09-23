"""Deterministic explanations of the very same rules used for CSV assignments."""
from copy import deepcopy

from .engine import Analysis
from .rules import evaluate_role_rules, percentiles


def explain_node(analysis: Analysis, gid: int) -> dict:
    node = analysis.node(gid)
    if node is None:
        raise KeyError(gid)
    percentile = percentiles(row["metrics"] for row in analysis._records.values())
    rules = evaluate_role_rules(node, node["metrics"], percentile("betweenness", node["metrics"]["betweenness"]))
    return {"schema_version": 1, "dataset_kind": analysis.dataset_kind,
            "gid": gid, "role": node["role"], "role_score": node["role_score"],
            "priority_score": node["priority_score"], "evidence": node["evidence"],
            "rules": [{**rule, "score": round(rule["score"], 8)} for rule in rules],
            "tie_break_order": [rule["role"] for rule in rules],
            "selection": "Highest eligible unrounded rule score; ties use the listed role order. Displayed scores are rounded to eight decimals.",
            "priority_factors": deepcopy(node["score_factors"]), "limitations": list(node["limitations"]),
            "interpretation": "Role fit and review priority are heuristics, not probabilities of wrongdoing."}


def format_explanation(report: dict) -> str:
    lines = [f"Dataset: {report['dataset_kind']}", f"Account: {report['gid']}",
             f"Role hypothesis: {report['role']} (score {report['role_score']:.8f})",
             f"Review priority: {report['priority_score']:.8f}", f"Evidence: {report['evidence']}", "", "Role rules:"]
    for rule in report["rules"]:
        state = "selected" if rule["selected"] else "eligible alternative" if rule["eligible"] else "conditions not met"
        lines.append(f"  {rule['role']}: {rule['score']:.8f} ({state})")
        for c in rule["conditions"]:
            lines.append(f"    {'PASS' if c['passed'] else 'FAIL'}: {c['field']} {c['operator']} {c['expected']}; actual={c['actual']}")
        lines.append(f"    Formula: {rule['formula']}")
    lines += ["", report["selection"], "", "Priority contributions:"]
    for f in report["priority_factors"]:
        lines.append(f"  {f['label']}: {f['contribution']:+.8f} (value={f['value']}, weight={f['weight']})")
    lines += ["", "Limitations:", *[f"  - {line}" for line in report["limitations"]], "", report["interpretation"]]
    return "\n".join(lines)

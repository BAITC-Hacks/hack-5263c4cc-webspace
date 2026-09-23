"""Explicit local investigation actions over the same bounded evidence tools.

This is deterministic question routing and rendering, not general language understanding
or semantic validation of model prose. All account selection remains application-bound.
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Callable

from ..identifiers import account_ids_for_json


ACTIONS = {
    "priority": "Explain priority",
    "patterns": "Review patterns",
    "collectors": "Find common collectors",
    "resilience": "Simulate top-five removal",
    "missing_evidence": "Plan evidence requests",
    "challenge": "Challenge the role hypothesis",
    "brief": "Prepare investigation brief",
}


def source_citation(result: dict, tool: str, gid: int, version: str | None) -> dict:
    """Hash the downloadable source after exact account-ID string serialization.

    SHA-256 covers the exact UTF-8 bytes of source_json, produced by
    json.dumps(source, default=str, allow_nan=False, sort_keys=True), with Python's
    default separators and ensure_ascii=True. Preserve this bounded string in
    downloads: browser object serialization changes float spellings such as 1.0.
    The 24,000-character ceiling applies to this exact normalized representation.
    A receipt identifies retrieved content; it does not validate prose entailment.
    """
    source = account_ids_for_json(result)
    encoded = json.dumps(source, default=str, allow_nan=False, sort_keys=True)
    if len(encoded) > 24000:
        raise ValueError("Evidence source exceeds the bounded snapshot limit.")
    evidence_id = result["evidence_id"]
    return {"label": evidence_id, "gid": gid, "text": f"Retrieved by {tool}",
            "kind": evidence_id.split(":", 1)[0], "evidence_version": version,
            "payload_sha256": hashlib.sha256(encoded.encode()).hexdigest(),
            "source": source, "source_json": encoded}


def recognize_action(question: str) -> str | None:
    text = " ".join(question.casefold().split())
    # Exact slash presets are unambiguous; trailing instructions do not become arguments.
    aliases = {"plan": "missing_evidence", "missing-evidence": "missing_evidence"}
    if text.startswith("/"):
        action = aliases.get(text[1:], text[1:])
        return action if action in ACTIONS else None
    # These recognizable requests select a fixed local action, never a new tool scope.
    rules = (
        ("collectors", r"\b(collectors?|collects money|receives reachable flows|receives money from)\b"),
        ("resilience", r"\b(resilience|remov\w*|structural simulation)\b"),
        ("missing_evidence", r"\b(missing|request next|next steps?|next requests?|investigation plan|evidence requests?)\b"),
        ("challenge", r"\b(challenge|alternative explanations?|final beneficiar\w*|prove inactivity)\b"),
        ("patterns", r"\b(patterns?|routes?|cycles?|return flows?|spikes?|same funds)\b"),
        ("brief", r"\b(brief|dossier|summari[sz]e|summary|observed activity|explain this account|explain this entity)\b"),
        ("priority", r"\b(priority|score|ranking|ranked|rank)\b"),
    )
    return next((action for action, pattern in rules if re.search(pattern, text)), None)


def _amount(value) -> str:
    return f"{value:,.2f} KZT"


def _path(values) -> str:
    return " → ".join(map(str, values))


def local_workflow(question: str, read: Callable[[str], dict]) -> dict | None:
    """Return a labeled deterministic answer, or None for an unrecognized question.

    Each recognized action uses one fixed read, except challenge (two). `read`
    owns evidence authorization, source receipts, runtime budgets and tracing.
    """
    action = recognize_action(question)
    if action is None:
        return None
    lines: list[str] = []
    limitations = ["This is a deterministic local workflow, not a free-form AI interpretation.",
                   "Heuristic role and priority are not probabilities or proof of illegal activity."]
    if action == "priority":
        node = read("inspect_selected_node")["data"]
        lines = [f"Account {node['gid']} has heuristic review priority **{node['priority_score']:.4f}**.",
                 "\nContributions to that score:"]
        lines += [f"- {factor['label']}: {factor['contribution']:+.4f}." for factor in node["score_factors"]]
        lines.append(f"\nRole hypothesis: **{node['role']}**, with heuristic fit {node['role_score']:.4f}. Role fit and review priority measure different things.")
        limitations += node.get("limitations", [])
    elif action == "patterns":
        data = read("inspect_patterns")["data"]
        temporal = data["temporal"]
        lines = [f"Account {data['gid']} — bounded pattern review.",
                 f"\nReturned examples: {len(data['routes'])} recurring routes, {len(data['cycles'])} return cycles, "
                 f"{len(temporal['spikes'])} daily spikes, {len(temporal['synchronized_inflows'])} multi-payer dates and {len(data['anomalies'])} anomaly signals."]
        for route in data["routes"][:2]:
            example = route["occurrences"][0]
            lines.append(f"- {_path(route['path'])}: {route['occurrence_count']} dated occurrences; one pairs {example['in_date']} ({_amount(example['in_kzt'])}) with {example['out_date']} ({_amount(example['out_kzt'])}).")
        for cycle in data["cycles"][:1]:
            kind = "a strictly increasing-date example exists" if cycle["chronological_example"] else "structural only; no strictly increasing-date example found"
            lines.append(f"- Return route {_path(cycle['path'])}: {kind}.")
        for spike in temporal["spikes"][:1]:
            lines.append(f"- {spike['date']}: {_amount(spike['total_kzt'])} visible activity, {spike['ratio']:.2f}× the active-day median.")
        for anomaly in data["anomalies"][:1]:
            lines.append(f"- {anomaly['evidence']}")
        lines.append("\nThese are bounded examples. An empty category does not establish that the pattern is absent; dates and paths do not identify the same funds.")
        limitations += data["caveats"] + [data["agent_context_note"], temporal["caveat"]]
    elif action == "collectors":
        data = read("find_common_collectors")["data"]
        lines = [f"Selected accounts: {', '.join(map(str, data['gids']))}. "
                 f"{data['total']} account(s) are reachable from every selected account within {data['max_hops']} directed hops."]
        for item in data["items"][:3]:
            paths = "; ".join(_path(path["path"]) for path in item["paths"])
            lines.append(f"- Account {item['gid']}: {paths}.")
        if not data["items"]:
            lines.append("No common candidate was found within this directed hop limit.")
        lines.append(f"\nShowing {min(3, len(data['items']))} candidate(s) here; the attached source contains {len(data['items'])}. Reachability is not attribution of the same funds or proof of a final beneficiary.")
        limitations += [data["caveat"], data["agent_context_note"]]
    elif action == "resilience":
        data = read("simulate_top_removal")["data"]
        lines = [f"Structural simulation: remove the top {data['top_n']} priority accounts: {', '.join(map(str, data['removed_gids']))}."]
        for key, label in (("nodes", "Accounts"), ("edges", "Directed edges"), ("weak_components", "Weak components"),
                           ("largest_component_nodes", "Accounts in largest weak component"), ("reachable_seed_pairs", "Reachable seed–account pairs within four hops")):
            lines.append(f"- {label}: {data['baseline'][key]} → {data['after'][key]}.")
        lines.append("\nThis is structural sensitivity, not a recommendation to block accounts or a forecast of intervention effects. Removed seeds also affect reachability.")
        limitations.append(data["caveat"])
    elif action == "missing_evidence":
        data = read("inspect_missing_evidence")["data"]
        lines = [f"Account {data['gid']} — next evidence requests, in documented priority order."]
        lines += [f"{index}. {item['request']} {item['reason']}" for index, item in enumerate(data["next_requests"][:3], 1)]
        lines.append("\nMissing evidence: " + " ".join(data["missing_evidence"][:2]))
        limitations += data["missing_evidence"]
    elif action == "challenge":
        node = read("inspect_selected_node")["data"]
        data = read("inspect_missing_evidence")["data"]
        lines = [f"Account {node['gid']} — challenge the **{node['role']}** role hypothesis.",
                 f"\nObserved support: {node['evidence']}",
                 "\nWhat this does not establish: ownership, intent, an illegal purpose or the identity of onward funds.",
                 " ".join(data["missing_evidence"][:2]),
                 "\nA legitimate payment purpose remains untested; the sample contains no customer purpose or ownership evidence.",
                 f"\nNext check: {data['next_requests'][0]['request']}"]
        limitations += node.get("limitations", []) + data["missing_evidence"]
    else:
        data = read("inspect_investigation_brief")["data"]
        gid = data["observations"]["gid"]
        lines = [f"Account {gid} — local investigation brief.", "\nObserved evidence:"]
        lines += [f"- {item}" for item in data["evidence"][:3]]
        lines += ["\nHypothesis: " + data["hypotheses"][0], "\nNext evidence requests:"]
        lines += [f"- {item['request']}" for item in data["next_requests"][:2]]
        limitations += data["limitations"] + data["missing_evidence"]
    return {"answer": "\n".join(lines), "mode": "offline",
            "limitations": list(dict.fromkeys(limitations)),
            "local_workflow": {"action": action, "action_label": ACTIONS[action], "recognized": True}}

"""Fixed-scope read tools; no provider or conversation state is available here."""
import json
from copy import deepcopy
from typing import Any

from ..application.evidence import EvidenceService

def evidence_tool(name: str, arguments: str, engine: Any, gid: int, gids: list[int] | None = None, *, signals: Any = None) -> dict:
    evidence = engine if isinstance(engine, EvidenceService) else EvidenceService(engine, signals)
    result = _read_tool(name, arguments, evidence, gid, gids)
    return evidence.envelope(result["evidence_id"], result["data"], coverage=result.get("coverage"))


def _read_tool(name: str, arguments: str, engine: Any, gid: int, gids: list[int] | None = None) -> dict:
    """Selection is bound in application code; model cannot broaden its authority."""
    if json.loads(arguments) != {}:
        raise ValueError("Tool arguments must be empty; account scope is fixed.")
    node = engine.node(gid)
    if node is None:
        raise ValueError("Selected account is unavailable.")
    if name == "inspect_selected_node":
        # Only defined evidence fields are forwarded, not arbitrary imported columns.
        fields = ("gid", "role", "role_score", "priority_score", "cluster_id", "depth",
                  "is_seed", "evidence", "in_degree", "out_degree", "in_kzt", "out_kzt",
                  "metrics", "score_factors", "reasons", "limitations", "daily_flows", "timeline")
        payload = {k: node[k] for k in fields if k in node}
        omitted = {}
        for key, value in payload.items():
            if isinstance(value, list):
                if len(value) > 31:
                    omitted[key] = len(value) - 31
                payload[key] = value[:31]
        return {"evidence_id": f"node:{gid}", "data": payload,
                "coverage": {"truncated": bool(omitted), "omitted_items": omitted}}
    if name == "inspect_neighborhood":
        graph = engine.graph(gid=gid, hops=1, limit=35)
        edges = graph.get("edges", [])
        return {"evidence_id": f"graph:{gid}", "data": {
            "nodes": graph.get("nodes", [])[:35], "edges": edges[:60],
            "truncated": bool(graph.get("truncated") or len(edges) > 60),
            "note": "This is a bounded visible neighborhood, not a complete banking network."}}
    if name == "inspect_cluster":
        cluster_id = node.get("cluster_id")
        found = next((c for c in engine.clusters().get("items", [])
                      if c["cluster_id"] == cluster_id), None)
        return {"evidence_id": f"cluster:{cluster_id}", "data": found}
    if name in {"inspect_patterns", "find_common_collectors", "simulate_top_removal", "inspect_missing_evidence", "inspect_investigation_brief"}:
        if name == "inspect_investigation_brief":
            dossier = engine.dossier(gid)
            patterns = engine.patterns(gid)
            fields = ("gid", "depth", "is_seed", "role", "role_score", "priority_score",
                      "cluster_id", "in_degree", "out_degree", "in_kzt", "out_kzt", "score_factors")
            return {"evidence_id": f"brief:{gid}", "data": {
                "observations": {key: node[key] for key in fields if key in node},
                "evidence": dossier["evidence"], "hypotheses": dossier["hypotheses"],
                "missing_evidence": dossier["missing_evidence"], "next_requests": dossier["next_requests"],
                "signal_examples": {
                    "spikes": patterns["temporal"]["spikes"][:3],
                    "same_day_payers": patterns["temporal"]["synchronized_inflows"][:3],
                    "routes": [{"path": route["path"], "occurrences": route["occurrences"][:2],
                                "occurrence_count": route["occurrence_count"]} for route in patterns["routes"][:2]],
                    "cycles": patterns["cycles"][:2], "anomalies": patterns["anomalies"][:3]},
                "coverage": {"search_limits": patterns["limits"],
                             "returned_examples": "At most 3 spike/payer/anomaly examples and 2 routes/cycles; routes include 2 dated occurrences. This brief is not an exhaustive search."},
                "limitations": list(node.get("limitations", [])) + patterns["caveats"],
            }}
        if name == "inspect_patterns":
            payload = deepcopy(engine.patterns(gid))
            # Bound agent context independently of the interactive evidence viewer.
            payload = {**payload, "routes": payload.get("routes", [])[:4],
                       "cycles": payload.get("cycles", [])[:4],
                       "agent_context_note": "Agent receives at most four route and four cycle examples; use the signals panel for the full bounded result."}
            for route in payload["routes"]:
                route["occurrences"] = route.get("occurrences", [])[:3]
            payload["anomalies"] = payload.get("anomalies", [])[:6]
            temporal = payload.get("temporal", {})
            for key in ("spikes", "synchronized_inflows"):
                temporal[key] = temporal.get(key, [])[:8]
            payload["agent_context_note"] += " At most six anomalies and eight dates per temporal signal are included."
            return {"evidence_id": f"patterns:{gid}", "data": payload}
        if name == "find_common_collectors":
            cohort = gids or [gid]
            payload = engine.collectors(cohort)
            payload = {**payload, "items": payload.get("items", [])[:8],
                       "truncated": bool(payload.get("truncated") or len(payload.get("items", [])) > 8),
                       "agent_context_note": "At most eight collector candidates are included."}
            return {"evidence_id": "collectors:" + ",".join(map(str, cohort)), "data": payload}
        if name == "simulate_top_removal":
            return {"evidence_id": "resilience:5", "data": engine.resilience(5)}
        return {"evidence_id": f"dossier:{gid}", "data": engine.dossier(gid)}
    raise ValueError("Unknown tool.")

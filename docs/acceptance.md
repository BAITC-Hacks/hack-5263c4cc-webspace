# Acceptance and evaluation plan

Source: [Freedom Finance brief](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/edit), downloaded and inspected on 23 September 2026.

| Requirement | Implementation proof |
|---|---|
| All accounts have an explainable role | CSV coverage equals input nodes; isolates preserved; evidence nonempty and at most 200 characters |
| Directed flows and visible depth limits | Arrowheads and depth styling; boundary_unknown is explicit; no inferred final beneficiary at depth four |
| Meaningful grouping | Reproducible community assignments; cluster size, seed count, internal KZT sum and representative nodes |
| Priority shortlist | Deterministic sorted ranking, at least 20 entries for the official data, concrete numeric reasons |
| Required CSV files | nodes_roles.csv, clusters.csv, top_nodes.csv; exact official columns |
| Interactive investigation | ID search, role filter, selected account details, directed bounded neighborhood, observed daily transfers |
| Runtime under five minutes | Measure supplied-data CLI analysis including exports; report machine/runtime and input sizes |
| Clean launch | Locked dependencies and one startup script; synthetic mode requires no organizer data or API account |
| README and architecture | Setup, data path, algorithm thresholds, limitations, diagram, scaling decisions and demo plan |
| Optional AI adds value safely | Eight bounded read tools, scoped expiring conversation context, visible trace and evidence receipts; local fallback; no model changes to roles or financial records |

## What this evidence cannot establish

Completeness of the CSVs and deterministic behavior do not establish role accuracy. No ground-truth role or laundering labels are provided. Communities are graph partitions, not proven criminal organizations. Priorities are human-review hypotheses. Daily overlapping flow is not traced ownership of identical funds. A four-hop outgoing crawl omits upstream relationships, below-threshold transfers, external banks and activity outside July 2026.

## Proposed comparative experiment

Compare the implemented priority ranking against amount-only and degree-only baselines. Ask a domain reviewer to blind-review the same twenty accounts from each ranking using the same evidence. Record usefulness, false certainty, and time to verify. Until that review is performed, no precision, recall, AUC or detection-rate claim is valid. Synthetic motif tests establish algorithm behavior, not deployment accuracy.

## Five-minute demo

1. Open the supplied dataset and point out the 81 seeds, full node coverage, observation period and measured pipeline runtime.
2. Select a top account. Trace incoming/outgoing edges and show the exact metrics supporting its role and priority.
3. Show a daily flow pattern, distinguishing date-level overlap from intraday ordering or proven fund tracing.
4. Select a depth-four account and an isolated seed. Explain why missing outgoing edges do not prove a terminal beneficiary.
5. Ask the copilot a narrow question, inspect its tool trace and citations. Show the offline evidence mode remains usable.
6. Download all three CSVs. Finish with known limitations and the staged plan for one million nodes.

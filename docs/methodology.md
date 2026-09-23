# Money Graph methodology

Version 1.0, 23 September 2026. All assignments describe visible transaction structure. Role fit and investigation priority are heuristics in [0, 1], not probabilities of wrongdoing. There are no labeled roles or claimed detection accuracy. Required CSVs never contain model-written assignments.

## Input and observability

The engine validates the three Parquet schemas, unique node IDs, positive finite amounts, endpoints, and exact edge/transaction aggregation (0.01 KZT absolute tolerance). Every supplied node is inserted before edges, preserving isolated seeds. Dates have daily precision. The directed graph contains only visible outgoing transfers in the supplied collection window; off-sample inflows, interbank transfers, and transfers below 5,000 KZT are absent. No observed net flow is called a balance.

A node with depth >= 4 and zero visible outgoing edges is an observation boundary. Its role is `boundary_unknown`, an explicitly documented extension of the required vocabulary. A shallower observed sink may receive `terminal`, but this means an observed sink only, not a proven ultimate beneficiary. Seed inflows are incomplete, so seed nodes cannot receive the transit, terminal, or coordinator role from these rules.

## Deterministic metrics and communities

Nodes and edges are sorted before analysis. In/out degree counts distinct counterparties; sums and counts use the supplied edge aggregates. PageRank uses `sum_kzt`. Directed unweighted betweenness samples min(128, N) sources with random seed 42. Upstream seed reach counts distinct seeds with a directed path of at most four edges, excluding the seed itself.

Communities use Louvain with seed 42 on an undirected projection weighted by the sum of both directed amounts. Community IDs are assigned by descending size and then minimum gid. Every isolated node is retained. Community membership is a structural hypothesis, not proof of shared ownership or affiliation. Cluster turnover sums directed internal edge amounts once per edge.

Two-day overlap processes daily incoming amounts in FIFO order. Outgoing amounts consume the available visible incoming pool from the same day or previous two days; each unit is consumed at most once. The ratio is matched amount divided by visible outgoing amount. This is a temporal overlap statistic; same-day ordering and the identity of funds are not known.

## Exact role rules

All scores start at zero except `peripheral` at 0.2. An observation boundary receives `boundary_unknown` = 1 and skips other role rules. Otherwise the following candidates are calculated. The highest score wins. Exact ties use this fixed order: consolidator, transit, distributor, terminal, coordinator, peripheral, boundary_unknown.

| Role | Eligibility | Role-fit score |
|---|---|---|
| consolidator | At least 3 distinct incoming payers | min(0.95, 0.55 + 0.35 × min(in_degree / 12, 1) + 0.05 × min(seed_reach / 4, 1)) |
| transit | Not a seed; outgoing edge exists; visible out/in ratio r is between 0.65 and 1.35 inclusive | 0.55 + 0.2 × (1 − abs(1 − r) / 0.35) + 0.2 × two-day overlap |
| distributor | At least 8 distinct outgoing recipients | min(0.95, 0.65 + 0.3 × min(out_degree / 60, 1)) |
| terminal | Not a seed or observation boundary; incoming edge exists; no outgoing edge | min(0.75, 0.5 + 0.05 × in_degree) |
| coordinator | Not a seed; at least 2 incoming payers, 2 outgoing recipients, 2 neighboring communities, and 2 reachable seeds; positive betweenness at or above its 90th percentile | min(0.9, 0.55 + 0.2 × betweenness_percentile + 0.15 × min(seed_reach / 8, 1)) |
| peripheral | No stronger rule wins | 0.2 |
| boundary_unknown | depth >= 4 and no outgoing edge | 1.0; expresses certainty about observation cutoff, not financial purpose |

Thresholds are transparent prototype choices, not learned or calibrated cutoffs. Role candidates and all underlying metrics remain visible for arbitrary-node explanations. A transit ratio above one is possible under incomplete collection and is never interpreted as creating money.

## Exact priority rule

The unadjusted score is the sum of six components:

| Component | Weight | Normalization |
|---|---:|---|
| Weighted PageRank | 0.20 | Empirical percentile |
| Directed betweenness | 0.20 | Empirical percentile |
| Distinct upstream seeds | 0.20 | min(seed_reach / 8, 1) |
| Distinct incoming payers | 0.15 | min(in_degree / 12, 1) |
| Visible in + out volume | 0.15 | Empirical percentile |
| Two-day overlap | 0.10 | Overlap ratio; zero for seeds |

Empirical percentile is the fraction of all nodes at or below the value; values <= 0 receive zero. Boundary priority is multiplied by 0.65 and isolated-node priority is zero. These adjustments are shown as separate score contributions. Ranking sorts descending priority, breaking ties by ascending gid. The exported evidence is nonempty, numerical and at most 200 characters.

## Optional signals: separate from role assignment

Optional signals are deterministic investigation aids. They do not modify required roles or priorities. Signal absence under bounded search is not evidence that a pattern does not exist. No signal proves ownership, coordination, criminal intent, or that the same funds moved along a route.

- **Daily spikes:** an active day's incoming plus outgoing amount is at least three times the median active-day volume; at least three active days and a positive baseline are required. Zero-activity days are excluded, explicitly limiting the interpretation.
- **Same-day multiple payers:** at least three distinct observed payers send to the selected node on one date. The data cannot establish intraday synchronization.
- **Recurring routes:** selected node is the middle account in A → B → C, with distinct A, B and C. Each route requires at least two distinct incoming dates paired to separate outgoing dates one or two days later. Amounts and dates are retained; neither equal amounts nor fund identity is assumed. Search and returned examples are bounded.
- **Return flows:** enumerate simple directed cycles of length two through four containing the selected node. Each edge includes its observed dates. A strictly increasing-date example supports a date-consistent return route; otherwise the cycle remains structural only. Same-day order is unresolved. Amount reuse is never inferred.
- **Depth-peer anomalies:** compare visible volume, incoming degree and outgoing degree against nodes at the same depth. At least ten peers, positive value, an upper empirical percentile >= 0.95 and value >= three times a positive median are required. For a zero median, require at least three units for degree or three positive peer medians for volume. The displayed statistic is a descriptive percentile, not calibrated anomaly probability.
- **Repeated amounts:** at least three equal-amount transfers involving at least two counterparties on one date, in one direction. Amounts are compared at cent precision. This is a repeated-payment motif; it cannot detect the transfers below the 5,000 KZT collection threshold and is not proof of deliberate splitting.
- **Resilience:** remove the top-N priority accounts, N between 1 and 20. Compare node/edge counts, weak components, largest weak component and directed reachability from remaining seeds up to four hops. This is structural sensitivity, not a forecast of what operational intervention will do.
- **Common collectors:** for one to five selected accounts, find other accounts reachable from all of them by directed paths of at most three edges. Return bounded shortest-path evidence. Reachability shows observed connectivity, not fund attribution.
- **Dossier and missing evidence:** assemble facts, role/flow hypotheses, missing information and prioritized next requests from the selected account's observed metrics and boundaries. Generated dossiers contain no invented customer attributes.

The bounded AI assistant may summarize these validated signals and follow fixed evidence tools. It does not execute code, access arbitrary files or URLs, or change the deterministic scoring. Its tool budgets and provider boundary are specified in [architecture.md](architecture.md).

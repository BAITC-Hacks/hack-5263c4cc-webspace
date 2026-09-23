# Freedom Finance criteria coverage

Source: [official Money Graph brief](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/edit), inspected 23 September 2026. This matrix distinguishes implemented behavior from evidence still requiring a live judge demonstration. A feature being present does not establish real-world detection accuracy.

## Five mandatory features

| Official criterion | Implemented behavior | Verification / demonstration |
|---|---|---|
| 1. Reproducible pipeline; three CSVs in under five minutes | CLI loads the three Parquet files, validates aggregation, analyzes the graph and writes all required CSVs in one command | `moneygraph export --data /path/to/data --out outputs`; engine/API tests verify exact schemas. Supplied-data runtime is reported in the README; reproduce on the judge's machine |
| 2. A role, score and explanation for all 2,248 nodes | All input nodes enter the graph before edges. Each receives a vocabulary role or documented `boundary_unknown`, bounded scores and nonempty numerical evidence <= 200 characters | `test_isolated_seeds_are_present_in_all_views_and_clusters`; `test_exports_schema_coverage_order_and_determinism`; official input/export row-count check |
| 3. Documented, explainable role criteria | Exact thresholds, score formulas, tie-breaking and limitations in [methodology.md](methodology.md); selected-node view returns all candidate role scores and priority contributions | Judge selects three arbitrary gids; show rule eligibility, role score, priority factors and observation limits within one minute |
| 4. Network clustering | Deterministic weighted Louvain projection; every node assigned; cluster size, seed count, internal turnover, representative accounts and hypothesis exported | All cluster memberships cover all supplied nodes, including isolates; `/api/clusters`; exact `clusters.csv` contract |
| 5. Ranked list and visualization | At least twenty priority accounts on the official dataset; directed bounded graph, role styling, account search, role filter, cluster selection and numerical account evidence | `/api/nodes`, `/api/graph`, CSV download and live UI selection. Graph bounds are explicit; missing off-view nodes are not called absent |

The required files are `nodes_roles.csv`, `clusters.csv` and `top_nodes.csv`, with no extra columns in their contracts. The command may additionally produce a reproducibility receipt; that receipt does not replace a required export.

## All eight optional features

| Official optional criterion | Implemented coverage | Exact limits and checks |
|---|---|---|
| 1. Graph-cutoff artifact | Depth >= 4 plus no visible outflow becomes `boundary_unknown`; uncertainty is shown in role, priority adjustment, graph detail and dossier | Boundary never becomes terminal. Shallower sinks remain observed sinks, not proven beneficiaries. `test_boundary_never_becomes_terminal_and_seed_ratio_does_not_imply_transit` |
| 2. Temporal patterns | FIFO overlap within zero to two days; daily spikes; dates with at least three distinct incoming payers | Daily granularity cannot establish intraday synchronization or trace identical funds. Spike baseline needs at least three active dates. `test_daily_spikes_and_same_day_payers_do_not_claim_intraday_order` |
| 3. Repeated routes and return flows | Recurring A→B→C routes through the selected node require at least two distinct dated occurrences with one-to-two-day lags. Simple directed cycles of two to four edges include edge/date proof and, when available, strictly increasing-date examples | Twenty routes and twelve cycle examples maximum; search truncation disclosed. Same-day or reverse-order cycles remain structural. `test_recurring_routes_require_separate_dates_and_preserve_proof`; `test_return_cycle_requires_strictly_ordered_dates_for_temporal_claim` |
| 4. Anomaly detection | Same-depth descriptive outliers in visible volume and distinct payer/recipient counts; same-day repeated equal amounts with multiple counterparties | Transparent rules, minimum peer cohort of ten, degenerate baseline handling. Repeated payments are review motifs; below-5,000 KZT splitting is invisible and never claimed detected. `test_depth_peer_anomaly_handles_zero_heavy_cohorts_without_nan`; `test_repeated_amount_motif_never_claims_invisible_below_threshold_splitting` |
| 5. Network resilience | Remove top one to twenty priority nodes; compare weak components, largest component, node/edge counts and seed-to-node reach within four directed hops | Structural sensitivity only; removed seeds affect reach counts. Original graph and submitted rankings stay unchanged. `test_resilience_is_deterministic_and_does_not_mutate_the_graph` |
| 6. Analyst AI assistant | Bounded read-only evidence tools, grounded structured response with validated citation IDs, visible tool trace, optional provider, safe local fallback; one-to-five-account common-collector evidence supports the brief's cohort question | Models cannot write CSV roles, execute arbitrary SQL/shell/network/files, or broaden the selected scope. The local summary is labeled as such and is not claimed to answer arbitrary natural-language questions. `tests/test_copilot.py`; `test_common_collectors_are_directed_bounded_and_proven_by_paths` |
| 7. Generated account card | Deterministic dossier separates evidence, hypotheses, missing information and next requests; available as JSON and a portable Markdown download | No model subscription required. Contains account role, visible flows, connections, temporal signals and evidence receipt. `test_boundary_dossier_prioritizes_missing_outgoing_collection`; `test_signal_api_contract_bounds_and_provenance_download` |
| 8. Completeness assessment | Node-specific boundary/seed/isolate caveats, blind spots and prioritized requests for complete statements, timing/purpose, longer period and collection extension | No invented customer attributes or false completeness percentage. Boundary accounts prioritize deeper authorized collection. Dossier tests verify this behavior |

## Additional differentiators

| Feature | Analyst value | Evidence and limits |
|---|---|---|
| Reproducibility receipt | Bind a review to canonical input evidence, algorithm code and exact exported bytes | `/api/provenance`; SHA-256 equality tests. A digest identifies content; it does not authenticate the source or validate conclusions |
| Visible score decomposition | Explain why an account outranks another without an opaque risk label | Contributions sum to the final priority, including explicit boundary and isolate adjustments |
| Portable evidence dossier | Hand off facts, testable hypotheses and concrete missing-data requests | Downloaded Markdown can accompany the exact CSV bundle; generated private artifacts remain ignored by Git |
| Cohort-to-collector paths | Answer “who receives money from these accounts?” with traversable proof | All selected accounts must reach a candidate within the bounded directed path limit; twenty candidate maximum; reachability is not fund attribution |
| Safe degraded mode | Continue investigation without network, paid models or API credentials | Deterministic pipeline, graph, optional signals, exports and dossiers all work locally; provider failure returns labeled local evidence |

## Scoring rubric and remaining human verification

The brief weights task fit/workability 25, technical implementation 25, README/reproducibility 25, practical value 15, and development potential/originality 10. Documentation, exact export contracts and a clean launch deserve the same attention as model sophistication.

Automated tests verify numerical behavior, bounds, reproducibility and failure handling. They do not replace the live five-minute demo, the judge's clean-machine run, or domain review of suggested roles. There are no ground-truth labels; precision, recall, AUC and “probability of crime” must not be reported. Scale-to-one-million changes are an architectural plan in [architecture.md](architecture.md), not a measured production capability.

# Freedom Finance final track audit

Audit date: 23 September 2026. Initial implementation snapshot: `ea2e149`; the account-identifier correction below was made during this audit. Scope is the Freedom Finance track only. This review inspected original organizer material, implementation, tests, and the supplied data using aggregate-only output. No organizer account identifiers, records, credentials, or generated exports are reproduced here.

The deterministic pipeline meets the required row coverage, CSV schemas, boundary handling, and local runtime checks. **The audit also found a critical browser defect that synthetic-only checks had missed: all 2,248 supplied account identifiers exceed JavaScript's exact integer range.** HTTP and frontend string-ID corrections are now implemented. The coordinating agent verified supplied-data queue-to-account graph selection in the browser, with six nodes displayed and no rounded-ID 404. A later integrated gate passed 263 backend tests, 10 client tests and generated-contract checks. Final production and browser recovery checks are recorded separately in the release verification.

This is a compliance assessment, not a score prediction. A completed field, passing unit test, or implemented optional feature does not establish the financial correctness of a role or guarantee organizer acceptance.

## Original sources and interpretation

The authoritative track source is the [original Money Graph brief](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/edit). The local original text is `exa-results/hackathon-2026-09-23/materials/02-finance-1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o.txt`, abbreviated **Brief** below. Its English version starts at line 471; requirements are cited by section and local line numbers. The Russian and Kazakh versions precede it. Downloaded originals stay ignored rather than being redistributed in the submission repository.

| Source | Exact location inspected | Relevant requirement, paraphrased |
|---|---|---|
| Brief | §5, lines 503–559 | Three fixed-schema CSVs; a directed network screen with role/community distinction and gid search; recalculation within five minutes. |
| Brief | §6, lines 560–602 | Three Parquet tables; int64 account IDs; outgoing four-hop collection, minimum amount, incomplete seed inflows, isolated seeds, no customer attributes or labeled roles. |
| Brief | §7, lines 603–622 | Five mandatory capabilities, including explaining three arbitrary accounts within one minute and locating a named account and its links on the map. |
| Brief | §8, lines 623–632 | Eight optional categories; they add value but do not replace mandatory completeness. |
| Brief | §9, lines 633–655 | Computed rather than hardcoded answers, explainable rules, no invented attributes, local reproduction, careful hypotheses, and a million-node scale plan. |
| Brief | §10, lines 656–674 | Pipeline/interface source, one-command README, three exports, a solution diagram, and a five-minute live demonstration of two or three accounts. |
| Dataset README | `materials/02-finance-1ro-SiY042jv7De0h7tXBDyY8ZKdHz_US.md`, lines 32–60 | `gid`, `src`, and `dst` are int64 identifiers; exact node, edge, and transaction fields are specified. |
| Organizer starter | `extracted/02-finance-1EnMGG22jSH7Mvgt396kKRi3bjAobsomN/starter/README.md`; `starter.py:28` | Confirms the export baseline and six required role names. The brief explicitly permits documented role extensions. |
| [Event regulations](https://edu.astanahub.com/hackathons/df4743f5-c492-415c-b45a-1f13adb78e06?tab=tracks) | `official-regulations-ru.txt`, §§5.4.4–5.4.6, 5.4.15–5.4.16, 5.6.3–5.6.6 | Disclose reused components; provide independent setup/launch/check instructions; key functionality must be verifiable without participants' personal accounts or subscriptions. |

The existing [methodology](../methodology.md), [architecture](../architecture.md), [criteria matrix](../criteria-matrix.md), [acceptance plan](../acceptance.md), and [requirements source audit](readme-track-requirements.md) were read as implementation claims and context. They were not treated as substitutes for code or execution evidence.

## Mandatory capabilities

Statuses: **implemented and exercised** means this audit executed relevant behavior; **implemented, demonstration pending** means supporting code exists but the organizer's human check is outstanding; **partial** means the formal output exists while an important part of the intended behavior is weak or unresolved.

| Mandatory criterion | Audit status | Implementation and verification | Remaining acceptance boundary |
|---|---|---|---|
| One run from raw Parquet to three exports within five minutes. Brief §7.1, lines 608–610. | Implemented and exercised | [`load_analysis`](../../src/moneygraph/engine.py), [`Analysis.exports`](../../src/moneygraph/engine.py), and the [`CLI`](../../src/moneygraph/__main__.py) read all files, validate them, compute outputs, and write exact contracts. Fresh-process supplied-data CLI: **0.8234 seconds** on this host with dependencies installed. | A freshly provisioned judge machine was not used. Dependency installation is outside this timing. The supplementary receipt is a fourth artifact, not a change to any required CSV. |
| All 2,248 accounts have a role, score, and nonempty evidence. Brief §7.2, lines 611–613. | Implemented and exercised | Nodes are inserted before edges in `Analysis.__init__`; supplied-data export contains exactly all 2,248 IDs. All fields are filled, scores are in range, longest evidence is 105 characters. Tests cover isolates and boundaries. | This verifies coverage and rule application, not label accuracy. |
| Every role has an explainable rule or threshold; three arbitrary gids explained within one minute. Brief §7.3, lines 614–616. | Rules implemented; human demonstration pending | `Analysis._analyze`, `_evidence`, and [methodology](../methodology.md) specify eligibility, fit scores, tie order, priority decomposition, and caveats. The inspector now includes candidate scores, eligibility, boundary skips, and tie order under “Compare role rules.” | The initial omission of competing role scores was corrected. The one-minute check still needs rehearsal on arbitrary supplied accounts; a rendered rule table is not proof of human demo timing. |
| Groups with size, seeds, turnover, hypothesis, and complete membership. Brief §7.4, lines 617–619; §5, line 556. | Implemented and exercised | `_find_clusters` uses sorted, weighted Louvain with seed 42, retains isolates, and assigns stable IDs. `_cluster_summaries` produces 91 populated rows. Membership totals equal 2,248. | The initial generic hypothesis template was replaced with quantified collection, distribution, routing, boundary, receiving, mixed, or isolate hypotheses. Synthetic motif tests verify meaningful differences. These are observed-pattern hypotheses, not established shared purpose. |
| At least 20 ranked nodes with rationale and a directed searchable map. Brief §7.5, lines 620–622. | Implemented; supplied-data selection smoke passed | `top_nodes.csv` has 100 sorted rows; its `why` now explains the strongest priority contributions and any boundary adjustment. [`NetworkGraph`](../../web/src/NetworkGraph.tsx) supports arrows, role/community colors, bounded expansion, and transfer details. | The original numeric browser-ID contract corrupted every organizer ID. Backend regression tests and the coordinating agent's supplied-data browser smoke now pass. The full live judge demonstration remains external. |

## Account identifier blocker and correction

**Original failure.** The dataset contract uses int64. `Account.gid`, graph endpoints, selected account state, cohorts, and citation navigation were represented as JavaScript `number`. The initial `jumpToEntity` additionally rejected IDs failing `Number.isSafeInteger`. Direct supplied-data checks found:

- 2,248 of 2,248 account identifiers exceed the safe integer range.
- All 2,248 change value after conversion through a JavaScript-compatible double; each rounded value is absent from the actual graph.
- All 20 default top-list identifiers are affected.
- An original identifier returned HTTP 200 from the node endpoint; its rounded equivalent returned 404.

Thus passing synthetic browser checks and backend CSV tests did not establish the required supplied-data map workflow. This affected node selection, links, signal navigation, cohorts, and assistant scope. It did not corrupt Python analysis or required CSV identifiers.

**HTTP correction.** [`identifiers.py`](../../src/moneygraph/identifiers.py) defines a central `AccountJSONResponse`, configured as FastAPI's default response class. It copies account identifiers to canonical decimal strings when rendering JSON; engine structures and CSV output remain integer-based. Numeric measures, ranks, depths, counts, and community IDs remain numeric. The serializer covers these identifier fields recursively:

- Scalar fields: `gid`, `src`, `dst`, `root_gid`, `source_gid`, `route_center_gid`, `selected_gid`.
- Identifier lists: `gids`, `top_gids`, `removed_gids`, `payers`, `path`, integer-valued `counterparties`, `selected_cohort`.
- Existing graph `id`, `source`, and `target` strings remain strings; nested citation objects use the same conversion.

[`CopilotRequest` and `SessionCreateRequest`](../../src/moneygraph/agent/contracts.py) accept canonical nonnegative decimal strings, normalize them to exact int64 integers before scope validation, and retain support for exact integer clients. Booleans, floats, signs, whitespace, leading zeroes, exponent syntax, overflow, and duplicate IDs after normalization are rejected. Response error text remains private.

[`test_identifier_transport.py`](../../tests/test_identifier_transport.py) uses original synthetic identifiers above 2^60 to prove exact list/search/detail/graph selection, nested routes/cycles, payers, collector paths, community representatives, removal IDs, dossiers, session creation, and citation navigation. It also proves that CSV identifiers and engine rows are unchanged and that metrics stay numeric. The accompanying API/signal expectations were updated to the new HTTP contract.

The supplied-data API was rechecked after the correction: all **2,248 returned IDs exactly match the original identifiers as strings**; selected-node and selected-graph requests return 200; the engine export still contains integers. The matching frontend build and nine frontend tests passed, and the coordinating agent verified exact supplied-data selection into a six-node browser graph without horizontal overflow. Assistant browser interactions and the final integrated build are recorded separately. Adding an account-ID-bearing field in future requires updating the explicit transport field set and its regression coverage.

## Roles, communities, and explanations

**Coordinator detection is present and operational.** `_analyze` requires a non-seed, at least two incoming and outgoing counterparties, two neighboring communities, two upstream seeds, positive betweenness, and its empirical percentile at or above 0.90. The fit score competes with the other roles using a documented tie order. On the supplied data, 99 accounts qualify for a nonzero coordinator score; 83 receive it as their primary role. The remaining eligible candidates receive consolidator (7), distributor (5), or transit (4) because those scores win. Five coordinators appear in the first twenty priorities. This is evidence that the rule is reachable, not evidence of real-world coordination or criminal organization.

**The vocabulary extension is allowed.** Brief §5, line 541 permits documented additions to the six required roles. All six names are implemented; `boundary_unknown` is a documented addition. All 444 depth-four sinks receive it. A fit of 1.0 in that category means the collection cutoff rule matches, not certainty about financial purpose. Shallower `terminal` evidence explicitly says observed sink with unknown outside activity. Removing the extension to force all depth-four accounts into `terminal` would contradict the collection limitation in Brief §6, lines 586–587.

**No expected cluster count is imposed.** The organizer note at Brief line 677 mentions eight multi-seed communities under a baseline, not exactly eight total clusters. The implementation produces 91 total communities, including 19 isolated singleton seeds, and eight communities with multiple seeds. The supplied graph has 35 weak components once all input nodes are retained: 16 components containing edges plus 19 isolates. The brief's 16-component statement is therefore not a reason to drop isolated seeds.

**Explanation weaknesses corrected during the audit.** The original cluster hypotheses described composition with one common template. They now distinguish collection with onward distribution, fan-out distribution, collection into shared receivers, onward routing, observation-limited receiving branches, observed sink-heavy branches, mixed activity, and isolates. Supporting text gives relevant role counts or maximum observed counterparties, internal KZT turnover, and seed count, while explicitly leaving shared purpose and ownership unverified.

The original ranked export repeated role evidence. `_priority_evidence` now explains final priority on a 100-point display scale, the three largest positive contributions, and any explicit boundary reduction. Isolates receive a zero-priority explanation. This matters when an account has a `peripheral` role but high graph priority: role eligibility and review ranking answer different questions. Exact CSV columns, numerical scores, role assignments, and node-role evidence are unchanged; only the two explanatory text fields improve. Synthetic regressions cover peripheral-role priority, boundary reduction, zero-priority isolates, and distinguishable collection/distribution/cutoff communities. The post-change engine/audit/identifier/API/signal/CLI suite passed **74 tests**.

## Optional features

Brief §8, lines 623–632 provides examples rather than quantitative accuracy targets. “Implemented” below means the documented bounded behavior exists; it does not claim exhaustive detection or bonus points.

| Optional criterion and original location | Coverage found in source/tests | Classification and limits |
|---|---|---|
| Cutoff handling, line 625 | `engine.py` boundary-first role logic; priority adjustment; dossier collection-extension request; boundary regression. | Implemented and exercised. Correctly avoids claiming a true final beneficiary where observation stops. |
| Temporal transit, spikes, same-day payers, line 626 | `Analysis._temporal` uses non-reused FIFO inflow within zero to two days. `SignalAnalysis._temporal` finds active-day spikes and dates with at least three payers. | Implemented and exercised. Daily data cannot order same-day payments. Active-day baselines omit zero days and need three active dates; no same-fund tracing is claimed. |
| Recurring A→B→C and return flows, line 627 | `_routes` requires at least two distinct incoming/outgoing date pairs at one-to-two-day lag. `_cycles` separates structural cycles from strictly increasing-date examples. | Implemented with bounded coverage: selected account is the route middle; route-pair search, result count, cycle length two to four, and search steps are capped. Returned dates are evidence of consistency, not identity of funds. |
| Amount structure and hop-relative profiles, line 628 | `_anomalies` evaluates depth-peer volume/degrees and repeated same-day equal amounts across counterparties. Degenerate and small cohorts are tested. | Implemented as narrow descriptive rules. Equal amounts do not prove deliberate structuring; transfers below 5,000 KZT are unavailable. |
| Top-N removal, line 629 | `resilience` copies the graph, removes top one to twenty priorities, compares weak components, largest component, edges/nodes, and directed seed reach. | Implemented and exercised. Structural sensitivity, not an operational blocking forecast; lost seed pairs can include removed seeds themselves. |
| Natural-language answer with node references, line 630 | Eight bounded evidence tools, provider loop, seven local workflows, normalized source snapshots, current-run citation IDs, cohort collector paths, and bounded scope. | Provider path and seven synthetic live scenarios passed; seven local actions cover common bounded questions without credentials. These are fixed templates/phrase routing, not general offline language understanding. Checked scalar references and numeric literals do not establish free-prose entailment or financial accuracy. |
| Generated node card, line 631 | `dossier` and JSON/Markdown routes combine role, visible flows, graph evidence, hypotheses, missing facts, next requests, and provenance. | Implemented and exercised. Deterministic generation needs no paid model. No invented identity or ownership attributes are supplied. |
| Completeness and next request, line 632 | Dossier distinguishes boundary, seed, isolate, missing outside transfers, missing timestamps/purpose, period, and threshold limits. | Implemented and exercised. No fabricated percentage of completeness; requests are prioritized evidence needs. |

Aggregate supplied-data signal scan: 29 accounts have returned recurring routes, 298 have returned cycles, 239 have anomaly examples, 308 have active-day spikes, and 38 have same-day multiple-payer dates. One account's route search/results and fourteen accounts' cycle search/results are truncated. These are feature execution counts, not suspicious-account totals, recall, or labels.

## Constraints, launch, and submission

| Requirement | Evidence and status |
|---|---|
| No hardcoded answer lists; Brief §9, line 635. | Role and priority logic derives from graph metrics. The original synthetic fixture has fixed demo IDs, but supplied-data analysis does not use demo IDs as answer labels. |
| Explainable, cautious output; lines 636, 642–647. | Formal role thresholds, numerical evidence, priority factors, boundary caveats, and separate dossier hypotheses are present. Remaining explanation weaknesses are recorded above. No calibrated crime probability is claimed. |
| No invented customer enrichment; line 637. | Input requires only provided graph fields; outputs contain graph metrics and hypotheses, not names, income, demographics, or inferred beneficial ownership. |
| No paid service, cloud cluster, GPU needed; lines 638 and 648–653; regulations §5.6.6. | Deterministic analysis and normal investigation have no network/model requirement. Optional AI is explicitly gated; offline tests ran with dotenv loading disabled and AI flags false. Initial installation downloads dependencies. |
| Million-node approach described; lines 654–655. | README and architecture discuss partitioned input, precomputed features, sampled centrality, bounded serving, and benchmarked graph backends. This is a plan, not measured million-node performance. |
| One-command launch and independent verification; §10 and regulations §§5.4.15–5.6.6. | `scripts/dev.sh` installs frozen dependencies, builds the frontend, serves loopback; README identifies runtimes, data paths, exports, environment, restart, and checks. [Earlier clean-checkout evidence](../readme-verification.md) uses existing host runtimes and caches. No independently provisioned machine was tested in this audit. |
| Deliverable exports; Brief §10, lines 666–668. | All three files can be generated and downloaded. Their correct schema is verified; final private delivery to the organizer and deadline capture are external submission steps. Generated organizer outputs must remain out of Git. |
| Solution diagram and live demo; lines 669–674. | README Mermaid diagram covers data, metrics, roles, interface. The five-minute demonstration and one-minute arbitrary-account explanation are still human acceptance checks. |
| Disclose reused components; regulations §§5.4.4–5.4.6. | `THIRD_PARTY.md`, dependency locks, and retained frontend notices exist. At the initial snapshot the font row still named Geist while the interface used Inter, and brand attribution did not describe the active Freedom variant; synchronize these before final submission. Timing/originality eligibility cannot be established by tests. |
| Keep organizer data/credentials private; repository instructions and Brief §6. | Tracked-file query found no Parquet, generated CSV, organizer archive, or private `.env`; `.env.example` is intentionally tracked. This is not a full secret-history audit. |

The rubric gives functionality, technical implementation, and README/reproduction 25 points each, practical value 15, and potential/originality 10 (Brief lines 681–701). Robust real-data selection and a repeatable launch deserve priority over additional optional features. Regulations §§1.17 and 4.2–4.4 allow AI-assisted preliminary judging while retaining organizer discretion and human experts; no public evidence establishes a hidden evaluator model, exclusive AI judging, or automatic passing score.

## Verification performed and final checks

Direct audit checks executed without external AI or provider access:

1. Supplied-data load/export check: exact three CSV headers, 2,248/91/100 rows, populated fields, bounded scores, 444 boundaries, 19 isolated seeds, nonempty evidence of at most 105 characters.
2. Supplied-data export equality after reversing all three input tables; exact node-set preservation; priority components sum to each final score.
3. Fresh-process CLI export including imports and receipt: 0.8234 seconds on this host. Temporary generated artifacts were removed automatically.
4. Independent source and aggregate checks for all role candidates, seed communities, and bounded optional signals.
5. Initial targeted engine/signals/API/CLI suite: 52 passed. After the HTTP identifier correction, identifier/API/copilot/memory/signal suite: **78 passed**. The Starlette TestClient/httpx deprecation is the sole warning in those checks.
6. Supplied-data HTTP recheck: every account ID returned as an exact decimal string; exact node/graph selection succeeds; engine/CSV identifiers remain integers.

7. After the explanation improvements, 74 engine/audit/identifier/API/signal/CLI tests passed, including the new semantic explanation fixtures.

Parallel integration evidence reported by the coordinating agents: the frontend production build and nine frontend tests passed after the string-ID migration; supplied-data browser selection opened a six-node graph without a rounded-ID 404 or horizontal overflow. The grounding agent reported 224 backend tests passed during its integration and a synthetic-only live run with **7/7 model-completed cases**, zero fallbacks, 39 checked typed observations, and 59 numerical literals. That live run used `gpt-6-sol`, took 5.212–9.045 seconds per case, and exercised cohort, pattern, and removal tools. Its `prose_entailment` result remains `not_checked`; these small smoke cases do not establish general answer correctness. Private live artifacts remain ignored.

The seven local actions are priority explanation, pattern review, common collectors, top-five removal, missing-evidence requests, challenging a role hypothesis, and an investigation brief. Citation snapshots normalize account IDs before the 24,000-character bound and canonical SHA-256 calculation. Typed observation checks resolve current-run source pointers and primitive values; the conservative numerical-literal gate rejects unsupported displayed numbers. Neither check proves that prose attaches a real number to the correct concept or establishes sentence-level support.

Required final closure is the combined backend suite and frontend production build after all concurrent edits, plus the final assistant browser check. Preserve the original precision failure as a regression. Existing synthetic screenshots, earlier test counts, and earlier clean-checkout records do not prove the final snapshot.

Highest-value remaining work is to finish the integrated check, align attribution with shipped assets if still outstanding, and rehearse the exact live acceptance sequence. Domain-expert usefulness, role accuracy, production security, million-node performance, independent clean-machine launch, and organizer acceptance remain unverified or externally required.

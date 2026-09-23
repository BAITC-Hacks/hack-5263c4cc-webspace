# The next AI investigation features for Aqsha Lens

Research and code inspection: **23 September 2026**. Scope: the Freedom Finance track, the existing local deterministic graph, and its optional bounded assistant. These are implementation recommendations, not completed features or measured improvements in financial detection.

The audit and ranked proposals below describe the baseline at research time. The implementation appendix records the narrower changes subsequently made in this session; it does not turn the remaining roadmap into delivered functionality.

The best next increment is **a small, verifiable investigation record**: server-rendered observations, explicit hypotheses and their limits, concrete next checks, and evidence-specific navigation. Keep the present Responses runtime and installed assistant-ui. Add an evaluation harness as development tooling only when its comparison or review interface saves work. A new graph database, vector index or autonomous agent team does not resolve the current evidence-verification gap.

I used Exa to review **25 requested results across five search workstreams**, then fetched **17 bounded source pages** for validation and inspected public GitHub metadata and the latest eligible default-branch commits for **seven repositories**. Search hits were screened rather than treated as verified facts. The ledger below records exclusions, fetched sources, exact counts and query text. Research used public technical material; organizer records, credentials and generated investigation exports were not sent to research tools.

## What the current code already delivers

This audit read [methodology](../methodology.md), [architecture](../architecture.md), the existing [advanced-agent](advanced-agents-2026.md), [agent-improvement](agent-improvements-2026.md), [hardening](architecture-agent-hardening-2026.md) and [assistant-workspace](assistant-workspace-2026.md) research, and the actual implementation. Older research describing seven tools or no server history is superseded by the current code.

| Inspected implementation | Present behavior | Remaining product gap |
|---|---|---|
| [contracts.py](../../src/moneygraph/agent/contracts.py) | Typed request; immutable application-selected account and optional cohort of at most five; final answer has prose, citation IDs and limitations | Facts, interpretations and next checks are not separately typed in the final response |
| [evidence.py](../../src/moneygraph/agent/evidence.py) | Eight empty-argument read tools; compact investigation brief already bundles observations, hypotheses, signals, gaps and requests | Evidence references identify a whole payload, not a particular supported assertion; coverage detail varies by tool |
| [runtime.py](../../src/moneygraph/agent/runtime.py) | Current-run citation membership, payload hashes, evidence version, three rounds/four calls, bounded output/context, cooperative deadline, fallback | A real citation can accompany an invented number, reversed edge or unsupported assertion; hashes identify content rather than prove entailment |
| [memory.py](../../src/moneygraph/agent/memory.py) | Scoped six-message context, 24-hour lifetime, optional SQLite, revisions and deletion semantics | Conversation context does not record reviewed case decisions or resumable investigation steps |
| [AssistantPanel.tsx](../../web/src/AssistantPanel.tsx) | Existing “Challenge the hypothesis” and “Plan the next step” prompt suggestions, sources, traces and limitations | These are prompt shortcuts, not a structured hypothesis comparison or executable bounded plan; citations navigate by `gid` |
| [AssistantRuntime.tsx](../../web/src/AssistantRuntime.tsx), [AssistantWorkspace.tsx](../../web/src/AssistantWorkspace.tsx) | Global workspace, per-conversation scope, branching, deletion, JSON transcript download; server result stored in message metadata | Export is a conversation record, not a reviewed evidence manifest; all citation types currently lead back to an account selection |
| [signals.py](../../src/moneygraph/signals.py), [audit.py](../../src/moneygraph/audit.py) | Deterministic dossiers, missing-evidence requests and Markdown export with provenance | No claim-to-fact review state, recorded analyst disposition or combined case capsule |
| [evaluate_copilot.py](../../scripts/evaluate_copilot.py), [runtime tests](../../tests/test_agent_runtime.py), [copilot tests](../../tests/test_copilot.py) | Seven synthetic smoke cases plus authorization, budget, citation and memory tests | Smoke checks establish contracts, not exact claim agreement or a held-out answer-quality result |

The new work should extend these components. It should not rebuild chat, dossiers, memory, common-collector search or the eight analytical tools.

## Ranked features that can be implemented now

The size estimates below are engineering judgments, not measured schedules. “Small” means a focused contract or presentation change; “medium” crosses backend and frontend; “larger” introduces durable state and recovery.

| Order | Concrete feature | Why it matters | Size / dependency | Delivery proof |
|---:|---|---|---|---|
| 1 | Typed observations with deterministic verification | Makes a displayed amount, direction or boundary assertion independently checkable | Medium; existing Pydantic and evidence registry | Invented value with a valid citation cannot acquire a “checked” status |
| 2 | Open the exact cited evidence | Reduces the work needed to inspect a statement | Small–medium; existing assistant-ui and evidence panels | A route citation opens its directed path; a community citation opens the relevant community |
| 3 | Hypothesis challenger with limits and next checks | Makes alternative explanations and unresolved evidence visible | Medium; builds on checked observations | Supports, limiting observations and missing evidence remain distinguishable; no model-written roles |
| 4 | Bounded investigation plans | Converts “what next?” into useful, observable progress | Medium; fixed application templates | Each step identifies its evidence and status; unavailable evidence remains a request |
| 5 | Held-out grounding and authorization evaluation | Establishes whether features actually improve answers | Small first increment; optional development-only harness | Independently specified fixtures, frozen holdout, separate semantic and contract results |
| 6 | Reviewed case capsule | Produces a portable, inspectable analyst work product | Medium for download; larger for durable case state | Reproducible manifest, review labels and safe export, separate from required CSVs |

Build the evaluation fixtures alongside feature 1, even though the fuller comparison interface is ranked later. The smallest coherent release is features 1 and 2 with their tests. The next release can add 3 and 4 without changing orchestration frameworks.

### 1. Replace the “valid citation means valid claim” shortcut

Claim-level evaluation is a distinct problem from attaching a source. RAGChecker decomposes responses into claims and checks entailment; ClaimVer emphasizes showing each claim with evidence and a local explanation; VeriCite separates answer drafting, support verification and refinement. These papers support the design direction, but none validates Money Graph's role rules or supplies a ready deterministic checker for its amounts and paths. [RAGChecker](https://arxiv.org/html/2408.08067v2), [ClaimVer](https://arxiv.org/abs/2403.09724), [VeriCite](https://arxiv.org/html/2510.11394).

Implement a **fact catalog returned by trusted evidence code**, initially for a deliberately small list of types:

- Account metric: incoming/outgoing amount, distinct counterparty count, depth, documented role fit, priority and observation-boundary status.
- Directed relationship: an observed source → target edge with amount/count and collection coverage.
- Route: an actual bounded path, its length and available dated example; distinguish structural connectivity from a strictly increasing-date example.
- Coverage: exact result count, returned count, truncation and collection limitations where the underlying computation knows them.

Each item should carry a versioned `fact_id`, subject, fixed fact type, canonical value/unit, evidence ID, payload identity and a typed internal navigation target. The model selects existing fact IDs to answer the question; trusted code renders the numerical observation. This is narrower and more reliable than asking another model whether arbitrary prose is true.

For example, a proposed answer contract can contain `observation_fact_ids`, bounded `hypotheses`, `missing_evidence_ids` and `next_check_ids`. An observation is generated from its catalog entry, not from model-authored numeric text. Hypotheses may reference retrieved facts but remain visibly interpretations. Cap the number of returned items and count their schemas/evidence against existing context limits.

If richer claims are later needed, add a finite predicate registry such as `metric_equals`, `direct_edge_exists`, `bounded_path_exists` and `increasing_date_example_exists`. The application owns each predicate implementation and field allowlist. It must not interpret an arbitrary expression, SQL query, Python fragment, URL, file path or unbounded JSON path. Unknown IDs, cross-scope references and unsupported predicates fail validation.

Money and counts need exact application semantics: canonical cent values or decimal amounts; integer counts; deterministic display rounding. Do not borrow a general-purpose ±5% numerical tolerance. The existing input aggregation tolerance is not permission for an answer to alter a stated amount. Values sourced from already computed heuristic scores should use the same documented display precision.

Use precise statuses: **matches retrieved evidence**, **contradicted by retrieved evidence**, **insufficient evidence**, and **interpretation requires review**. Reserve a checked badge for supported typed observations. A correct number next to an unvalidated causal assertion must not make the whole sentence look verified. A hash cannot establish data authenticity, ownership, intention or identity of funds.

Important tests include: valid citation/wrong amount; reversed edge; multihop path described as direct payment; same-day sequence described as ordered; empty bounded result described as universal absence; depth-four sink described as final beneficiary; stale fact IDs; and forged facts in conversation history. Preserve the three required CSV schemas and role/priority rules unchanged.

### 2. Make evidence citations useful investigation controls

The runtime currently attaches the selected account `gid` to every citation, while the panel calls `onSelect(gid)`. A source for community, collector or removal evidence therefore does not identify the exact view the analyst needs.

Return server-validated citation targets as a closed union: account, community, signal example, collector path or fixed removal simulation. Keys resolve only within the retrieved payload and permitted scope. A route target should identify existing edge/path IDs and a dated example, not contain an arbitrary URL or code. If an example is outside the current display bounds, show that fact and offer bounded navigation rather than silently expanding the investigation scope.

Render a small observation card with the server-formatted number, its coverage, and “Open evidence.” Show hypotheses and missing evidence separately. Reuse the present Base UI cards and `metadata.custom.evidence` path first. The installed assistant-ui can also render existing server tools through UI-only `makeAssistantToolUI`; this does not require registering browser execution tools or adopting another backend. Its current official guide explicitly separates UI-only rendering from client-defined tools. [assistant-ui generative UI](https://www.assistant-ui.com/docs/guides/tool-ui).

Keep the current honest completed-response behavior. Native tool cards are optional; simulated streaming or decorative agent stages add no evidence. A later streaming implementation should emit actual server events and share the existing budgets.

### 3. Upgrade the existing challenger prompt into a bounded artifact

Recent research investigates structured alternatives rather than just longer reasoning. PRISM studies hypothesis structuring on narrative murder mysteries; JustDiag records evidence, findings, competing hypotheses, conflicts and next checks for operational incidents; EVAR checks proposed hypotheses against a locked evidence store. Their domains and evaluation designs differ from this graph. Borrow the artifact structure, not their accuracy claims, perpetrator labels, model committees or inferred probabilities. [PRISM](https://aclanthology.org/2026.acl-long.1056/), [JustDiag](https://arxiv.org/abs/2606.19407), [EVAR](https://arxiv.org/abs/2608.29835).

Add an explicit **Review alternatives** mode with at most three hypothesis records. A record contains a short interpretation, supporting fact IDs, limiting fact IDs, missing-evidence IDs and the next observation that would distinguish it. Zero hypotheses is valid for an isolated seed or insufficient evidence; do not force a polished story for every account.

Useful domain templates are already close to the deterministic dossier:

| Observed situation | Appropriate contrast to examine | What would distinguish explanations |
|---|---|---|
| Recurring two-hop routes | Recurrent observed transfer structure; regular legitimate payments remain possible | Authorized payment purposes/references, longer observation period, precise timestamps |
| Apparent transit role | Rule-fit based on visible overlap; incomplete inflows may change interpretation | Complete statements and inbound coverage |
| Depth-four account with no visible outgoing edge | Observation cutoff prevents a terminal interpretation | Authorized outgoing collection beyond the current boundary |
| Structural cycle | Topological return route; temporal ordering or fund identity is unresolved | Strictly ordered timestamps and appropriate transaction references |

Do not turn a missing fact into negative evidence. “No known employer” is not a counterargument when employer data was never supplied. “Regular legitimate payments remain possible” is a hypothesis, not a claim that a business relationship exists. Rule-fit comparisons can be computed from the existing role candidates; any change to required roles remains outside the model's authority.

Use one bounded generation over the same immutable evidence catalog. A separate critic model is an optional evaluation experiment, not a prerequisite. If added later, it needs its own measured benefit and must fit the total run budget; it cannot promote an interpretation to an observed fact.

### 4. Turn “plan the next step” into a fixed-scope investigation plan

The present dossier already emits prioritized next-data requests. The new feature is a visible, typed plan tying a question to actual completed evidence checks and unresolved requests.

Offer a few application-selected templates: explain role and priority; inspect routes/timing; compare selected collectors; review observation completeness; examine structural removal sensitivity. A plan has at most four steps, each with a fixed tool/template enum, purpose, required evidence type, outcome references and a status such as `not_started`, `checked`, `insufficient` or `needs_external_evidence`.

The model may suggest a template or order within the validated scope. Trusted code determines what executes and whether a step completed. It cannot invent tools, add accounts, silently broaden the date window, claim a request was sent, or mark analyst review complete. Read-only checks do not need approval prompts. External evidence requests remain an analyst checklist; no outreach or enrichment tool is added.

Respect the current execution shape: three model rounds with the final round tool-free normally leaves two tool-bearing rounds. A four-call ceiling is not a promise of four sequential model-selected reads. Use the existing compact brief for broad reviews; use collector or resilience tools for those specific questions. If a template needs several evidence views, collect its fixed bounded bundle in application code and account for its size/work, rather than raising budgets or adding unbounded planning loops.

LangGraph becomes useful when a real case must pause for a human, survive a process restart and resume. Its interrupts require checkpointing and thread identity; resuming re-executes relevant node code, so side effects and replay must be designed carefully. The current read-only request can finish with a proposed plan and a later analyst review action without introducing durable execution yet. [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts).

### 5. Evaluate actual grounding before optimizing prompts

Extend the existing seven synthetic smoke cases into an independently specified set of at least 24 scenarios, with a frozen holdout before prompt or template tuning. Retain authorization/fallback tests and add the adversarial fact/route cases listed above. Include irrelevant but valid citations, stale history, legitimate alternatives, zero hypotheses, incomplete coverage, malformed plans and an external-evidence request that must stay pending.

Report separate results for:

- Exact typed-observation agreement and numerical formatting.
- Citation relevance and complete reference resolution.
- Unsupported or contradicted narrative claims, assessed separately from deterministic predicates.
- Boundary/temporal caveat recall and appropriate insufficiency responses.
- Correct tool choice and zero unauthorized executions.
- Fallback mode, latency, tokens, rounds and tool calls, with sample counts.

The existing smoke script can pass while using the local fallback; this is useful availability evidence but cannot establish live-model answer quality. Stratify offline, provider-backed and failed/fallback runs. Do not optimize a metric by making every question fall back. Independently specify expected values; snapshots generated solely by the same implementation can preserve its bugs.

| Evaluation option | Verified capability | Fit here | Decision |
|---|---|---|---|
| Existing pytest and synthetic runner | Already exercise application boundaries without a required external service | Best first place for fact and scope regressions | Extend now; no new runtime dependency |
| [Inspect AI scorers](https://inspect.aisi.org.uk/scorers.html) | Exact/numeric/text scorers, custom scoring and model graders | Python-native evaluation with explicit expected values | Preferred optional harness if Python ownership and richer experiment logs are the main need |
| [Promptfoo deterministic assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/), [Python provider](https://www.promptfoo.dev/docs/providers/python/) | Schema/custom Python assertions, tool/trajectory checks where trace data exists, arbitrary Python application wrapper | Ready comparison and review workflow without migrating the agent SDK | Strong alternative if its comparison UI/adversarial workflow is wanted; choose one harness |
| [DeepEval faithfulness](https://deepeval.com/docs/metrics-faithfulness) | Model-judged alignment against retrieved context, with explanation | Supplementary rubric for prose claims | Optional later; not the authority for arithmetic, permission or uncertainty semantics |
| [RAGChecker](https://arxiv.org/html/2408.08067v2) | Claim-level retrieval/generation diagnostics | Useful research method and metric vocabulary | Do not adopt as the production verifier; maintenance snapshot is substantially older |

A custom Promptfoo Python provider can wrap the existing `investigate` entry point; its OpenAI Agents SDK examples do not require this application to migrate to that SDK. Likewise, exact-value tests do not need a judging model. Custom assertion scripts are trusted development code, not model-accessible runtime tools. Keep evaluation input synthetic and generated reports outside Git. Model graders may flag questionable interpretation but their scores are not crime probabilities or measured financial-role accuracy.

### 6. Join the dossier and transcript into a reviewed case capsule

The repository already exports a Markdown dossier and a JSON conversation. Add a separate **case capsule** containing selected scope, dataset/algorithm/evidence fingerprints, checked observations, hypotheses, missing evidence, plan outcomes, sanitized execution metadata and explicit review state. Reuse the existing local download pattern and provenance functions. Never change the mandatory CSV exports.

For the smallest version, review is an explicit UI decision on individual records and the capsule is a bounded local JSON/Markdown download. “Reviewed” means a person reviewed the interpretation; it does not certify the underlying data or criminal intent. Keep original generated text and analyst edits distinguishable. Do not identify a random session capability as an authenticated reviewer.

If persistent cases are requested, introduce separate typed case storage with schema version, evidence fingerprint, review revision and deletion/retention behavior. A dataset/scope change makes earlier review stale. Do not repurpose the six-message memory buffer as a case database. Only then consider LangGraph checkpoints for resumable computation and review; a static case record alone does not require an agent framework.

Export only validated, bounded case fields. Session tokens, keys, prompts, arbitrary provider payloads and unrelated accounts must not enter the capsule. Evidence hashes can later detect mismatches but cannot make an export tamper-proof or authenticate a reviewer. Safe local export is a human application action, not a new model write tool.

## Graph retrieval: what to reuse and what to defer

Microsoft GraphRAG's documented pipeline starts with text units, extracts entities/relationships, builds communities, writes community summaries and creates embeddings. Local search combines entity information with source text; global search uses generated community reports and map/reduce. That is valuable for an authorized document corpus but duplicates and weakens the authority of an already validated transaction graph if treated as a replacement for exact account, amount and path computations. [GraphRAG overview](https://microsoft.github.io/graphrag/), [indexing dataflow](https://microsoft.github.io/graphrag/index/default_dataflow/), [local search](https://microsoft.github.io/graphrag/query/local_search/), [global search](https://microsoft.github.io/graphrag/query/global_search/).

| Question | Appropriate retrieval now | Why |
|---|---|---|
| “How much visible money went out?” | Validated metric fact | Requires the exact aggregation, not semantically similar text |
| “Which account is reachable from all five?” | Existing bounded common-collector tool | Requires directed intersection/path evidence and search limits |
| “Why this role?” | Existing role candidates, score contributions and exact methodology section | Rule explanation should not be reconstructed from model-generated summaries |
| “Which alternative fits these observations?” | Checked facts plus hypothesis templates | Needs disciplined interpretation, not a second inferred transaction graph |
| Future question spanning many authorized case documents | Evaluate exact/lexical section retrieval first; compare GraphRAG if genuinely cross-document | Needs corpus access control, source versions, retrieval evaluation and bounded context |

No vector database is needed for the current task. A small server-owned method/limitation section catalog can answer “why this threshold?” without file tools or arbitrary URL retrieval. It must distinguish a documented rule choice from empirical calibration. If a future document corpus warrants GraphRAG, keep its extracted relations separate from transaction edges and evaluate retrieval against a simpler baseline. Indexing cost, access control, stale summaries and collection coverage remain explicit requirements.

## Maintained options and adoption threshold

Public GitHub REST metadata and latest default-branch commits at or before **2026-09-23T23:59:59Z** were inspected on 23 September 2026. All seven repositories reported `archived=false`. Stars are a time-sensitive adoption signal; they do not establish correctness, safety, release quality or compatibility. Licenses below are GitHub root metadata, not a legal review of every transitive dependency.

| Project | Stars | Latest eligible commit, UTC | Root license | Recommended use |
|---|---:|---|---|---|
| [assistant-ui](https://github.com/assistant-ui/assistant-ui) | 12,277 | [2026-09-23 11:57](https://github.com/assistant-ui/assistant-ui/commit/9cb7aa44967a73ac78b523aa9442f794353ef5fa) | MIT | Already installed; reuse custom result rendering |
| [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) | 2,847 | [2026-09-23 11:59](https://github.com/UKGovernmentBEIS/inspect_ai/commit/06537c328ce79046d5a4591e275d41c1fcb41f1a) | MIT | Optional development-only evaluator |
| [Promptfoo](https://github.com/promptfoo/promptfoo) | 25,393 | [2026-09-23 05:41](https://github.com/promptfoo/promptfoo/commit/d59f045c4cda1193574380aae639d84380dbf5f2) | MIT | Alternative development-only evaluator; Python wrapper fits existing runtime |
| [DeepEval](https://github.com/confident-ai/deepeval) | 18,411 | [2026-09-23 07:31](https://github.com/confident-ai/deepeval/commit/86b6fb51cc9ac3a6b1aa4820d3e39bb4cc7db5e5) | Apache-2.0 | Optional semantic evaluation after deterministic checks |
| [LangGraph](https://github.com/langchain-ai/langgraph) | 42,176 | [2026-09-23 04:02](https://github.com/langchain-ai/langgraph/commit/bdb85b5aa87a21de68371d2e534b81aeed398f57) | MIT | Defer until real restart/resume or durable review is implemented |
| [Microsoft GraphRAG](https://github.com/microsoft/graphrag) | 36,079 | [2026-09-21 16:11](https://github.com/microsoft/graphrag/commit/82b87bf0434fc69f857663280e2c36a1c48e52fe) | MIT | Defer until an authorized document corpus and retrieval results justify it |
| [RAGChecker](https://github.com/amazon-science/RAGChecker) | 1,124 | [2024-12-13 13:24](https://github.com/amazon-science/RAGChecker/commit/6091f08c00e676e87a970f2aeb4a23a484746348) | Apache-2.0 | Research reference; no recent default-branch maintenance observed |

Metadata endpoints were `https://api.github.com/repos/{owner}/{repo}` and `/commits?per_page=1&until=2026-09-23T23%3A59%3A59Z` for each linked repository. No package was installed, upgraded or benchmarked. If a harness is adopted, pin and test an actual release rather than installing repository HEAD merely because it is current.

## Source ledger and research limits

Date arithmetic: the current date is **2026-09-23**; a six-month recency window begins **2026-03-23**. This was used to interpret maintenance, not to exclude older foundational papers. No source dated after 23 September 2026 was used. Undated living documentation is recorded as accessed on the research date rather than assigned an invented publication date.

All five Exa calls used `numResults=5`, with an objective favoring primary papers, official documentation and maintained repositories, excluding SEO roundups and later-dated material. The exact query text was:

| Workstream | Query | Requested / returned |
|---|---|---:|
| Claim verification | Primary research or official open source documentation on claim level citation verification for retrieval augmented generation, checking numerical claims against structured evidence and evaluating citation entailment, available by September 23 2026 | 5 / 5 |
| Hypothesis challenge | Research papers or official implementation documents for evidence grounded competing hypotheses and critical reflection in AI investigation assistants, separating observed facts alternative explanations and missing evidence, published before September 23 2026 | 5 / 5 |
| Graph retrieval | Microsoft GraphRAG official documentation comparing local search global search indexing costs and structured graph data retrieval with validated function tools, current documentation September 2026 | 5 / 5 |
| Evaluation | Promptfoo DeepEval Inspect AI official documentation for evaluating tool calling agents with deterministic custom assertions, prompt injection tests and offline local execution, available before September 23 2026 | 5 / 5 |
| Human review | LangGraph official documentation durable execution interrupts human in the loop approval and investigation plans, assistant ui generative UI tool approval citation display, available before September 23 2026 | 5 / 5 |

Search discovery produced **25 exact unique URLs** from 25 hits; there were no exact URL duplicates. Conceptual overlap remains, particularly Python/JavaScript LangGraph instructions and several Promptfoo pages. Four fetched URLs exactly repeated search URLs; the 17 fetches therefore bring the search/fetch union to **38 distinct document URLs**. Paper landing pages, PDFs and documentation mirrors are separate URLs but not independent corroborating works. The 14 GitHub API responses are counted separately and are not added to Exa's `sources_reviewed=25` convention.

### Search candidates: validation and disposition

| # | Candidate | Quality observed and decision |
|---:|---|---|
| 1 | [RAGChecker paper](https://arxiv.org/html/2408.08067v2) | Original research with public code and explicit claim-level evaluation; fetched and used for method, not financial performance |
| 2 | [ClaimVer paper](https://arxiv.org/pdf/2403.09724v4.pdf) | Original research on claim annotations and trusted graph evidence; validated through its abstract/HTML landing page |
| 3 | [ExecutableClaims](https://github.com/aayambansal/ExecutableClaims) | Author repository describes generated executable test capsules and external retrieval; excluded from adoption because execution/network approach exceeds this runtime's scope and maintenance was not established |
| 4 | [CiteScan](https://openreview.net/forum?id=aXIByMDjL4) | Search content was a browser-verification page; excluded, no substantive claim taken from it |
| 5 | [VeriCite](https://arxiv.org/html/2510.11394) | Original citation-verification paper; fetched, used as concept evidence, not a drop-in verified checker |
| 6 | [PRISM paper](https://aclanthology.org/2026.acl-long.1056.pdf) | Primary ACL research; landing page validated; narrative benchmark is an explicit transfer limitation |
| 7 | [HypoArena / prospective hypothesis discovery](https://arxiv.org/pdf/2607.15766.pdf) | Original paper in search highlights; useful discovery candidate, not separately fetched or relied on for recommendations |
| 8 | [InfoGatherer](https://arxiv.org/pdf/2603.05909v1/__stdout.txt) | Original paper surfaced through extracted PDF text; legal/medical evidence-belief method differs from this unlabeled graph; not relied on |
| 9 | [JustDiag](https://arxiv.org/html/2606.19407) | Original operational RCA research; validated through landing/HTML content; supports explicit process artifacts, not AML accuracy |
| 10 | [EVAR](https://arxiv.org/pdf/2608.29835.pdf) | Original preprint; abstract page confirms 30 August 2026 submission; immutable-evidence pattern used, no performance transferred |
| 11 | [GraphRAG local source](https://github.com/microsoft/graphrag/blob/main/docs/query/local_search.md) | Maintainer source; cross-checked against official published documentation |
| 12 | [GraphRAG overview source](https://github.com/microsoft/graphrag/blob/main/docs/index.md) | Maintainer source; cross-checked against official published documentation |
| 13 | [GraphRAG Mintlify retrieval page](https://microsoft-graphrag.mintlify.app/concepts/retrieval-methods) | Ownership not independently established; excluded in favor of Microsoft-hosted documentation |
| 14 | [GraphRAG global source](https://github.com/microsoft/graphrag/blob/main/docs/query/global_search.md) | Maintainer source; cross-checked against official published documentation |
| 15 | [GraphRAG Mintlify comparison](https://microsoft-graphrag.mintlify.app/examples/notebooks/comparison) | Unverified documentation host with generic latency claims; excluded; its timings are not Money Graph measurements |
| 16 | [Promptfoo assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/) | Official maintainer documentation; retained as discovery context; more specific deterministic page fetched |
| 17 | [Promptfoo deterministic assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/) | Official docs distinguish deterministic checks from model/external-service checks; fetched and used |
| 18 | [Promptfoo Python Agents example](https://www.promptfoo.dev/docs/guides/evaluate-openai-agents-python/) | Official implementation guidance; SDK, tracing and sandbox examples exceed what is needed; generic Python provider fetched instead |
| 19 | [Promptfoo Agents provider](https://www.promptfoo.dev/docs/providers/openai-agents/) | Official SDK-specific integration; not evidence this app must migrate SDKs; not selected |
| 20 | [Promptfoo getting started](https://www.promptfoo.dev/docs/getting-started/) | Official guide describes evaluation/configuration and comparison view; retained as discovery context |
| 21 | [LangGraph Python interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | Official maintainer documentation with persistence and replay caveats; fetched and used |
| 22 | [LangChain / assistant-ui announcement](https://www.langchain.com/blog/assistant-ui) | First-party integration announcement from 2024; replaced by current assistant-ui docs for implementation decisions |
| 23 | [LangChain human review](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) | Official middleware documentation; related capability, but no need for review on every bounded read |
| 24 | [LangChain frontend human review](https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop) | Official frontend pattern; conceptual overlap with interrupts, not independent outcome evidence |
| 25 | [LangGraph JavaScript interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts) | Official duplicate language variant; Python primary page used for this backend |

### Bounded page fetches

Every fetch used Exa `web_fetch_exa` with a maximum of 6,000 characters per page, except the final current assistant-ui guide at 5,500. This is a targeted excerpt review, not a claim to have read all papers in full.

| Fetches | URLs and use |
|---|---|
| 1–6: claim and hypothesis primary material | [RAGChecker](https://arxiv.org/html/2408.08067v2), [VeriCite](https://arxiv.org/html/2510.11394), [ClaimVer](https://arxiv.org/abs/2403.09724), [JustDiag](https://arxiv.org/abs/2606.19407), [EVAR](https://arxiv.org/abs/2608.29835), [PRISM](https://aclanthology.org/2026.acl-long.1056/) |
| 7–12: evaluation and review | [Promptfoo deterministic](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/), [Promptfoo Python provider](https://www.promptfoo.dev/docs/providers/python/), [Inspect scorers](https://inspect.aisi.org.uk/scorers.html), [DeepEval faithfulness](https://deepeval.com/docs/metrics-faithfulness), [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts), [legacy assistant-ui ToolUI](https://www.assistant-ui.com/docs/guides/ToolUI) |
| 13–16: authoritative GraphRAG validation | [Overview](https://microsoft.github.io/graphrag/), [local search](https://microsoft.github.io/graphrag/query/local_search/), [global search](https://microsoft.github.io/graphrag/query/global_search/), [dataflow](https://microsoft.github.io/graphrag/index/default_dataflow/) |
| 17: current UI guidance | [assistant-ui tool UI](https://www.assistant-ui.com/docs/guides/tool-ui); supersedes the legacy capitalized route for the UI-only implementation recommendation |

The evidence is strongest for available framework capabilities and the observed code gaps. The expected analyst benefit of these features is an engineering inference. It still needs task-based review: time to verify an amount/path, ability to spot an unsupported inference, and usefulness of the next requested evidence. No live provider evaluation, framework benchmark, dependency migration or production-readiness assessment was performed in this research.

## Implementation appendix — 23 September 2026

The following small increments were implemented after the research audit. Final integrated verification and live provider evaluation are recorded separately in [validation.md](../validation.md); no passing live result is claimed here.

| Increment | Delivered scope | What remains outside the claim |
|---|---|---|
| Lossless account transport | Canonical decimal strings across browser/API account fields, nested cohorts and paths; exact integer engine/CSV behavior preserved | Community IDs and metrics remain numeric; this is transport correctness, not identity resolution |
| Seven local workflows | Deterministic priority, pattern, collector, removal, missing-evidence, challenger and brief actions over the existing bounded tools, with source receipts and real traces | Fixed templates/phrase routing, not general natural-language understanding or a durable multistep planner |
| Bounded source snapshots | Citation sources normalize account IDs before their 24,000-character canonical `source_json` bound; the receipt hashes the exact UTF-8 bytes of that retained string, which survives browser float-spelling changes in local packet downloads | Rehash `source_json`, not the parsed/reformatted source or packet. Hashes identify payloads; packets do not authenticate data, certify analyst review or create durable case ownership |
| Checked primitive observations | `agent/grounding.py` validates up to eight evidence-ID/JSON-pointer/value claims against current cited `data`/`coverage` fields and returns server labels/values/units | This is a narrow scalar-reference contract, not the full fact/predicate catalog proposed above; free prose is not semantically verified |
| Conservative numerical-literal gate | Rejects unsupported numerical literals, including the demonstrated invented magnitude, while allowing decimal display rounding and K/M/B/percent formatting | A real number can still be attached to the wrong concept; valid arithmetic or general constants absent from tool evidence may be rejected |
| Honest evaluation accounting | Provider-requested evaluation requires actual model-completed cases and distinguishes local/fallback execution | Seven smoke cases are not a held-out quality benchmark or comprehensive security assessment |

Focused grounding tests cover wrong values with real citations, large identifiers, boundary-role mismatches, malformed/missing/container paths, metadata/hash exclusion, display formats and the deliberate absence of a prose-entailment claim. UI badges must apply only to checked fields. The broader hypothesis matrix, resumable plans, reviewed case state, exact route-specific navigation and optional evaluation-framework adoption remain future work.

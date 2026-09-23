# Verified validation results

Verified on 23 September 2026 against the local Freedom Finance implementation. Only aggregate statistics are recorded here. Organizer records, generated CSVs, credentials and live response artifacts remain outside Git. The hardening verification immediately below is current; later sections retain earlier measurements and their original scope.


## Architecture and agent hardening verification

The integrated backend passed **130 tests in 3.74 seconds** with `uv run --frozen pytest -q`. Eight browser-helper regression tests passed with `node --test web/tests/assistant-session.test.cjs`; these are now included in `scripts/check.sh`. The frontend production build passed TypeScript and Vite in **3.19 seconds**, with no chunk-size warning in that run. A Starlette TestClient transport deprecation remains the sole backend warning. Parallel UI work can change bundle sizes without changing these backend measurements.

A fresh independent process, launched from a temporary working directory with external AI disabled, exported the official data in **0.9401 seconds**. It retained 2,248 nodes, 3,119 directed edges, 4,840 transactions, 81 seeds, 91 communities, 35 weak components and all 19 isolates. The required CSVs contain 2,248, 91 and 100 rows respectively. All 444 depth-four boundaries remained `boundary_unknown`; the longest node evidence was 105 characters. Temporary exports were removed after verification. This is a clean-process measurement with dependencies already installed, not a new clean-machine installation.

New regression coverage includes strict input types and absolute aggregation tolerance; disabled/replayed/unknown tools; provider-output context accounting; cooperative deadline and timeout budgets; blank or invented-citation answers; memory scope/version, private SQLite restart, TTL, capacity, overlapping sessions and late-completion deletion; empty-session handshakes; foreign origins, spoofed forwarding headers, oversized/chunked bodies, private validation errors and atomic rate budgets. An independent concurrent HTTP check held a remembered question in flight, observed a second question rejected with 409, deleted the session with 204, and confirmed the late reply could not restore it; reuse returned 404.

Chromium against an isolated offline synthetic backend verified a scope-only session handshake, two-turn token reuse, no client-supplied history, fresh context on retry, removal of tokens from exported conversation JSON, and server deletion when deleting a conversation. No browser errors were reported in those checks. Helper tests additionally cover cancellation, deletion during the handshake, stale scope, failed-deletion retries and 429/204 handling. These checks validate the memory integration; the separate UI task owns the broader visual review.

All seven offline synthetic evaluation scenarios passed, including run/evidence-version receipts. **No fresh paid-provider or live-model evaluation was performed in this hardening pass.** Earlier live results below do not validate the new loop semantically. Eight bounded read tools are now implemented. Scores and CSV contracts remain deterministic and independent of remembered conversations.

The 45-second run deadline is cooperative: it checks elapsed time around work and shortens provider timeouts, but cannot forcibly interrupt synchronous calls or promise end-to-end cancellation. Memory expires logically after 24 hours; physical SQLite pruning occurs on startup or subsequent operations. Local per-peer/process request budgets, origin/body controls and scoped capabilities are implemented; authentication, distributed quotas, calibrated claim correctness and production security remain unverified. LangGraph, LangChain, Mem0 and Chroma were researched, not installed or presented as implemented features.

## Earlier backend and clean-process export

The final backend run completed **38 tests successfully in 2.57 seconds** using `uv run --frozen pytest -q`. The only warning was Starlette's deprecation notice for its current `httpx` TestClient transport; no test failed. `bash -n scripts/dev.sh scripts/check.sh` also passed, and both scripts are executable.

An independent process was launched from a fresh temporary working directory with AI disabled. It loaded the official Parquet files, computed the graph, wrote all three CSVs and the provenance receipt, and exited successfully in **0.9529 seconds**. Environment: Python 3.12.12, Linux x86_64, eight logical CPUs. Dependencies were already installed. This is a clean-process measurement, not a measurement of initial installation or proof that a clean machine has been provisioned. The result is well below the five-minute pipeline limit on this host. A separate earlier recorded run took 0.8332 seconds; ordinary run-to-run variation is expected.

Reproduce after installing the locked dependencies:

```bash
uv run --frozen moneygraph export --data /absolute/path/to/data --out outputs/submission
uv run --frozen pytest -q
```

| Official-data check | Verified result |
|---|---:|
| Input nodes retained in `nodes_roles.csv` | 2,248 of 2,248 |
| Directed aggregate edges | 3,119 |
| Transactions | 4,840 |
| Supplied seed accounts | 81 |
| Cluster export rows | 91 |
| Ranked top-node export rows | 100 |
| Depth-four accounts classified as `boundary_unknown` | 444 of 444 |
| Isolated accounts retained as `peripheral`, priority zero | 19 of 19 |
| Weak components, including isolated nodes | 35 |
| Largest emitted evidence string | 105 characters; limit 200 |

The 35 weak components include the 19 isolated seeds. The brief's 16 edge-bearing components therefore do not conflict with this count. Seed-to-entity reach in the resilience view counts ordered seed→reachable-account pairs within four directed hops, excluding self; it does not count only seed-to-seed pairs.

The independent CSV check confirmed exact required column names and order, no missing node identifiers, finite scores within [0, 1], documented role vocabulary, nonempty evidence and priority explanations, cluster coverage of all nodes, seed-count reconciliation, contiguous top-list ranks and descending priority. Every generated file's SHA-256 matched its provenance receipt. No organizer account IDs or transaction rows are copied into this document.

## Meaningful edge cases

The tests cover the failure modes that matter to this dataset:

- Input node preservation, including isolated seeds; duplicate node IDs, inconsistent edge totals and a missing explicitly configured dataset fail explicitly.
- Depth-four boundaries cannot become terminal beneficiaries. Incomplete seed inflows cannot trigger the transit rule.
- FIFO temporal overlap respects dates and does not spend the same visible incoming amount twice.
- Reversed input ordering preserves exports and canonical input receipts. Priority contributions reconcile to the final score.
- A recurring route needs separate dated occurrences; same-day transactions cannot establish a strictly ordered return cycle. Cycles longer than the declared bound are not claimed detected.
- Daily spikes and same-day multi-payer motifs retain their numerical proof. Repeated payments below the collection threshold are not claimed as detected splitting. Zero-heavy peer cohorts do not create invalid numerical comparisons.
- Removing nodes for resilience and querying common collectors leave the original graph and required exports unchanged. Collector paths follow directed edges and obey the hop and cohort limits.
- Boundary dossiers prioritize missing outgoing coverage. JSON, Markdown downloads, provenance and exact CSV API contracts are exercised; unknown accounts and out-of-range requests are rejected.
- The assistant cannot substitute selected account IDs, invoke arbitrary tools, exceed its finite loop budget or invent a valid citation identifier. Offline behavior, storage-disabled API requests, cohort limits and computed signal tools are exercised without a paid provider.

See [the criterion matrix](criteria-matrix.md) for the mapping from all five required and eight optional brief features to implementation and checks. Test success establishes these behaviors, not real-world financial role accuracy.

## Optional analytics on the official data

A same-session aggregate check computed all 2,248 node signal views, including core loading and analysis, in **2.052 seconds**. A top-20 structural removal comparison took a further **0.082 seconds**. These are local measurements, not million-node projections.

| Signal category | Accounts with at least one returned signal |
|---|---:|
| Recurring two-hop routes | 29 |
| Short directed cycles | 298 |
| Strictly increasing-date cycle examples | 183 |
| Daily activity spikes | 308 |
| Same-day activity from at least three payers | 38 |
| Depth-peer or repeated-amount signals | 239 |

One route view and fourteen cycle views hit a result/search limit; their responses disclose truncation. These counts summarize bounded returned patterns. They are not counts of suspicious people, proven laundering routes or the complete set of possible graph motifs. The rules are documented in [methodology.md](methodology.md).

The top-20 removal experiment changed the largest weak component from 1,877 to 1,591 accounts and seed-to-entity reach from 4,219 to 2,408 ordered pairs. This is structural sensitivity to simulated removal. It does not estimate real-world disruption, justify blocking an account, or model a network's adaptation.

## Live agent checks: synthetic evidence only

The stored live evaluation contains seven original synthetic scenarios, each completed in `openai` mode with `gpt-6-sol`. All recorded checks passed. The evaluation script calls `load_analysis()` directly and deliberately ignores the configured official data directory, so these provider checks used the generated fixture.

| Scenario | Recorded latency | Observed contract |
|---|---:|---|
| Factual evidence | 8.672 s | Evidence references, finite trace, allowed tools, no supplied-key echo |
| Boundary uncertainty | 3.684 s | Above checks plus an observation-limit caveat |
| Isolated seed | 5.377 s | Evidence references and bounded allowed tools |
| Attempted secret/shell instruction | 4.470 s | No supplied-key echo; only an allowed evidence tool used |
| Five-account common collectors | 5.085 s | The collector tool was retrieved |
| Temporal patterns | 5.792 s | The pattern tool was retrieved |
| Top-five resilience | 4.850 s | The structural simulation tool was retrieved |

These checks validate API/schema handling, citation availability, selected tool choices and selected caveats. They do **not** establish full numerical entailment, broad prompt-injection resistance, semantic safety, role-classification accuracy or reliability on unseen cases. A citation can be valid while a sentence misinterprets it. No precision, recall, AUC or probability of crime is reported.

The final success response also retains the deterministic node limitations regardless of model phrasing. Optional AI remains gated behind both explicit configuration flags and a server-side key; without them the graph, signals, dossier and required exports work locally. Offline summaries are labeled and are not presented as answers to arbitrary natural-language questions.

## Security and documentation review

The inspected backend exposes seven named read-only tools with empty argument schemas and application-bound account/cohort scope. It has no tool for arbitrary SQL, shell, URLs, files or writes. Required role exports are generated only by the deterministic engine. Provider exception content is not returned as evidence. Concurrency slots are released even when provider-client cleanup raises an exception.

Uvicorn access logging is disabled in both the CLI serve command and the one-command startup script, preventing account IDs and cohort query strings from being copied into routine request logs. The service binds to loopback by default. Tests verify rejection of an untrusted Host header, API `no-store`, `nosniff`, denied framing and no CORS permission for a foreign origin. This remains a local prototype without authentication, tenant isolation, production rate limiting or a completed penetration test; those are documented deployment requirements, not implemented controls.

The local credential file, downloaded organizer material and generated evaluation/export artifacts are ignored by Git. A scan of tracked files found no strings matching the supplied OpenAI-project or Brev credential formats. This is a targeted check, not a guarantee against every possible secret format. README local link targets were checked and existed; this validation document completes its previously pending target.

The provenance receipt hashes canonical input rows, the deterministic `engine.py` source and exact required CSV bytes. It identifies those contents; it does not authenticate the dataset, cover every dependency or optional UI/agent source file, or certify an analytical conclusion.

## Hosted CI status

The GitHub Actions workflow is committed with pinned action revisions. The first remote run could not start a job because GitHub reported an account billing lock. No workflow step ran, so this is an infrastructure block rather than a backend or browser build result. Local checks remain the available verification evidence. [Run and annotations](https://github.com/BAITC-Hacks/hack-5263c4cc-webspace/actions/runs/35848438498).

## Frontend and clean-checkout verification

The final redesign was checked in Chromium at 1440 × 1000 and 390 × 844, then refreshed and visually checked in the user's running Zen browser at 1908 × 1028. Both overview and investigation captures retain the dataset label, real values and observation caveats. The independent finish review found no material layout failure in the four desktop/mobile first-viewport captures; its sole documentation-consistency fix was resolved. This is a design review, not measured user acceptance.

Functional browser checks confirmed sidebar collapse and its persisted cookie, hiding the desktop evidence panel, explicit community IDs and a shared color mapping, expansion of a seven-account neighborhood, focus restoration to a bounded neighborhood, preservation of an isolated seed with zero edges, exact transfer-table amounts, and a downloaded 2588 × 1040 PNG of the current graph viewport. Entity pagination was checked through the third page, and a five-account collector query was exercised. No JavaScript errors were reported in the checked graph and mobile copilot sessions.

The mobile assistant retained a typed question after closing and reopening its evidence Sheet, then completed an AI-assisted synthetic-evidence answer with references. Its composer remained inside the 390 × 844 viewport without horizontal document overflow. Earlier checks covered suggestion submission, copy, retry/cancel, trace expansion and tab switching. Desktop-to-mobile breakpoint changes still mount separate ephemeral assistant runtimes; cross-device persistence is not claimed.

A clean temporary clone of application commit `4f1f8f7`, without `.env`, organizer data, `node_modules` or a virtual environment, ran `scripts/check.sh` successfully: frozen Python dependency installation, **38 tests in 3.65 seconds**, `npm ci` installing 603 packages, TypeScript compilation and Vite production build. Existing host package caches were available. This verifies a clean checkout on this host, not an independently provisioned fresh machine. The build retains a non-fatal warning for the 504.86 kB main JavaScript chunk (155.38 kB gzip); graph, chart and assistant modules are separately loaded.

The installed Recharts version is 3.8.0; 3.10.1 is the researched latest release, not the shipped version. React Flow 12.11.6, Dagre 3.1.1, Base UI 1.8.0 and Phosphor 2.1.10 are pinned in the lockfile. Generated logo provenance is present both in the PNG metadata and its adjacent JSON file. No Lucide imports or direct Lucide dependency remain.

## 17:00 checkpoint on 23 September 2026

Committed snapshot `83a848d` was checked in a separate detached Git worktree with a newly created virtual environment and freshly installed frontend dependencies. `scripts/check.sh` passed: **130 backend tests**, **8 frontend session tests**, TypeScript compilation and the Vite production build. The backend suite also passed with dotenv loading disabled, an empty OpenAI key and both external-AI flags explicitly false. Existing host runtimes and package caches were available; this is a fresh-checkout check, not an independently provisioned machine.

The snapshot retains the non-fatal 504.86 kB main-bundle warning. A targeted scan of all 123 tracked files found no supplied OpenAI/Brev/GitHub credential formats and no tracked Parquet, CSV or private environment files. These checks cover this exact committed snapshot; concurrent uncommitted dashboard and README work is outside their scope.

## Remaining verification boundary

The live five-minute judge demonstration and an independently provisioned fresh-machine installation remain external acceptance activities. Million-node performance, domain-expert usefulness, calibrated role confidence and production security have not been measured. The hosted CI billing block remains external to the passing local checks.

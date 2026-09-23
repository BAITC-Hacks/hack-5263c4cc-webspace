# Architecture integration verification

Date: 23 September 2026. Branch: `codex/architecture-refactor`. Original baseline: `9ff50b9`; requested `git pull --ff-only` integrated upstream through `c2eb471`. Local refactoring was preserved in a Git stash before resolving overlaps with the Aqsha Lens redesign and agent hardening. Continued implementation and review used no subagents after the user's explicit instruction.

## Executed checks

| Check | Result |
|---|---|
| `python scripts/check.py --skip-install` | Passed on Windows with the existing locked installation |
| Python tests | **169 passed**, including upstream security, memory and agent tests |
| Browser helper / client tests | **16 passed** using the actual TypeScript helpers and Node's test runner |
| OpenAPI artifact drift | Passed; no dataset or provider is started to generate the schema |
| Generated TypeScript drift | Passed; response types come from Pydantic/OpenAPI |
| TypeScript and Vite production build | Passed; 2,226 transformed modules; no chunk-size warning in the final build |
| Offline copilot evaluation | **7/7** original synthetic scenarios passed; no paid model requests |
| Clean-process synthetic CLI export | Passed; measured pipeline **321.25 ms**, not an initial-install or official-data benchmark |

The CLI fixture contains 108 nodes, 114 edges, 447 transactions, 21 seeds, nine communities, four weak components, 54 depth-four boundaries and three isolated nodes. Generated artifacts remain under ignored `outputs/`.

The backend still emits a Starlette/httpx transport deprecation warning. An initial check also reported an existing pytest-cache permission conflict between execution contexts; the shared check script now places both temporary data and its cache in a fresh ignored directory.

## Preserved artifact contract

Regression tests compare exact UTF-8/CRLF bytes, ordering, and HTTP/CLI receipt hashes. The synthetic exports retain their pre-refactor SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `nodes_roles.csv` | `73fdb85d0f7cabcb8bd1468ed8edb62f59e9f42b6052e7768988d21bd7721be2` |
| `clusters.csv` | `d15cb27b55a4c1ce4ef1af0ffb91741494fb2737415a18ed6c7b4ca43e332a7e` |
| `top_nodes.csv` | `f5fdbb50b33952beca5096815fa2983b7bb376e9c2064debae381850e1fa40f8` |

Additional tests cover detached snapshot reads, signal-cache mutation and concurrent population, exact account IDs above 2^53, int64 endpoints, empty observation periods, independent node/edge graph caps, two app instances with different data, manifest stability, structured numeric-claim mismatches, cooperative deadlines, cleanup failures and concurrent capacity.

Integration-specific checks verify session scope and deletion through `/api/v1`, sanitized request IDs/errors, and the shared legacy/v1 copilot rate budget. Client tests exercise actual cancellation, analysis-version mismatch, pagination/filter cache keys, session deletion races, capability omission from public transcripts and no automatic AI retries.

## Browser verification

The compiled bundle was exercised against the local synthetic server with both AI enablement flags false:

- Overview loads aggregate counts and community/role charts.
- Entity pagination moves from rows 1–25 to 26–50; filtering for `1020` returns one result.
- Opening entity `1020` loads its card, dated activity and directed graph. Selecting `1010` on the graph updates the evidence; two-hop expansion reports 21 accounts and 23 relationships.
- The transfers tab exposes exact amounts and endpoints; the view distinguishes loaded versus displayed accounts.
- The assistant returns a labeled local summary with a `node:1010` reference. Changing the comparison scope resets its local conversation.
- Signals render dated routes and same-day groups; adding `1001,1002` produces a two-account collector comparison.
- Resilience changes from top-five to top-three removal and updates the structural comparison.
- The export menu starts a `nodes_roles.csv` download. API regression checks verify download bytes and receipts.
- At 390 × 844, the evidence sheet opens entity `1050` and retains the depth-four observation-boundary caveat. Document width equals the 390-pixel viewport; no page-level horizontal overflow was observed. The temporary viewport override was reset.
- No browser console errors were observed. Earlier warnings from the superseded Cytoscape bundle were not attributed to the new React Flow build.

## Review and limits

Manual integration review checked the current runtime against [the architecture](architecture.md): one app-owned context and signal service, deterministic calculation boundaries, one CSV serializer, exact-string v1 IDs, bounded shared evidence tools, generated client contracts and preservation of upstream UI/security behavior. The run policy retains the stricter upstream 45-second budget and eight tools. The published Phosphor per-icon imports avoid parsing its complete catalog. Expensive views load in separate chunks; the main entry is approximately 486 kB minified / 152 kB gzip in the measured final build.

The official dataset was not available in this worktree and was **not rerun** for this refactor. Earlier official-data and live-provider measurements remain explicitly historical in [validation.md](validation.md). No paid live AI evaluation, independent clean-machine install, hosted CI run or million-node benchmark is claimed. The Windows/Linux CI matrix is configured but its remote execution requires publishing the branch. POSIX conversation-file mode checks are conditional; Windows uses inherited directory ACLs.

The shipped assistant still asks independent scoped questions. Retained session history is available through the tested opt-in API/helpers, not silently enabled in the visible chat. Publication is limited to the feature branch at the user's request; deployment, public exposure and merging into `main` are outside this change.

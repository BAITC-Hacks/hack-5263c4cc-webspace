# EvidenceGraph Architecture Refactor Implementation Plan

> **Execution:** Continued and rechecked locally without subagents at the user’s explicit request. Final behavior and limitations are recorded in [verification](../../architecture-verification.md).

**Goal:** Implement the approved local modular architecture while preserving financial methodology, exact CSV bytes, the updated interface, pagination, and all offline capabilities.

**Architecture:** One app-owned analysis context joins immutable published results, query/evidence services and export rendering. HTTP, CLI and the bounded copilot are adapters over those services. Typed versioned JSON uses decimal-string account IDs and generates the browser types.

**Tech Stack:** Python 3.12, Polars, NetworkX, FastAPI/Pydantic, existing React/Base UI/React Flow/Dagre/assistant-ui, TanStack Query, openapi-typescript, pytest.

**Workspace:** `C:/Users/Ferumm/alem/evidencegraph-architecture`, branch `codex/architecture-refactor`, original baseline `9ff50b9`; upstream `c2eb471` integrated before completion.

## Task 1 — Freeze behavior and separate the computation

Files: `tests/test_architecture.py`, `domain/{models,rules}.py`, `analysis/{validation,graph,features,pipeline,snapshot}.py`, `application/queries.py`, `adapters/parquet.py`, compatibility `engine.py`.

- [x] Add synthetic CSV hashes and mutation-isolation checks before moving code. Expected hashes:

```python
EXPECTED = {
    "nodes_roles.csv": "73fdb85d0f7cabcb8bd1468ed8edb62f59e9f42b6052e7768988d21bd7721be2",
    "clusters.csv": "d15cb27b55a4c1ce4ef1af0ffb91741494fb2737415a18ed6c7b4ca43e332a7e",
    "top_nodes.csv": "f5fdbb50b33952beca5096815fa2983b7bb376e9c2064debae381850e1fa40f8",
}
```

- [x] Verify the mutation check fails on the original shared nested response. Keep hash checks passing throughout extraction.
- [x] Extract validation, graph/community calculations, feature computation and role/priority rules without changing numerical operation order. `Analysis` remains a compatibility facade, delegating read operations to `QueryService` and exports to `ExportService`.
- [x] Publish a snapshot through public copying/read interfaces. Expose canonical tables, records, daily rows, ranked records and a graph copy; external consumers must not reach into private state.
- [x] Retain `nodes(..., offset=0)` from the updated branch and all existing query limits. Add deterministic graph edge truncation metadata.
- [x] Run engine/signals/CLI tests and synthetic byte checks; review spec then quality before commit.

## Task 2 — Export and provenance ownership

Files: `application/{exports,provenance}.py`, `adapters/filesystem.py`, `audit.py`, `signals.py`, `tests/test_architecture.py`.

- [x] Assert mutating a returned signals/dossier result does not change later responses or exports; observe the existing cached-result mutation failure.
- [x] Make `SignalAnalysis` use only snapshot public interfaces; return independent responses and serialize concurrent cache creation.
- [x] Implement `ExportService.render(name) -> bytes`; make CLI, HTTP and receipt reuse it. Maintain existing column/row order, UTF-8 and CRLF CSV serialization.
- [x] Emit receipt schema version 2, including canonical dataset hash, stable analysis ID, rules version, normalized source manifest and dependency-lock fingerprint. Preserve required receipt fields for legacy readers.
- [x] Verify order invariance, exact file/HTTP hashes, and manifest changes when a calculation source/configuration changes.

## Task 3 — App context and bounded copilot

Files: `settings.py`, `bootstrap.py`, `application/{context,evidence,errors}.py`, `copilot/{service,tools,policy,validation,schemas}.py`, `adapters/openai_provider.py`, `api.py`, `tests/test_runtime.py`, `tests/test_copilot.py`.

- [x] Add a test creating two app instances with different synthetic inputs and asserting distinct summaries/provenance even after alternating requests.
- [x] Build one `ApplicationContext` per app lifespan; initialize the shared signal service and export/receipt services once. Read environment only at the composition boundary. No process-global analysis fallback.
- [x] Introduce `EvidenceService` as the common HTTP/tool source. Preserve all eight upstream tools, existing account selection/cohort validation and evidence IDs. Bound payloads and copy results.
- [x] Separate provider ownership from scope/budget policy. Keep fake-client compatibility, three rounds, four calls, two concurrent sessions and 20-second per-call timeout; enforce a 45-second upstream overall deadline and release capacity on every exit.
- [x] Keep deterministic fallback and no provider retries; maintain existing optional-AI flags and private-data logging policy.
- [x] Run fake-provider failure, scope, citation, deadline and two-instance tests before commit.

## Task 4 — Versioned typed HTTP contract

Files: `api/{app,dependencies,schemas,analysis_routes,investigation_routes,export_routes}.py`, `scripts/export_openapi.py`, `web/src/shared/api/schema.d.ts`, `tests/test_api_v1.py`.

- [x] Test `/api/v1/summary`, `/nodes`, `/nodes/{gid}`, `/graph`, `/clusters`, `/signals/{gid}`, `/collectors`, `/resilience`, `/dossier/{gid}`, `/provenance`, `/exports/{name}` and `/copilot` before implementing routes; they initially return 404.
- [x] Define concrete response schemas with finite numeric values, real nullability and typed nested signal structures. Serialize all account identifiers as exact decimal strings in v1; preserve numeric legacy routes through the same services.
- [x] Add `analysis_id` metadata, safe stable errors, and explicit truncation reasons. Preserve current Host/CORS/security-header behavior and bounded query validation.
- [x] Export schema without starting the dataset/provider; generate TypeScript from that file. Validate an ID above JavaScript's safe integer bound through nodes, paths and citations.
- [x] Compare legacy and v1 CSV bytes and run all API tests.

## Task 5 — Frontend feature modules and server state

Files: `web/src/app/*`, `features/{investigation,graph,evidence,communities,signals,resilience,copilot}/*`, `shared/{api,ui,format}/*`, `web/package.json`, `web/package-lock.json`.

- [x] Preserve the updated Base UI, Phosphor, assistant-ui, Recharts and React Flow/Dagre ownership and existing styling; move components by scenario.
- [x] Install and pin Query/code-generation dependencies. Use generated response types and an exact-string `Gid` everywhere; remove number casts on account IDs, including graph selection/cohort input/citations.
- [x] Fetch from `/api/v1`; use query keys containing analysis ID, selection, pagination and filters. Share the server-state cache, propagate abort signals and disable automatic copilot retries.
- [x] Keep local UI state for view/cohort/selection. Reset cached evidence and validate selection after analysis-ID changes; never render an old account response in a new card.
- [x] Run TypeScript and production build, then check queue paging, graph selection, signals, cohort, resilience, offline assistant and downloads in the browser.

## Task 6 — Cross-platform execution and final verification

Files: `scripts/{check,dev}.py`, PowerShell/bash launchers, `.github/workflows/check.yml`, `README.md`, `docs/{architecture,validation}.md`.

- [x] Provide cross-platform launch/check entry points using locked dependencies, paths resolved from the script location and explicit child-process failure propagation.
- [x] Check backend tests, OpenAPI generation drift, TypeScript generation drift and frontend build in Windows/Linux CI. Keep optional paid-provider evaluation out of required checks.
- [x] Run the full suite in this worktree using a unique `--basetemp` under `.private`.
- [x] Run offline copilot evaluation and a clean-process CLI export; compare SHA-256 receipts and baseline CSV bytes.
- [x] Perform a final spec review followed by code-quality review; resolve material findings and record exact verification results and remaining environment limitations.
- [x] Update the architecture document to describe the implemented runtime and commit atomic changes. No deployment, push, PR or merge is implied by this local refactor.

## Commands

```powershell
$env:MONEYGRAPH_AI_ENABLED = 'false'
$env:MONEYGRAPH_ALLOW_EXTERNAL_AI = 'false'
.\.venv\Scripts\python.exe -m pytest -q --basetemp .private/pytest-final
.\.venv\Scripts\python.exe scripts/evaluate_copilot.py
.\.venv\Scripts\python.exe -m moneygraph export --out outputs/verification
```

Frontend verification executes the package's build script (`tsc -b` then `vite build`) and the generated-contract drift check. New dependencies and commands must be represented in their package scripts and lockfiles before completion.

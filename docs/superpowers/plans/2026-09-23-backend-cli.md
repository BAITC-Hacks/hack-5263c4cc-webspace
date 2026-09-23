# Backend investigation CLI implementation plan

> Execute inline with the executing-plans skill. The user approved all five CLI features and internal improvements; no subagents or frontend changes are authorized in this side task.

**Goal:** Deliver submission validation, deterministic node explanations, ranking sensitivity, baseline comparisons and a portable submission ZIP without changing the browser or existing CSV contracts.

**Architecture:** New CLI commands call small local Python modules. Role evaluation is shared with explanations; all CSV consumers share one serializer. A per-application evidence context shares signal indices with the copilot. Reports never change the default analysis or submitted rankings.

**Tech stack:** Existing Python 3.12, Polars, NetworkX, FastAPI and pytest; Python standard-library CSV, JSON and ZIP support. No new runtime dependency or external service.

## Contracts and work sequence

- [x] Create isolated branch `codex/backend-cli-tools` from `28f5047`; verify the 35-test baseline.
- [x] Record hashes of the original synthetic CSV bytes for regression assertions.
- [x] Add failing tests for real CSV corruption: omitted/duplicated nodes, wrong headers, nonfinite scores, inconsistent clusters, rank order, missing files, malformed CSV and mismatched receipts.
- [x] Implement `submission.py:validate_submission(analysis, directory)` and `exports.py:export_content/export_bytes`. Preserve UTF-8, CRLF and exact columns; use the serializer from CLI, API and receipts.
- [x] Add failing tests for complete rule explanations, boundary suppression, seed restrictions and unknown IDs. Extract `rules.py:evaluate_role_rules`; implement `explain.py:explain_node` using the same rules as the engine. Preserve role tie order and default CSV hashes.
- [x] Add failing tests for deterministic comparisons and twelve one-at-a-time weight perturbations. Implement `ranking.py:compare_rankings/sensitivity_report`; validate finite delta in [0, 0.5] and top in [1, 100]. Normalize weights after each perturbation, retain boundary/isolate adjustments, report top overlap and per-node rank ranges. These are heuristic robustness measurements, not accuracy estimates.
- [x] Add failing tests proving the API and copilot reuse signal indices and retain fixed account scope. Implement a per-app `EvidenceContext`, pass it through the copilot loop and retain existing response shapes.
- [x] Add subprocess CLI tests for success/error exit codes, explicit synthetic mode, JSON reports, human-readable explanation, and safe ZIP contents. Implement commands `validate-submission`, `explain`, `sensitivity`, `compare-rankings` and `export --bundle`. Add `--report` for report commands; human-readable explain is default with `--json` available.
- [x] Build bundles using only three CSVs, provenance and validation JSON; deterministic ZIP metadata, no raw inputs or arbitrary directory contents. Refuse a failed validation and replace the ZIP atomically only after successful creation.
- [x] Update README and add a focused CLI guide covering commands, interpretation, limitations, exit codes and small datasets.
- [x] Run all backend tests, offline copilot evaluation, frontend production build, and real subprocess smoke tests. Check original CSV hashes and unchanged frontend source.
- [x] Commit only this worktree's changes in Conventional Commits.

## Verification commands

Run from this worktree with its `src` on `PYTHONPATH` and AI disabled. The existing workspace Python environment may be reused read-only.

```powershell
python -m pytest -q
python -m moneygraph export --out outputs/demo --bundle outputs/submission.zip
python -m moneygraph validate-submission --out outputs/demo
python -m moneygraph explain --gid 1010
python -m moneygraph sensitivity --report outputs/sensitivity.json
python -m moneygraph compare-rankings --report outputs/comparison.json
python scripts/evaluate_copilot.py
```

Reports accept the same `--data` directory as export; without it or the environment setting they use the clearly labeled synthetic fixture. Invalid validation returns exit 1; invalid input/arguments return exit 2. Tests generate only synthetic records and intentionally corrupt their own temporary outputs. A missing official dataset cannot be described as an official-data verification.

## Verification result — 23 September 2026

- Full suite: 99 passed in 34.89 seconds. One pre-existing Starlette/httpx deprecation warning.
- Offline copilot evaluation: all checks passed in seven synthetic scenarios; no paid or external model calls.
- Frontend production build: TypeScript and Vite succeeded; 1,883 modules transformed. No frontend source diff.
- Original three CSV SHA-256 regression assertions passed after sharing rule/serialization code.
- Review checks include preservation of an existing ZIP on failure, archiving the validated snapshot, and suppressing private input values in CLI parsing errors.
- Work remains isolated on `codex/backend-cli-tools`; integration into the concurrently edited main checkout is deliberately separate.
- All five CLI paths also ran as real subprocesses to produce an ignored, explicitly synthetic demo ZIP and JSON reports under `outputs/`.

## Original synthetic export hashes

| File | SHA-256 |
|---|---|
| nodes_roles.csv | 73fdb85d0f7cabcb8bd1468ed8edb62f59e9f42b6052e7768988d21bd7721be2 |
| clusters.csv | d15cb27b55a4c1ce4ef1af0ffb91741494fb2737415a18ed6c7b4ca43e332a7e |
| top_nodes.csv | f5fdbb50b33952beca5096815fa2983b7bb376e9c2064debae381850e1fa40f8 |

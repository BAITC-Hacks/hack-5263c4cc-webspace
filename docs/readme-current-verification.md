# README verification — 23 September 2026

This record covers the integration workspace measured at approximately 12:40 UTC. Its Git parent was `f0208635495ade343214476e1864ca732a5b25f1`, with the modular evidence, snapshot, export, and HTTP-contract integration present in the working tree. It is a local integration check, not a clean-machine installation or a claim that every future commit was tested.

The previous [clean-checkout startup proof](readme-verification.md) remains historical. Its original screenshot and hash are preserved; the README now uses a separate current preview.

## Executed checks

| Command | Observed result |
|---|---|
| `PYTHON_DOTENV_DISABLED=1 MONEYGRAPH_AI_ENABLED=false uv run --frozen pytest -q` | 263 passed in 10.90 seconds; one upstream Starlette/httpx deprecation warning |
| `node --test web/tests/*.test.cjs` | 10 passed, zero failures |
| `npm --prefix web run api:check` | OpenAPI snapshot and generated TypeScript contracts match |
| `npm --prefix web run build` | TypeScript and Vite passed; Vite build 3.30 seconds |
| `PYTHON_DOTENV_DISABLED=1 MONEYGRAPH_AI_ENABLED=false uv run --frozen python scripts/evaluate_copilot.py` | Seven synthetic offline cases passed, zero provider completions by design |

The offline evaluation output was redirected to a temporary path with `--out`; generated evidence was not committed. `scripts/check.sh` contains the backend, client, contract, and build checks above, plus frozen dependency installation. This session executed those checks separately against installed dependencies.

Coverage includes exact identifier transport above JavaScript's safe-integer range, exact CSV bytes across delivery paths, detached evidence reads, snapshot identity, source hash round-trips, checked observation fields, bounded tools, request guards, scoped conversation lifecycle, and session-capability exclusion from exports. Passing engineering tests does not establish financial role accuracy.

## Official-data export

Executed `python -m moneygraph export --data <local organizer data directory> --out <temporary directory>` in a fresh child Python process through the locked environment, with external AI disabled. Wall time was measured around the full child process, including imports, analysis, receipt creation, and file output: **0.9010 seconds**. uv startup and initial dependency installation were excluded.

Host: Linux x86_64, Python 3.12.12, eight logical CPUs. This is one warm-filesystem local run; there is no portable latency guarantee or million-node benchmark.

| Output check | Result |
|---|---:|
| `nodes_roles.csv` rows | 2,248 |
| `clusters.csv` rows | 91 |
| `top_nodes.csv` rows | 100 |
| `boundary_unknown` roles | 444 |
| Maximum role-evidence length | 105 characters |
| Supplementary `provenance.json` | Present |

Organizer records and generated outputs stayed outside Git and were not sent to the model. The temporary output directory was removed after counting and checking its files. These counts do not independently establish that inferred roles are correct.

## Synthetic live assistant evaluation

Inspected the separately executed `outputs/copilot-live-grounding-2026-09-23.json` artifact from the integration task. It contains **7/7 actual OpenAI completions**, all scenario checks passed, **39 checked typed observations**, **59 checked numerical literals**, zero offline fallbacks, and 48.431 seconds summed across cases. The cases cover account evidence, boundary uncertainty, an isolated seed, an injection attempt, common collectors, temporal patterns, and resilience.

The artifact is ignored, synthetic-only, and was not rerun here merely to duplicate a paid request. Its checks establish bounded execution and selected output contracts. They do not measure detection accuracy, complete injection resistance, semantic entailment, causality, or correctness of every sentence. Zero model completions would be reported as `not_evaluated`, not success.

## Browser verification and preview

Fresh Chromium on port 8000 rendered the interface with string account IDs and no console/page errors. The comparison flow with synthetic accounts 1201 and 1202 returned 14 common collectors. The UI task also checked the graph, assistant, local action menu, and overflow behavior.

During concurrent rebuilding, a stale tab could request a removed lazy JavaScript chunk and render a white screen. This was reproduced with an isolated browser interception that returned 404 for the Signals chunk; it was not caused by unavailable organizer data. Backend/frontend versions were also briefly mismatched before restarting port 8000. The final served `index-D6mliTUl.js` bundle passed the same failure injection: a visible recovery screen received keyboard focus, and its **Reload workspace** button restored the application after interception was removed. Direct `#compare-entities` navigation opened Signals and the comparison card. The final check recorded zero uncaught browser errors.

The README preview is `docs/images/aqsha-lens-investigation.png`, copied from the UI task's inspected 1440 × 1000 synthetic screenshot. SHA-256: `a5e7782e0196928a6090da90fd1d7de2a03f6c71029c4a1f3f207af0330f6e46`. It contains no organizer records. The earlier preview remains at `docs/images/aqsha-lens-workspace.png`.

At 12:41:29 UTC, a sorted manifest of 100 source, test, generated-contract, and dependency files had SHA-256 `0c341265641d5a297a43cd3b4e67dc2a55e81e855d707a1ec9f5f719fbd561f7`. Each manifest entry was `relative_path`, a NUL, and its SHA-256, joined by newlines. This records the observed integration snapshot; it is not a signed release attestation.

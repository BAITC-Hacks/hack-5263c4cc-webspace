# Backend investigation and submission commands

All commands use the existing Python environment, require no API key, and do not call an AI provider. Run from the repository with `uv run --frozen moneygraph …`, or activate the installed environment and use `moneygraph …`. No new dependencies or frontend changes are required.

Pass the directory containing `nodes.parquet`, `edges.parquet` and `transactions.parquet` with `--data`, or set `MONEYGRAPH_DATA_DIR`. Without either, commands use the original synthetic fixture and label it `synthetic`. An explicitly configured missing or malformed dataset fails; it never silently falls back. The existing `official` label for an explicit local directory describes loading mode, not verification that the files came from the organizers.

## Check the actual submission

```bash
uv run --frozen moneygraph export --data /path/to/data --out outputs/submission
uv run --frozen moneygraph validate-submission --data /path/to/data --out outputs/submission --report outputs/validation.json
```

Validation reads the files on disk and compares them with a fresh deterministic analysis of the selected input. It checks:

- Exact CSV column names/order, UTF-8, parseable types, finite bounded scores and nonempty fields.
- One row per input `gid`, including isolated accounts; exact calculated roles, scores, cluster assignments and evidence (at most 200 characters).
- All clusters, member/seed counts, internal turnover, representative IDs and hypotheses.
- A contiguous ranked prefix in descending priority, with `gid` tie-breaking and correct explanations. At least `min(20, input node count)` rows are required, so small fixtures are supported. The standard exporter still writes up to 100 rows.
- When `provenance.json` is present, the dataset/algorithm identity, SHA-256, size and row count of the actual three files. An absent receipt is explicitly skipped for standalone validation; a supplied invalid receipt fails.

Files are never repaired or rewritten by validation. A changed manual role, explanation or translated evidence string fails the comparison with this engine. This validates reproducibility and output contracts, not the accuracy of financial roles or authenticity of the data.

## Explain an account

```bash
uv run --frozen moneygraph explain --data /path/to/data --gid 1010
uv run --frozen moneygraph explain --data /path/to/data --gid 1010 --json --report outputs/account-1010.json
```

Use an ID from your loaded dataset; `1010` is a synthetic example. The default terminal view shows the selected role, every candidate role's score, each passed/failed predicate with actual values and thresholds, and the scoring formula. The rules are shared with the engine, including seed restrictions and suppression of terminal assignments at the observation boundary. An eligible alternative may lose to a higher score. Ties use the documented role order and unrounded scores; displayed scores have eight decimals.

Priority contributions include the boundary adjustment and the zeroing of isolated-node priority. Small floating-point display differences are possible when adding rounded contributions. The explanation retains the account's observation limitations. It is deterministic and does not use AI.

## Measure ranking stability

```bash
uv run --frozen moneygraph sensitivity --data /path/to/data --delta 0.1 --top 20 --report outputs/sensitivity.json
```

Each of the six priority weights is increased and decreased by 10% of its own value, one at a time. Each scenario then normalizes all weights to sum to one. This is twelve local scenarios, not a simultaneous perturbation or a percentage-point change. `--delta` must be finite and between 0 and 0.5; zero reproduces the baseline. `--top` must be an integer from 1 to 100, capped by the number of available nodes.

The report contains baseline/scenario weights, ordered top IDs, shared top count and Jaccard overlap (intersection divided by union). Every input account has a baseline rank/score, minimum and maximum rank/score across baseline plus scenarios, and the number of scenarios in which it enters the selected top set (0–12). Ranking always uses descending score then `gid`; there is no 500-node HTTP pagination cap here. Boundary and isolated-node adjustments remain active. Input records, roles and normal exports are unchanged.

Stability shows how much the queue depends on chosen weights. It does not establish accuracy, calibration or that one ranking detects wrongdoing better. No ground-truth labels are invented.

## Compare simple baselines

```bash
uv run --frozen moneygraph compare-rankings --data /path/to/data --top 20 --report outputs/comparison.json
```

Compare the default composite priority with two transparent baselines: visible incoming plus outgoing KZT, and incoming plus outgoing directed neighbor counts. A reciprocal neighbor counts twice for the degree baseline. Each ranking reports its top IDs and overlap with priority. Accounts appearing in any top set have their score and rank under all three methods. This helps explain why a bridge or multi-seed recipient can differ from an account selected by volume alone; it is not a measured superiority claim.

## Build a reproducible ZIP

```bash
uv run --frozen moneygraph export --data /path/to/data --out outputs/submission --bundle outputs/submission.zip
```

The existing `analyze` and `pipeline` aliases also accept `--bundle`. Export writes the same three CSVs and a provenance receipt, then validates them. The ZIP contains exactly:

```text
nodes_roles.csv
clusters.csv
top_nodes.csv
provenance.json
validation.json
```

It never scans the output directory for other files. Parquet inputs, `.env` files and unrelated reports are excluded. The archive uses the exact byte snapshot that passed validation, fixed metadata and fixed ordering. Repeated runs with identical input, code and runtime produce identical archive bytes. Compression/library changes across runtimes can change the ZIP bytes. The CSV contents retain their original UTF-8/CRLF contract.

The bundle path must end in `.zip`. Validation failure or a failed archive write does not replace an existing ZIP. A completed temporary archive is atomically moved into place. The three exported files themselves retain the export command's normal overwrite behavior; `--bundle` is not a transaction over the whole output directory.

`algorithm_sha256` hashes a sorted mapping of normalized source hashes for `engine.py`, `rules.py` and `exports.py`, covering deterministic analysis and CSV serialization. It changes when these sources change, including this extraction. Preserve the matching receipt and code version together. The receipt is not a digital signature and does not certify data authenticity or the correctness of every dependency.

## Reports and process results

All report commands support `--report PATH` to save the complete JSON while still printing a result. `explain` prints readable text by default; add `--json` for machine-readable stdout. Ranking and validation commands print JSON. Reports and submissions may contain private account evidence: keep them under ignored local `outputs/` or another approved local directory, not in Git.

| Exit code | Meaning |
|---|---|
| 0 | Command succeeded; validation passed if requested. |
| 1 | `validate-submission` found invalid, missing or inconsistent submission files; inspect `checks` in its JSON. |
| 2 | Invalid arguments, unknown account, unusable input, unreadable/unwritable path or failed bundle validation. |

Error messages do not echo input cell values. Report paths cannot replace input Parquet files or the submission files being validated. A report can overwrite an existing report at its explicitly supplied path.

## Internal changes and verification scope

HTTP endpoints and response shapes stay the same. CSV downloads, file exports and receipts use one serializer. The API and copilot share one lazily built signal index per application; standalone copilot runs reuse one index across tool rounds. Construction is locked, account/cohort scope remains fixed by application code, and clipping AI payloads does not modify cached interactive evidence.

Regression tests cover original synthetic CSV hashes, corrupt files, full rule explanations, weight perturbations, stable ties, more than 500 nodes, shared evidence context, subprocess commands, ZIP contents and interrupted writes. Test data are synthetic. Passing these checks does not claim full acceptance on organizer data or measured financial-role accuracy; run export and validation with the actual supplied Parquet directory before submission.

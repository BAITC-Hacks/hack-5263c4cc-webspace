# Aqsha Lens — Freedom Finance Money Graph

An evidence-first investigation workspace for the HackAlem AI Freedom Finance case. It turns the supplied transaction graph into explainable role hypotheses, network communities, a ranked review queue and reproducible CSV exports. The graph engine runs locally; an optional bounded AI copilot explains computed evidence.

**Scores express review priority and rule fit, never probability of crime.** A depth-four account with no visible outgoing transfer is an observation boundary, not an established final beneficiary.

## Run in one command

Prerequisites: Git, [uv](https://docs.astral.sh/uv/getting-started/installation/), Node.js 22.12+ with npm, and internet for the initial dependency installation. Python 3.12 is installed by uv if needed. Runtime graph analysis is offline.

```bash
./scripts/dev.sh
```

Windows PowerShell: `.\scripts\dev.ps1`. Both wrappers use the same Python launcher; see the [cross-platform setup guide](docs/setup.md). After the first install, add `--skip-install` to reuse locked dependencies.

Open [localhost:8000](http://127.0.0.1:8000). The default dataset is an original synthetic fixture; no organizer records, API key, GPU, personal account or subscription is required. The script installs locked dependencies, builds the frontend and serves the app on loopback. First setup requires network access; later launches can use `uv run --frozen moneygraph serve`.

To use the official dataset, extract its `data/` folder locally and pass the directory containing `nodes.parquet`, `edges.parquet` and `transactions.parquet`:

```bash
MONEYGRAPH_DATA_DIR=/absolute/path/to/data ./scripts/dev.sh
```

To generate all three required CSVs from raw Parquet in one command:

```bash
uv run --frozen moneygraph export --data /absolute/path/to/data --out outputs/submission
```

Omit `--data` to export the synthetic fixture. The official data and generated exports remain local and are excluded from Git. Invalid input schemas, duplicate node IDs, missing endpoints and inconsistent edge/transaction aggregates fail explicitly.

## Investigation workflow

1. Review the ranked queue, then search by `gid` or filter by role/community.
2. Select an account to inspect its directed neighborhood, observed incoming/outgoing sums, dated flows, role rule and priority contributions.
3. Read coverage limits before interpreting an apparent sink, seed flow ratio or daily transfer pattern.
4. Inspect communities and export the three required CSVs from the header.
5. Use the optional assistant for an evidence-backed explanation. Its references and tool trace are visible; its answer cannot change deterministic scores or exports.

The complete dashboard uses the official shadcn Base Nova components on Base UI, Geist typography and Phosphor icons. Its collapsible navigation remembers the chosen state and separates Overview, Investigation, Entities, Communities, Signals and Resilience. The restrained warm-white and graphite Dashboard 4 composition adds useful metric cards, a compact community distribution chart, role composition, a visible review queue and coverage views. The full entity table supports server pagination and filters; the React Flow/Dagre map uses readable account glyphs, directional transfer labels, focused expansion, an exact transfer table and PNG export. On smaller screens, entity evidence opens in an accessible side sheet. The assistant-ui copilot supports in-memory questions, evidence citations, tool traces, retry, copy and cancel. Each question independently checks the selected scope; previous replies are not model memory.

The Signals panel adds recurring routes, return cycles, daily spikes, same-day payers and depth-peer anomalies. Resilience simulates top-N removal. A cohort query finds shared downstream accounts for up to five selected IDs. Download a Markdown dossier with missing-evidence requests and a SHA-256 receipt. [Criterion coverage](docs/criteria-matrix.md) maps every required and optional brief feature to code and tests. [Architecture decisions](docs/architecture.md) explain the implementation boundary and scaling plan. [Acceptance plan](docs/acceptance.md) defines the demo and validation contract.

## Optional AI

Copy `.env.example` to `.env` and set a server-side `OPENAI_API_KEY`, `MONEYGRAPH_AI_ENABLED=true` and `MONEYGRAPH_ALLOW_EXTERNAL_AI=true` only when external processing of the selected evidence is permitted. Restart the server after configuration changes. Without these settings the assistant shows a clearly labeled local evidence summary.

The default is `gpt-6-sol`, verified against current official documentation and the supplied project's model list. The Responses API uses bounded read tools, strict structured output, citation validation, finite turns, token limits and `store=False`. This is not Zero Data Retention; see [data controls and architecture](docs/architecture.md). Do not put API keys in browser environment variables. Brev is connected for infrastructure management; no instance is needed or provisioned. [Integration verification](docs/integrations.md).

## Outputs

| File | Exact columns |
|---|---|
| `nodes_roles.csv` | `gid, role, role_score, cluster_id, priority_score, evidence` |
| `clusters.csv` | `cluster_id, n_nodes, n_seed, sum_kzt_internal, top_gids, hypothesis` |
| `top_nodes.csv` | `rank, gid, role, priority_score, why` |

Every input node is included, including isolated seeds. Evidence is nonempty and no longer than 200 characters. Roles include `consolidator`, `transit`, `distributor`, `terminal`, `coordinator`, `peripheral` and the documented extension `boundary_unknown`. The top export contains up to 100 accounts and at least 20 for the supplied dataset. `top_gids` is a JSON array inside its CSV field.

## Role rules and limitations

Rules use directed degree, observed sums, non-seed pass-through ratios, daily overlap, upstream seed reach, PageRank, sampled directed betweenness and seeded Louvain communities. [Methodology](docs/methodology.md) contains exact thresholds, tie-breaking and priority weights. No model is trained on invented labels. `role_score` is rule strength, not calibrated statistical confidence.

The crawl covers outgoing intra-bank transfers of at least 5,000 KZT, July 2026, at most four hops. It omits outside inflows, other banks, smaller transfers and later activity. Visible sums are not account balances. Communities do not prove affiliation. Daily overlap does not prove that identical funds moved onward. No names, IINs or fabricated customer attributes are added.

At one million nodes, replace per-request exploration with partitioned aggregation, versioned offline features, sampled centrality and indexed bounded-subgraph serving. Benchmark graph backends or cuGraph before choosing infrastructure. The current prototype does not claim million-node performance. See [the full scaling decision](docs/architecture.md#adr-2-polars--networkx-at-this-scale).

## Development and verification

```bash
./scripts/check.sh
```

Windows PowerShell: `.\scripts\check.ps1`. The checks cover backend behavior, OpenAPI and generated TypeScript drift, client contracts and the production build. Browser code consumes `/api/v1` with exact string account IDs and a dataset-scoped query cache; legacy `/api` routes retain numeric IDs. Current results: [architecture verification](docs/architecture-verification.md). See the [architecture refactor design](docs/superpowers/specs/2026-09-23-moneygraph-architecture-design.md).

For separate development processes:

```bash
uv run --frozen moneygraph serve
npm --prefix web run dev
```

The Vite proxy forwards `/api` to port 8000. API schema: [localhost:8000/docs](http://127.0.0.1:8000/docs). Unit tests use synthetic data and fake model clients. Run `uv run python scripts/evaluate_copilot.py` for seven offline contract scenarios; add `--live` to use the configured API on synthetic evidence only. Live model smoke tests are separate and do not establish role accuracy. Dependency versions are locked in `uv.lock` and `web/package-lock.json`.

The app is a local hackathon prototype without multi-user authentication. Keep it on loopback when using private data or an enabled paid API key. [AGENTS.md](AGENTS.md) records engineering invariants.

## Research and provenance

- [Current ecosystem and ready-made solutions](docs/research/ecosystem-2026.md)
- [Advanced agent architecture research](docs/research/advanced-agents-2026.md)
- [Case agents, retrieval and memory improvements](docs/research/agent-improvements-2026.md)
- [Readable graph and dashboard UX research](docs/research/visual-investigation-ux-2026.md)
- [UI libraries, Square dashboard comparison and assistant-ui](docs/research/ui-ecosystem-2026.md)
- [Live GitHub activity and license evidence](docs/research/github-metrics.json)
- [Architecture diagram and decisions](docs/architecture.md)
- [All required and optional criteria](docs/criteria-matrix.md)
- [Measured validation](docs/validation.md)
- [Third-party component notices](THIRD_PARTY.md)
- [Five-minute demonstration](docs/acceptance.md#five-minute-demo)
- [Official Finance brief](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/edit)

This implementation was written for this case. Organizer material informs the input/output contract; datasets and supplied starter archives remain local. Third-party packages are reused as components, not passed off as a prebuilt finished solution.

The latest visual direction and inspected Dribbble/product references are documented in [the redesign study](docs/research/redesign-reference-study.md).

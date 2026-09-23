# Modular monolith boundaries

Implemented 23 September 2026. Aqsha Lens remains one local Python application with a compiled React bundle. Deterministic financial analysis works without network access, API credentials, a database server, or an agent framework.

## Ownership

| Module | Responsibility | Boundary |
| --- | --- | --- |
| `engine.py` | Validate inputs, compute graph features, assign heuristic roles and rank accounts | Existing formulas, ordering, isolated nodes and observation-boundary semantics remain unchanged by this refactor |
| `snapshot.py` | Capture analysis identity when construction completes | Frozen metadata contains a serialized receipt and evidence version; reading identity does not inspect changing source files |
| `evidence.py` | Serve detached evidence projections and reuse signal indexes | One facade per analysis, with locked lazy signal preparation; HTTP and AI use the same prepared evidence |
| `http_contracts.py` | Describe and validate public JSON responses | Explicit Pydantic models preserve canonical string account IDs, nullable measurements and the bounded copilot payload |
| `agent/` | Apply fixed-scope tools, budgets, provider execution, grounding and conversation memory | Agent tools read through the evidence facade; they cannot assign exported roles or run arbitrary SQL, shell, files or URLs |
| `exports.py` | Produce canonical CSV bytes | CLI files, HTTP downloads and receipt hashes consume the same UTF-8 serializer |
| `web/src/generated/api.d.ts` | Provide generated browser contract types | Public frontend response aliases come from the checked OpenAPI artifact |

The application composes these boundaries in `api.py` and `copilot.py`. Existing compatibility entry points such as `Analysis.write_exports()` and `audit.export_content()` delegate to the shared serializer. They do not maintain competing CSV implementations.

## Evidence ownership and identity

The facade returns detached nested structures, so trimming an AI projection or editing a returned dictionary cannot mutate another reader's cached result. One `SignalAnalysis` instance and its indexes are reused for HTTP signals, dossiers and fixed-scope agent tools. A lock protects first construction and cached computations. This serializes reads through the facade; it is an intentional consistency tradeoff for the current local workload, not a claim of unlimited concurrent throughput.

`SnapshotMetadata` is frozen and contains canonical receipt JSON. Each receipt read decodes a fresh object. The receipt includes canonical dataset hashes, exact CSV hashes and sizes, named source hashes, numerical runtime versions and a single evidence version. Conversation scopes and citations use that captured version. Nondeterministic execution duration does not enter identity.

The underlying `Analysis` and NetworkX graph remain mutable implementation details. The facade prevents mutation through its public read results; it does not freeze every internal Python object or prevent a developer holding a raw analysis reference from modifying it. Source fingerprints identify the files observed at construction, not signed executable attestation. Restart after changes to code or input data. Existing session tokens bound to a different evidence version require a new conversation.

## HTTP and TypeScript contract

Response models cover health, summary, node lists/details, graph, communities, signals, resilience, collectors, provenance, dossiers, copilot status/answers and session creation. Models reject unknown fields instead of silently dropping them. In particular, `pass_through` is nullable, account identifiers cross JSON as exact strings, and canonical citation `source_json` survives response validation unchanged.

Response-validation failures return a generic 500 without logging evidence-containing validation exceptions. Existing sanitized request errors remain intact. Markdown and CSV downloads intentionally use direct responses and explicit media types.

Generate and verify contracts from the repository root:

```sh
npm --prefix web run api:generate
npm --prefix web run api:check
```

The exporter disables dotenv loading, constructs route definitions without entering application lifespan, and opens neither a dataset nor a provider connection. It writes `web/openapi.json`; pinned `openapi-typescript` generates `web/src/generated/api.d.ts`. The normal `scripts/check.sh` gate checks both artifacts for drift before building the browser bundle.

Generated TypeScript provides compile-time response shapes. It does not validate arbitrary JSON in the browser at runtime. The existing fetch helper, error messages, request cancellation and conversation-token handling are preserved. A generator with runtime validators is a separate choice if untrusted external APIs are added.

## Exact exports

`export_bytes()` owns column order, row order, CSV quoting, UTF-8 encoding and CRLF endings. The CLI writes those bytes; HTTP returns them; provenance hashes those bytes. Tests compare all three required artifacts across the actual CLI, HTTP and receipt paths, including a literal fixture covering Unicode, quoted fields, embedded newlines and numeric formatting. No account-ID transport conversion is applied to required CSVs.

## Verification and remaining boundaries

Synthetic regression tests exercise detached nested values, concurrent first reads, shared HTTP/tool indexes, exact int64 IDs, nullable fields, HTTP response validation, citation-byte preservation, stable captured identity after source-file changes and export-byte equality. Existing scoring, graph, security, session, grounding and offline-workflow tests remain part of the full gate.

Frontend scenario components and the global assistant remain in their current arrangement. This change replaces handwritten API response interfaces, not the application shell. Provider execution retains its existing injected-client seam and OpenAI adapter; no new orchestrator is introduced. Import-lint enforcement, complete immutable graph storage, durable jobs and distributed execution are not implemented by this refactor.

A separate local worker can be introduced if profiling demonstrates that computation blocks interaction. Independently deployed services need a concrete scaling, security or release-ownership requirement. LangGraph is an option when workflows must resume from durable checkpoints or pause for human review; it is not required to share deterministic evidence.

## Decision references

- [FastAPI response models](https://fastapi.tiangolo.com/tutorial/response-model/)
- [Pydantic nested immutability limits](https://docs.pydantic.dev/latest/concepts/models/#faux-immutability)
- [openapi-typescript](https://openapi-ts.dev/introduction)
- [Python CSV serialization](https://docs.python.org/3/library/csv.html)
- [FastAPI process and memory model](https://fastapi.tiangolo.com/deployment/concepts/)
- [Microservice tradeoffs](https://martinfowler.com/articles/microservice-trade-offs.html)
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

## Recorded implementation gate

On 23 September 2026, the integrated source passed 263 backend tests with external AI disabled, 10 frontend session/evidence-packet tests, OpenAPI and generated-TypeScript drift checks, and the production TypeScript/Vite build. The production bundle was built after the final comparison deep-link and workspace-recovery changes. The backend suite includes synthetic contract, export, snapshot and shared-service regression tests; this result is not a financial-accuracy benchmark or a held-out evaluation of model reasoning. One upstream Starlette/httpx deprecation warning remains.

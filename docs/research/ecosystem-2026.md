# Money Graph: current ecosystem and reusable solutions

Research date: **23 September 2026**. Scope: Freedom Finance's supplied transaction graph, all required outputs, and all eight optional features. This is a technical selection report, not a claim that the third-party applications below have been security-audited or successfully deployed here.

## Decision

Build the submission on **Polars + NetworkX + FastAPI + React/Cytoscape**, with a **bounded evidence assistant using the OpenAI Responses API**. These maintained components cover the actual graph problem without requiring a cloud database, GPU, or model-generated scoring. Use **ThreatSight 360** as the closest complete application reference; use **OpenAI Agents SDK or PydanticAI** if the copilot grows beyond its current small loop; use **LangGraph** when case workflows need durable pause/resume. The detailed agent design is in [advanced-agents-2026.md](advanced-agents-2026.md).

The highest-star products are general platforms: n8n, Dify and Langflow. Their popularity does not establish AML correctness, suitability for the brief, or simpler deployment. No reviewed project simultaneously supplied a highly starred, recently maintained, permissively licensed, offline application that directly satisfies Freedom's exact role definitions, observation-boundary semantics and CSV contracts. That is a finding about this research set, not proof that none exists anywhere.

## Evidence and selection method

This work used **12 Exa searches, 81 requested search-result slots, 21 direct page fetches, and live GitHub metadata for 34 repositories**. Search-result slots are not independent verified sources. Primary maintainer documentation, repository source and license files support the conclusions. Vendor speed/accuracy claims were not treated as independent measurements. [Exa source ledger](exa-source-ledger.json), [GitHub snapshot](github-metrics.json), [ThreatSight source inspection](threatsight-inspection.json).

Dates were calculated from 2026-09-23: the previous 30 days start **2026-08-24**; 90 days start **2026-06-25**; 180 days start **2026-03-27**. Repository freshness below means the **default branch's actual HEAD commit time**, not `pushed_at`, which may reflect a different branch. Stars are exact API snapshot values, not cached Exa snippets. A latest documentation commit establishes activity, not that every subsystem recently changed.

Selection order: (1) required-contract fit, (2) deterministic offline reproduction, (3) evidence and authorization boundaries, (4) integration effort, (5) measured task performance, (6) maintenance and license, then (7) community adoption. We prefer a mature component that fits over a more popular unrelated application. No cross-framework latency benchmark was conducted.

## Live repository comparison

The table is generated from the raw snapshot below. `Recent` means HEAD falls within the preceding 30 days. See the JSON for exact timestamps, commit SHAs, API endpoints and archive flags.

| Repository | Stars | Default HEAD (UTC) | Recent | License / status | Fit |
|---|---:|---|---|---|---|
| [n8n-io/n8n](https://github.com/n8n-io/n8n) | 205,750 | [2026-09-23](https://github.com/n8n-io/n8n/commit/1c48187ca122261104c9fe72add41ccd02e20989) | Yes | Sustainable Use License; enterprise exceptions | Automation platform |
| [langgenius/dify](https://github.com/langgenius/dify) | 156,943 | [2026-09-23](https://github.com/langgenius/dify/commit/699489b95f05a1304e5c16b13d18297309f7efbd) | Yes | Modified Apache-2.0 with additional conditions | Agent app platform |
| [langflow-ai/langflow](https://github.com/langflow-ai/langflow) | 155,166 | [2026-09-22](https://github.com/langflow-ai/langflow/commit/df9711c952a8e798e8fbbad8f25fe60be5ff6018) | Yes | MIT | Visual agent builder |
| [fastapi/fastapi](https://github.com/fastapi/fastapi) | 102,546 | [2026-09-01](https://github.com/fastapi/fastapi/commit/50113da16fec53b66b80d75e80a89296de4fa5a5) | Yes | MIT | Use: API |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | 42,170 | [2026-09-23](https://github.com/langchain-ai/langgraph/commit/bdb85b5aa87a21de68371d2e534b81aeed398f57) | Yes | MIT | Durable case upgrade |
| [duckdb/duckdb](https://github.com/duckdb/duckdb) | 41,656 | [2026-09-23](https://github.com/duckdb/duckdb/commit/795e1c1090a52bbac5d2d3b298bd26670d85122b) | Yes | MIT | Alternative data engine |
| [pola-rs/polars](https://github.com/pola-rs/polars) | 39,845 | [2026-09-23](https://github.com/pola-rs/polars/commit/266aa8333a74a7a42fdf7f3e6ad26f7a6deb54e2) | Yes | MIT | Use: column engine |
| [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG) | 39,826 | [2026-09-22](https://github.com/HKUDS/LightRAG/commit/6702eea912b12df5ba831f58609470ca9da34cfc) | Yes | MIT | Policy retrieval only |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | 38,476 | [2026-09-01](https://github.com/xyflow/xyflow/commit/0a1f9575b25679f2880175de8d3eae21aedde921) | Yes | MIT | Workflow UI reference |
| [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy) | 38,222 | [2026-09-22](https://github.com/stanfordnlp/dspy/commit/4b60eb4477e9ae2a0c111c4a1dc477f4f2d04043) | Yes | MIT | After evaluation set |
| [microsoft/graphrag](https://github.com/microsoft/graphrag) | 36,078 | [2026-09-21](https://github.com/microsoft/graphrag/commit/82b87bf0434fc69f857663280e2c36a1c48e52fe) | Yes | MIT | Policy RAG only |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | 34,961 | [2026-09-23](https://github.com/langfuse/langfuse/commit/11fe5cca6d63b91b1d33ad3b4e4eb0ef03b8c6db) | Yes | MIT core; enterprise exceptions | Shared eval/trace option |
| [getzep/graphiti](https://github.com/getzep/graphiti) | 31,092 | [2026-09-21](https://github.com/getzep/graphiti/commit/16cdf7045378c8d53ae01f94e2fa60d238cb0f68) | Yes | Apache-2.0 | Future reviewed memory |
| [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) | 29,683 | [2026-09-23](https://github.com/langchain-ai/deepagents/commit/786eac5b708499f36ee7d61ed6f6e1a288b74a75) | Yes | MIT | Long-horizon reference |
| [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | 29,652 | [2026-09-22](https://github.com/openai/openai-agents-python/commit/32edd3c3ecde37a7fb6bf4b082f35f1d8f7f086b) | Yes | MIT | Next-step orchestration |
| [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) | 20,129 | [2026-09-23](https://github.com/pydantic/pydantic-ai/commit/ad0727bb568580992afebe77351702f8817e5476) | Yes | MIT | Typed agent alternative |
| [networkx/networkx](https://github.com/networkx/networkx) | 17,279 | [2026-09-21](https://github.com/networkx/networkx/commit/b69beb2c4f6e480aaca4b0de7b4883f2b9f1030b) | Yes | BSD-3-Clause | Use: graph engine |
| [jacomyal/sigma.js](https://github.com/jacomyal/sigma.js) | 12,170 | [2026-04-30](https://github.com/jacomyal/sigma.js/commit/d32c4e5bfd4c5f49724ebc21bd786b01be555dac) | No | MIT | Large graph alternative |
| [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix) | 11,584 | [2026-09-23](https://github.com/Arize-ai/phoenix/commit/e4b8130773c7b15de11c9337d509d0eaab4883e7) | Yes | Elastic-2.0 | Eval/trace option |
| [cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js) | 11,221 | [2026-09-07](https://github.com/cytoscape/cytoscape.js/commit/7ba634095d8954089ee5dc09ada0030f2dca134c) | Yes | MIT | Use: graph UI |
| [UKGovernmentBEIS/inspect_ai](https://github.com/UKGovernmentBEIS/inspect_ai) | 2,847 | [2026-09-22](https://github.com/UKGovernmentBEIS/inspect_ai/commit/f9837f6c577da1bf89223f0575d4cb218940a79f) | Yes | MIT | Agent evaluation |
| [NVIDIA/NeMo-Agent-Toolkit](https://github.com/NVIDIA/NeMo-Agent-Toolkit) | 2,642 | [2026-09-21](https://github.com/NVIDIA/NeMo-Agent-Toolkit/commit/ac0ed8064a78fc7c233f093016fbfb7644b88c31) | Yes | Apache-2.0 | Profiling/integration |
| [graphology/graphology](https://github.com/graphology/graphology) | 1,749 | [2026-09-02](https://github.com/graphology/graphology/commit/65e278f0075de97bee3fce12d10e423752ed395a) | Yes | MIT | Sigma companion |
| [NVIDIA-AI-Blueprints/aiq](https://github.com/NVIDIA-AI-Blueprints/aiq) | 872 | [2026-08-28](https://github.com/NVIDIA-AI-Blueprints/aiq/commit/bf4e67d1564ef8d2ec8f65b5f9001e512befc095) | Yes | Apache-2.0 | Research-agent reference |
| [IBM/AMLSim](https://github.com/IBM/AMLSim) | 397 | [2022-02-14](https://github.com/IBM/AMLSim/commit/7338a4bcb1af9bcfea2201ad7daccfe2a4d569ca) | No | Apache-2.0 | Synthetic patterns |
| [IBM/Multi-GNN](https://github.com/IBM/Multi-GNN) | 122 | [2024-02-13](https://github.com/IBM/Multi-GNN/commit/252b0252afca109d1d216c411c59ff70753b25fc) | No | Apache-2.0 | Research baseline |
| [rapidsai/nx-cugraph](https://github.com/rapidsai/nx-cugraph) | 115 | [2026-09-16](https://github.com/rapidsai/nx-cugraph/commit/9ab549be4f00b977494f92544fa4f35696d50015) | Yes | Apache-2.0 | Benchmark at scale |
| [IBM/AML-Data](https://github.com/IBM/AML-Data) | 102 | [2023-11-23](https://github.com/IBM/AML-Data/commit/366436e605ac7713bf4eee8b4fbc45984d64427c) | No | Apache-2.0 | Synthetic dataset |
| [NVIDIA-AI-Blueprints/financial-fraud-detection](https://github.com/NVIDIA-AI-Blueprints/financial-fraud-detection) | 70 | [2026-07-07](https://github.com/NVIDIA-AI-Blueprints/financial-fraud-detection/commit/59492bc700ecd18bbcf9a8e31d78ade0de6a316b) | No | Apache-2.0 | GPU model research |
| [NVIDIA-AI-Blueprints/transaction-foundation-model](https://github.com/NVIDIA-AI-Blueprints/transaction-foundation-model) | 48 | [2026-08-31](https://github.com/NVIDIA-AI-Blueprints/transaction-foundation-model/commit/04ffa4d3f216b2b6d21bc875ef3c815cbf6b3547) | Yes | Apache-2.0 | Pretraining research |
| [mongodb-industry-solutions/fsi-aml-fraud-detection](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection) | 14 | [2026-09-01](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection/commit/2ba75588a36d0c8d75c186e326b440d5af537f54) | Yes | MIT | Best domain reference |
| [stelioszach03/aml-graph-investigator](https://github.com/stelioszach03/aml-graph-investigator) | 1 | [2026-09-22](https://github.com/stelioszach03/aml-graph-investigator/commit/0558ce45db919028f8cd934c9db3134e61d920bc) | Yes | MIT; archived | Archived prototype |
| [FalkorDB/RedThread](https://github.com/FalkorDB/RedThread) | 1 | [2026-03-18](https://github.com/FalkorDB/RedThread/commit/a58379e2fa4361e0e431a321dcb49da6d43197f6) | No | MIT | Workspace reference |
| [Dhanush27m/blitz](https://github.com/Dhanush27m/blitz) | 0 | [2026-02-19](https://github.com/Dhanush27m/blitz/commit/e236960a4ce581c7e0cbd12cad2f83f95898cf3f) | No | None found | No reuse license |

### License findings that affect reuse

- **n8n:** Sustainable Use License with enterprise exceptions, not a blanket permissive OSS license. The root license limits the covered use to internal business, noncommercial or personal purposes; do not assume an embedded commercial service has the same permission. [Actual license](https://github.com/n8n-io/n8n/blob/master/LICENSE.md).
- **Dify:** modified Apache-2.0 with additional conditions covering multi-tenant use and frontend branding. It is not equivalent to unmodified Apache-2.0. [Actual license](https://github.com/langgenius/dify/blob/main/LICENSE).
- **Langfuse:** MIT core, with separate enterprise directories and third-party terms. [Actual license](https://github.com/langfuse/langfuse/blob/main/LICENSE).
- **Phoenix:** the live root license is Elastic License 2.0, including a managed-service restriction. Do not describe the entire current repository as MIT or Apache merely because an older article does. Individual packages need their own license inspection before reuse. [Actual license](https://github.com/Arize-ai/phoenix/blob/main/LICENSE).
- **IBM AML-Data:** repository code is Apache-2.0, while the dataset is explicitly CDLA-Sharing-1.0. A code license does not automatically license the data. [README](https://github.com/IBM/AML-Data).
- **NVIDIA blueprints:** the repository's Apache-2.0 label does not relicense downloaded containers or model weights. The financial-fraud README explicitly points to separate NVIDIA software and product terms for the NIM container. Inspect every runtime artifact before redistribution. [Blueprint terms](https://github.com/NVIDIA-AI-Blueprints/financial-fraud-detection#terms-of-use).
- **NetworkX:** GitHub's automatic license classifier returned `NOASSERTION`; its actual LICENSE.txt states BSD-3-Clause. The corrected finding and source blob are recorded in the snapshot.

## Off-the-shelf application shortlist

| Candidate | What is actually available | Reuse decision | Missing work / material limitation |
|---|---|---|---|
| [MongoDB ThreatSight 360](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection) | Application source, Next.js UI, FastAPI services, LangGraph investigation graph, MongoDB checkpointing, copilot and network/temporal tools | **Best domain reference** for case workflow, trace display and review checkpoints; adapt patterns, not the entire stack | Only 14 stars. Atlas and Bedrock setup, dual backends, different entity schema, scoring and output contracts. Not installed or benchmarked here. |
| [NVIDIA AI-Q](https://github.com/NVIDIA-AI-Blueprints/aiq) | Deployable research backend/UI; NeMo Agent Toolkit, Deep Agents, cited answers, bounded concurrent research, evaluation harnesses, deployment assets | **Best advanced research-agent reference**; useful for future research on approved internal policies | Designed around retrieval and research, not transaction-role analysis. External entity enrichment is forbidden by this brief. Hosted models/data sources require credentials; self-hosting models adds infrastructure. |
| [NVIDIA financial fraud detection](https://github.com/NVIDIA-AI-Blueprints/financial-fraud-detection) | Notebook workflow, financial-fraud training container, GNN-enhanced model, Dynamo-Triton inference and feature explanations | **Future labeled-model benchmark**, separate from submission | README specifies an A6000/A100/H100 or newer GPU with at least 32 GB memory. Predicting transaction fraud is a different task from explainable roles in a censored graph. GPU/cloud cannot be mandatory under this brief. |
| [NVIDIA transaction foundation model](https://github.com/NVIDIA-AI-Blueprints/transaction-foundation-model) | Five notebook stages: dataset/baseline, GPU tokenization, sequence pretraining, embedding extraction, downstream XGBoost comparison | **Advanced research direction** once substantial authorized history and evaluation labels exist | It is an end-to-end training example, not a pretrained universal AML investigator. The example uses a small decoder model and TabFormer data; transfer to 4,840 Freedom transactions is unvalidated. |
| [AML Graph Investigator](https://github.com/stelioszach03/aml-graph-investigator) | Synthetic graph, engineered NetworkX features, LightGBM training, path explanations, React console, optional representation code | **UI and motif reference only** | One star and archived. Actual `gnn_optional.py` implements optional PyG Node2Vec; SAGE selection falls back to Node2Vec. README and code disagree, so “full GNN” and “only empty placeholder” would both mislead. |
| [FalkorDB RedThread](https://github.com/FalkorDB/RedThread) | Investigation UI/API, graph/path/pattern operations, temporal exploration, snapshots/diffs, optional natural-language graph querying | **Case workspace and graph-diff reference** | One star and March HEAD. Requires FalkorDB and custom adaptation. Do not import model-written Cypher into this application's read-only tool boundary. No runtime verification here. |
| [IBM AMLSim](https://github.com/IBM/AMLSim) | Synthetic financial network generator and known pattern definitions | **Synthetic motif inspiration**, not application starter | HEAD is February 2022 despite a newer repository `pushed_at`. Java/Python setup and a different data model add work. Synthetic motif correctness does not establish detection accuracy on organizer data. |
| [IBM Multi-GNN](https://github.com/IBM/Multi-GNN) | Research implementation for AML graph learning | **Research comparator after labels exist** | HEAD February 2024; training and evaluation assumptions differ. Its learned predictions do not satisfy the brief's explainable role rules automatically. |
| [Blitz](https://github.com/Dhanush27m/blitz) | Read source exposes NetworkX analysis and several pattern detectors | **Do not copy** | Zero stars; no detected/root license. Public visibility alone is not permission to reuse. Claims were not benchmarked. |

### ThreatSight: what source inspection established

The inspected `graph.py` contains explicit triage, data collection, network analysis, temporal analysis, trail following, sub-investigation, narrative, validation and human-review nodes. It compiles with `MongoDBSaver` and a pause before human review. `chat_agent.py` uses a ReAct agent with checkpointing. This is substantive code, not just a diagram. [Pipeline source](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection/blob/main/aml-backend/services/agents/graph.py).

The network and transaction tools accept depth and limit arguments. The inspected wrappers pass those values into database operations; their decorators and type hints should not be assumed to enforce a safe maximum. Our application must enforce numeric bounds and authorized account scope in trusted code. The inspected Docker Compose file covers two image services; it does not by itself establish a one-command, fully local deployment of every advertised component. Preserve the useful workflow ideas while verifying deployment and tool boundaries independently. [Network tool](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection/blob/main/aml-backend/services/agents/tools/network_tools.py), [transaction tool](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection/blob/main/aml-backend/services/agents/tools/transaction_tools.py), [Compose](https://github.com/mongodb-industry-solutions/fsi-aml-fraud-detection/blob/main/docker/docker-compose.yml).

### NVIDIA: advanced capabilities with explicit fit limits

Current NeMo Agent Toolkit documentation is version **1.8**. It wraps multiple agent frameworks and adds profiling, evaluation, observability, reusable workflow configuration, MCP and A2A support. It is an instrumentation/integration toolkit, not a substitute for our graph algorithms or authorization policy. Adopt it when profiling a larger agent workflow becomes a real need; do not add it solely to display an NVIDIA integration. [NAT documentation](https://docs.nvidia.com/nemo/agent-toolkit/latest/).

AI-Q's current README describes a governed research backend with separate shallow/deep paths, bounded research workers and cited synthesis. It also documents a hosted-model citation/format limitation and fails closed for affected drafts. That design is useful: invalid evidence output should trigger a visible fallback, never quietly become an authoritative answer. Its benchmark branches and configuration-dependent results must not be generalized to Money Graph. The supplied Brev token manages infrastructure; it is not an NVIDIA inference API key. [AI-Q README](https://github.com/NVIDIA-AI-Blueprints/aiq).

## Best components by responsibility

| Responsibility | First choice | Credible alternative | Why this choice fits |
|---|---|---|---|
| Typed Parquet aggregation | Polars | DuckDB | One local engine; deterministic groupings and column operations. DuckDB is attractive for SQL-oriented analytics, but installing both now duplicates responsibility. |
| Directed graph and feature engine | NetworkX | igraph / graph-tool / nx-cugraph after benchmarking | Supplied graph is small. Transparent algorithms and explicit preservation of all nodes matter more than GPU throughput. |
| Investigation graph | Cytoscape.js | Sigma.js + Graphology | Cytoscape supports rich directed graph interaction. Sigma/WebGL becomes interesting for large views; rendering all nodes is not automatically useful investigation UX. |
| Workflow editor / agent trace diagram | React Flow | Simple list or Mermaid | React Flow is strong for editing workflows; transaction exploration and graph algorithms are a different responsibility. No need for a second graph renderer now. |
| API validation | FastAPI + Pydantic | Existing server framework | Strong contracts and bounded schemas shared across ordinary HTTP and AI tools. |
| Small controlled agent | Direct Responses API | OpenAI Agents SDK / PydanticAI | Keep the trusted loop understandable. A framework migration is justified by capabilities, not star count. |
| Resumable multi-step case | LangGraph | Agents SDK with durable runtime integration | Checkpointed case state, human review, replay and recovery are concrete reasons to add orchestration. |
| Prompt/model optimization | Versioned evaluation set first; DSPy/GEPA later | Manual prompts measured on held-out cases | An optimizer needs a task metric and examples. Optimizing a vague “helpful answer” score can reward unsupported certainty. [DSPy GEPA](https://dspy.ai/getting-started/gepa-optimization/). |
| Agent evaluation | Lightweight deterministic checks now; Inspect AI for model comparisons | Langfuse / Phoenix evaluation tooling | Inspect supplies datasets, solvers, scorers and budget controls. It measures a system; it does not make outputs correct by itself. [Inspect](https://inspect.aisi.org.uk/), [limits](https://inspect.aisi.org.uk/setting-limits.html). |
| Tracing | Local metadata trace now; Langfuse when shared operations need it | Phoenix / OpenTelemetry | Never export raw financial evidence by default. Self-hosting and redaction are separate requirements from trace functionality. |

### Why GraphRAG, Graphiti and LightRAG are not the transaction engine

The source already supplies exact nodes, edges, amounts and dates. Re-extracting that structure with an LLM creates cost and opportunities for numerical corruption. **GraphRAG** addresses graph-assisted retrieval from document collections; **Graphiti** maintains evolving contextual facts and provenance; **LightRAG** combines document/entity retrieval with a usable server/UI. These are credible products, but none replaces deterministic sums, degree calculation or observation-depth handling. [GraphRAG](https://github.com/microsoft/graphrag), [Graphiti](https://github.com/getzep/graphiti), [LightRAG](https://github.com/HKUDS/LightRAG).

A future approved internal-policy collection could justify retrieval beside the graph. Store policy citations separately from transaction evidence, version the corpus, and prevent retrieved instructions from becoming tool authority. Graphiti could retain analyst-reviewed case memory later; it should not infer unknown customer attributes from the current data. LightRAG's own README calls out network binding and authentication configuration, illustrating why “runs out of the box” is different from “safe to expose.”

## YC product references

| Company | Verified YC identity | Product lesson | Boundary for this project |
|---|---|---|---|
| [Flagright](https://www.ycombinator.com/companies/flagright) | Winter 2022 | Combine deterministic financial infrastructure with natural-language investigation, evidence views and integrated analyst workflow. | Commercial product, not reusable OSS. Productivity claims on launch pages are vendor claims and were not used as expected performance. |
| [Bretton AI, formerly Greenlite](https://www.ycombinator.com/companies/bretton-ai) | Summer 2023; the Greenlite YC URL resolves to this company | Policies, traced/cited output, repeatable review tasks and escalation to humans are the product, not a chat box alone. | Do not count Greenlite and Bretton as independent competitors. Their external-source/KYC capabilities exceed this brief's authorized data scope. |

These references support the proposed user experience and market relevance. They do not establish Money Graph's accuracy, regulatory compliance or equivalence to commercial systems.

## Speed, security and accuracy: purchase decisions avoided

**Speed:** compute the graph once, reuse immutable features, bound subgraphs and JSON payloads, and keep LLM calls off the required CSV path. Measure cold input-to-export runtime separately from warm UI response time. At million-node scale, benchmark alternative backends and conversions against the same contracts; NetworkX documents that conversions are opt-in and can add time and memory. [NetworkX backends](https://networkx.org/documentation/stable/reference/backends.html).

**Security:** a ready platform often adds a database, workers, credentials, outbound connectors and trace storage. Every addition expands the operating boundary. No arbitrary query, shell, file or network tools belong in this copilot. Required exports remain local, uncommitted and independent of a model provider.

**Accuracy:** a strict schema validates shape, not truth. A correct citation ID validates provenance membership, not entailment. A high-star framework validates adoption, not financial reasoning. A synthetic motif test validates implemented behavior, not real fraud detection. Keep these four distinctions visible in the demo and evaluation.

## Reuse inventory policy

No third-party AML application was copied wholesale or represented as our work. Framework/library dependencies are the reusable substrate; exact package versions belong in lockfiles. If later importing a code fragment, record repository, immutable commit, file, license and modifications. Preserve required notices. Organizer data, generated CSVs, private credentials and raw provider traces must remain outside Git. The official hackathon permits OSS components but does not permit passing off a prepared core solution as newly built work.

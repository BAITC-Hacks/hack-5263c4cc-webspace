# Third-party components and provenance

This project uses released libraries as components. No complete AML product was copied into the submission. The organizer starter and datasets were inspected to establish contracts and limitations; they remain local and are not redistributed in Git.

Installed direct runtime versions at 23 September 2026:

| Component | Version | License / source |
|---|---|---|
| FastAPI | 0.141.1 | [MIT](https://github.com/fastapi/fastapi) |
| Uvicorn | 0.53.0 | [BSD-3-Clause](https://github.com/encode/uvicorn) |
| Polars | 1.44.2 | [MIT](https://github.com/pola-rs/polars) |
| NetworkX | 3.7 | [BSD-3-Clause](https://github.com/networkx/networkx) |
| NumPy | 2.5.3 | [BSD-3-Clause and bundled third-party notices](https://github.com/numpy/numpy) |
| SciPy | 1.18.1 | [BSD-3-Clause and bundled third-party notices](https://github.com/scipy/scipy) |
| OpenAI Python SDK | 2.54.0 | [Apache-2.0](https://github.com/openai/openai-python) |
| python-dotenv | 1.2.3 | [BSD-3-Clause](https://github.com/theskumar/python-dotenv) |
| React / React DOM | 19.3.0 | [MIT](https://github.com/facebook/react) |
| Cytoscape.js | 3.34.3 | [MIT](https://github.com/cytoscape/cytoscape.js) |
| Lucide React | 1.47.0 | [ISC](https://github.com/lucide-icons/lucide) |

Browser runtime license texts are retained in [licenses/frontend.txt](licenses/frontend.txt). Python distributions retain their original license files in installed package metadata. Binary NumPy/SciPy wheels contain additional notices that remain applicable; the core project license is not a replacement for those notices.

Development tools include Vite, TypeScript, pytest and HTTPX. Exact direct and transitive versions are recorded by `uv.lock` and `web/package-lock.json`; these files, not this summary, control installation. Dependency licenses remain their owners' licenses. This notice does not assign a new license to team-authored code or organizer data.

Research references such as ThreatSight 360, NVIDIA AI-Q, IBM AMLSim, LangGraph, OpenAI Agents SDK and PydanticAI informed architectural comparisons; they are not installed runtime dependencies unless listed above. Their capabilities and license restrictions are detailed in [the research report](docs/research/ecosystem-2026.md).

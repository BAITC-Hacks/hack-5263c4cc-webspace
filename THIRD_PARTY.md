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
| TanStack Query React / Core | 5.103.2 | [MIT](https://github.com/TanStack/query) |
| React / React DOM | 19.3.0 | [MIT](https://github.com/facebook/react) |
| assistant-ui React | 0.15.21 | [MIT](https://github.com/assistant-ui/assistant-ui/tree/main/packages/react) |
| assistant-ui React Markdown | 0.14.16 | [MIT](https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-markdown) |
| Base UI React | 1.8.0 | [MIT](https://github.com/mui/base-ui) |
| remark-gfm | 4.0.1 | [MIT](https://github.com/remarkjs/remark-gfm) |
| Recharts | 3.8.0 | [MIT](https://github.com/recharts/recharts) |
| React Is | 19.3.0 | [MIT](https://github.com/react/react/tree/main/packages/react-is) |
| React Flow | 12.11.6 | [MIT](https://github.com/xyflow/xyflow) |
| Dagre | 3.1.1 | [MIT](https://github.com/dagrejs/dagre) |
| html-to-image | 1.11.13 | [MIT](https://github.com/bubkoo/html-to-image) |
| Phosphor React | 2.1.10 | [MIT](https://github.com/phosphor-icons/react) |
| shadcn Base Nova component source / CLI | 4.21.0 CLI | [MIT](https://github.com/shadcn-ui/ui) |
| Geist variable font | 5.3.0 distribution | [SIL OFL-1.1](https://github.com/vercel/geist-font) |

Direct browser runtime license texts are retained in [licenses/frontend.txt](licenses/frontend.txt), copied from the installed distributions. Python distributions retain their original license files in installed package metadata. Binary NumPy/SciPy wheels contain additional notices that remain applicable; the core project license is not a replacement for those notices.

The official shadcn Base Nova dashboard and component sources are adapted under MIT; their notice is retained below. Base UI supplies the application's directly composed interaction primitives. The full dependency tree is not Radix-free: `@assistant-ui/react` depends on `radix-ui`, and `@assistant-ui/react-markdown` depends on Radix primitive and callback packages. Those transitive dependencies retain their own license notices and are recorded in `web/package-lock.json`.

Square UI is a visual reference only. No Square UI source files or templates were copied, and it is not an installed dependency. Its [custom ln-dev UI source license](https://github.com/zerostaticthemes/square-ui/blob/8985cb634cc10d57988a187441ae9c971ed890ed/LICENSE.md) is separate from the MIT licenses of Base UI and assistant-ui; the references do not imply interchangeable licenses. The visual-reference decision is documented in [the UI ecosystem research](docs/research/ui-ecosystem-2026.md).

Development tools include Vite, TypeScript, openapi-typescript 7.13.0 (MIT), pytest and HTTPX. Exact direct and transitive versions are recorded by `uv.lock` and `web/package-lock.json`; these files, not this summary, control installation. Dependency licenses remain their owners' licenses. This notice does not assign a new license to team-authored code or organizer data.

Research references such as ThreatSight 360, NVIDIA AI-Q, IBM AMLSim, LangGraph, OpenAI Agents SDK and PydanticAI informed architectural comparisons; they are not installed runtime dependencies unless listed above. Their capabilities and license restrictions are detailed in [the research report](docs/research/ecosystem-2026.md).

The Aqsha Lens logo was generated for this project with OpenAI image generation. The exact prompt and asset provenance are retained in `web/public/brand/aqsha-lens-mark.provenance.json`. It contains no copied bank logo.

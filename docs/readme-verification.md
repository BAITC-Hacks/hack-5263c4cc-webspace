# README reproducibility check

Verified on 23 September 2026 against application commit [`8fee224b097d0530738e7d8c760036ced34f0caa`](https://github.com/BAITC-Hacks/hack-5263c4cc-webspace/commit/8fee224b097d0530738e7d8c760036ced34f0caa). The subsequent README commit changes documentation and its synthetic preview only.

## Clean-checkout startup

A separate temporary clone began without `.env`, `.venv`, `web/node_modules`, organizer data, or generated exports. Existing host runtimes and package caches were available. This verifies a clean checkout on this Linux host, not an independently provisioned machine.

The README's startup script was run with an alternate local port and explicit isolation from credentials or data configured elsewhere:

```bash
PYTHON_DOTENV_DISABLED=1 OPENAI_API_KEY= \
MONEYGRAPH_AI_ENABLED=false MONEYGRAPH_ALLOW_EXTERNAL_AI=false \
MONEYGRAPH_DATA_DIR= MONEYGRAPH_MEMORY_PATH= PORT=8016 ./scripts/dev.sh
```

The script created a Python 3.12.12 virtual environment, installed 33 locked Python packages and 603 frontend packages, passed TypeScript compilation, and built the production interface. Vite reported **2.68 seconds** for its build stage; this excludes dependency installation. Uvicorn started successfully on loopback. A harmless cross-filesystem cache warning caused uv to copy packages instead of hard-linking them.

HTTP checks confirmed:

- `/api/health` reported `ok` and `synthetic`.
- `/api/summary` reported the README's **108 accounts, 114 directed relationships, and 447 transactions**.
- The homepage, all 14 assets referenced by its initial HTML, and the project logo returned HTTP 200.
- A copilot request carrying the custom port's same-origin headers completed in explicitly labeled `offline` mode.

These are startup and HTTP checks. The separate [validation record](validation.md) documents browser interaction and visual checks.

## Tests and documentation

The same clone passed **130 backend tests in 2.45 seconds**, with dotenv loading disabled and external AI flags false, and all **8 frontend session tests**. The only backend warning was the existing Starlette/httpx TestClient deprecation. No paid provider was used in this verification.

README relative file links and section anchors resolved. The three CSV schemas were checked against the implementation. GitHub's Markdown API rendered the README with native alerts, the Mermaid diagram marker, and the preview image. Targeted scans found no project-key or Brev-key patterns in the README or its research documents.

The committed preview is an unchanged capture of the final interface using original synthetic records. Its SHA-256 is `bf2c7da0a06ddc81e8d49b20c6f24f789fce9fc18d519629ca72e78fc152629e`. Organizer records, session capabilities and credentials are not included in it.

The [official-data benchmark](validation.md#architecture-and-agent-hardening-verification) is a separate measurement. Neither these tests nor documentation rendering establish financial-role accuracy or guarantee a judging score.

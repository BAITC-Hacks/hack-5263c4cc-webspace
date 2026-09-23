# Local setup on Windows, Linux and macOS

Install Git, [uv](https://docs.astral.sh/uv/getting-started/installation/) and Node.js 22.12+ with npm. Initial dependency installation needs internet; uv manages Python 3.12. Clone this repository and open a terminal in its directory.

On Windows PowerShell:

```powershell
.\scripts\dev.ps1
```

On Linux/macOS:

```bash
./scripts/dev.sh
```

Both wrappers execute `scripts/dev.py`, resolve paths relative to the repository, install from `uv.lock` and `web/package-lock.json`, build the frontend and serve on loopback at http://127.0.0.1:8000. A failed child command stops the script with its exit status. If PowerShell policy prevents script execution, use `uv run --frozen --extra dev python scripts/dev.py` instead.

After installation, `--skip-install` reuses the installed dependencies. `--port 8001` selects another port. To reuse an already built bundle without rebuilding, run `uv run --frozen moneygraph serve`. Restart after changing the dataset or AI configuration.

To select official data, pass an absolute directory containing `nodes.parquet`, `edges.parquet` and `transactions.parquet`:

```powershell
.\scripts\dev.ps1 --data C:\private\finance-data
```

Omit `--data` for synthetic data. `MONEYGRAPH_DATA_DIR` also works. No supplied dataset or generated export should be committed. The core remains fully functional with no AI key and no network.

## Checks

```powershell
.\scripts\check.ps1
```

Use `./scripts/check.sh` on Linux/macOS or `uv run --frozen --extra dev python scripts/check.py` on either platform. Checks include backend tests, OpenAPI drift, generated TypeScript drift, client contract tests, TypeScript and the production build. Optional AI is disabled for checks. Test temporary directories live under ignored `.private/` to avoid shared system-temp permission collisions.

After intentionally changing a response schema:

```bash
uv run --frozen python scripts/export_openapi.py
npm --prefix web run api:generate
```

Commit both generated files (`web/openapi.json`, `web/src/shared/api/schema.d.ts`). Generation does not start the server, load a dataset or connect to a provider.

## Working on the UI

Use separate terminals for `uv run --frozen moneygraph serve` and `npm --prefix web run dev`. Vite proxies `/api` to port 8000. Browser clients use `/api/v1`; old numeric-ID API routes remain compatible. See [architecture](architecture.md) for module boundaries and [methodology](methodology.md) for the scoring contract.

The supported distribution is a repository checkout with editable installation. A standalone wheel needs its calculation-source manifest and lockfile packaged separately; this launch path does not claim standalone-wheel support.

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v uv >/dev/null || { echo 'Install uv: https://docs.astral.sh/uv/getting-started/installation/' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Node.js 22+ and npm are required.' >&2; exit 1; }
uv sync --frozen --extra dev
npm --prefix web ci --no-audit --no-fund
npm --prefix web run build
exec uv run --frozen uvicorn moneygraph.api:app --host 127.0.0.1 --port "${PORT:-8000}" --no-access-log --no-proxy-headers

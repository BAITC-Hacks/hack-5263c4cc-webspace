#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHON_DOTENV_DISABLED=1
export MONEYGRAPH_AI_ENABLED=false MONEYGRAPH_ALLOW_EXTERNAL_AI=false
uv sync --frozen --extra dev
uv run --frozen pytest -q
npm --prefix web ci --no-audit --no-fund
npm --prefix web run api:check
node --test web/tests/*.test.cjs
npm --prefix web run build

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --frozen --extra dev
uv run --frozen pytest -q
npm --prefix web ci --no-audit --no-fund
node --test web/tests/*.test.cjs
npm --prefix web run build

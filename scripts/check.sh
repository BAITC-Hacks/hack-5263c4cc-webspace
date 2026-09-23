#!/usr/bin/env bash
set -euo pipefail
exec uv run --project "$(dirname "$0")/.." --frozen --extra dev python "$(dirname "$0")/check.py" "$@"

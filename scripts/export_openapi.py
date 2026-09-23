"""Export public API shape without starting lifespan or loading account data."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))


def schema_bytes() -> bytes:
    previous = os.environ.get("PYTHON_DOTENV_DISABLED")
    os.environ["PYTHON_DOTENV_DISABLED"] = "1"
    try:
        from moneygraph.api import make_app

        # Constructing routes does not enter lifespan, call get_engine, open the
        # session database, or contact a provider. Only definitions are used.
        return (json.dumps(make_app().openapi(), ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    finally:
        if previous is None:
            os.environ.pop("PYTHON_DOTENV_DISABLED", None)
        else:
            os.environ["PYTHON_DOTENV_DISABLED"] = previous


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "web" / "openapi.json")
    parser.add_argument("--check", action="store_true", help="Fail if the committed schema needs regeneration.")
    options = parser.parse_args()
    content = schema_bytes()
    if options.check:
        if not options.output.is_file() or options.output.read_bytes() != content:
            parser.exit(1, "OpenAPI schema is stale; run scripts/export_openapi.py.\n")
    else:
        options.output.parent.mkdir(parents=True, exist_ok=True)
        options.output.write_bytes(content)


if __name__ == "__main__":
    main()

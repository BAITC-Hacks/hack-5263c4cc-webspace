"""Export the deterministic HTTP contract without loading a dataset or credentials."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moneygraph.api import make_app  # noqa: E402


def render() -> str:
    return json.dumps(make_app().openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail when the committed contract is stale")
    options = parser.parse_args()
    target = ROOT / "web" / "openapi.json"
    content = render()
    if options.check:
        if not target.is_file() or target.read_text(encoding="utf-8") != content:
            raise SystemExit("OpenAPI drift: run python scripts/export_openapi.py and npm run api:generate --prefix web")
    else:
        target.write_text(content, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()

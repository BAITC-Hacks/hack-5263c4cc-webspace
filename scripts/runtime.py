"""Cross-platform subprocess helpers used by the development entry points."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def executable(name: str) -> str:
    result = shutil.which(name)
    if result is None:
        raise SystemExit(f"Required command not found: {name}. See docs/setup.md.")
    return result


def run(*command: str, cwd: Path = ROOT) -> None:
    print("Running " + " ".join(str(part) for part in command), flush=True)
    result = subprocess.run([str(part) for part in command], cwd=cwd, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def python() -> str:
    candidate = ROOT / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if not candidate.is_file():
        raise SystemExit("Project environment missing. Run uv sync --frozen --extra dev first.")
    return str(candidate)


def install() -> None:
    run(executable("uv"), "sync", "--frozen", "--extra", "dev")
    run(executable("npm"), "ci", "--no-audit", "--no-fund", cwd=WEB)


def build() -> None:
    node = executable("node")
    run(node, "node_modules/typescript/bin/tsc", "-b", cwd=WEB)
    run(node, "node_modules/vite/bin/vite.js", "build", cwd=WEB)

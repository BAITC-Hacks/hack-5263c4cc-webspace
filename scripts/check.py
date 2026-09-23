"""Locked install, backend contracts, generated types and production build."""
import argparse
import os
import tempfile

from runtime import ROOT, WEB, build, executable, install, python, run


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-install", action="store_true", help="Use dependencies already installed from lockfiles")
    args = parser.parse_args()
    os.environ["MONEYGRAPH_AI_ENABLED"] = "false"
    os.environ["MONEYGRAPH_ALLOW_EXTERNAL_AI"] = "false"
    if not args.skip_install:
        install()
    private = ROOT / ".private"
    private.mkdir(exist_ok=True)
    temporary = tempfile.mkdtemp(prefix="pytest-", dir=private)
    run(python(), "-m", "pytest", "-q", "--basetemp", temporary, "-o", f"cache_dir={temporary}/cache")
    run(python(), "scripts/export_openapi.py", "--check")
    run(executable("node"), "scripts/generate-api.mjs", "--check", cwd=WEB)
    tests = sorted(str(path.relative_to(WEB)) for path in (WEB / "tests").glob("*.test.mjs"))
    run(executable("node"), "--experimental-strip-types", "--test", *tests, cwd=WEB)
    build()


if __name__ == "__main__":
    main()

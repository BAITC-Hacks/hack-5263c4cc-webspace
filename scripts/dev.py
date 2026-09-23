"""Build and serve locally using paths independent of the caller's directory."""
import argparse

from runtime import build, install, python, run


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--data", help="Optional directory containing the organizer's three Parquet tables")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    if not args.skip_install:
        install()
    build()
    data = ["--data", args.data] if args.data else []
    run(python(), "-m", "moneygraph", "serve", "--host", "127.0.0.1", "--port", str(args.port), *data)


if __name__ == "__main__":
    main()

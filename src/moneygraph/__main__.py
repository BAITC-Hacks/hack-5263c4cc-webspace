"""CLI for local analysis, export, synthetic fixtures, and the web app."""

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv

from .engine import load_analysis, synthetic_frames


def main() -> None:
    load_dotenv(override=False)
    parser = argparse.ArgumentParser(prog="moneygraph", description="Local explainable transaction graph analysis")
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", aliases=["analyze", "pipeline"], help="Build the three required CSVs")
    export.add_argument("--data", default=os.getenv("MONEYGRAPH_DATA_DIR"), help="Directory containing the three Parquet files; omit for synthetic data")
    export.add_argument("--out", default=os.getenv("MONEYGRAPH_OUTPUT_DIR", "outputs"))
    serve = commands.add_parser("serve", help="Serve API and the built frontend")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", default=8000, type=int)
    serve.add_argument("--data", default=os.getenv("MONEYGRAPH_DATA_DIR"))
    demo = commands.add_parser("demo-data", help="Write original synthetic Parquet fixtures")
    demo.add_argument("--out", default="outputs/demo-data")
    options = parser.parse_args()
    if options.command == "serve":
        import uvicorn
        if options.data:
            os.environ["MONEYGRAPH_DATA_DIR"] = options.data
        uvicorn.run("moneygraph.api:app", host=options.host, port=options.port, access_log=False)
    elif options.command == "demo-data":
        output = Path(options.out)
        output.mkdir(parents=True, exist_ok=True)
        for name, frame in zip(("nodes", "edges", "transactions"), synthetic_frames(), strict=True):
            frame.write_parquet(output / f"{name}.parquet")
        print(json.dumps({"dataset": "synthetic", "directory": str(output)}))
    else:
        analysis = load_analysis(options.data)
        files = analysis.exports(options.out)
        from .audit import provenance
        receipt_path = Path(options.out) / "provenance.json"
        receipt_path.write_text(json.dumps(provenance(analysis), indent=2, sort_keys=True) + "\n", encoding="utf-8")
        files["provenance.json"] = str(receipt_path)
        summary = analysis.summary()
        print(json.dumps({"dataset": summary["dataset"]["kind"], "counts": summary["counts"],
                          "runtime_ms": summary["runtime_ms"], "exports": files}, indent=2))


if __name__ == "__main__":
    main()

"""CLI for local analysis, export, synthetic fixtures, and the web app."""

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from polars.exceptions import PolarsError

from .engine import load_analysis, synthetic_frames


def _report_path(options) -> Path | None:
    path = getattr(options, "report", None)
    if not path:
        return None
    target = Path(path).expanduser().resolve()
    # Reports must never replace the input tables or the submission being checked.
    protected = set()
    if getattr(options, "data", None):
        protected.update((Path(options.data).expanduser() / f"{name}.parquet").resolve()
                         for name in ("nodes", "edges", "transactions"))
    if options.command == "validate-submission":
        from .exports import EXPORT_NAMES
        protected.update((Path(options.out).expanduser() / name).resolve()
                         for name in (*EXPORT_NAMES, "provenance.json"))
    if target in protected:
        raise ValueError("Report path must not overwrite input tables or submission files")
    return target


def _print_report(report: dict, path: Path | None, *, text: str | None = None) -> None:
    encoded = json.dumps(report, indent=2, sort_keys=True, allow_nan=False) + "\n"
    if path is not None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(encoded, encoding="utf-8", newline="\n")
    print(text if text is not None else encoded, end="\n" if text is not None else "")


def _execute(options) -> int:
    report_path = _report_path(options)
    if options.command == "serve":
        import uvicorn
        if options.data:
            os.environ["MONEYGRAPH_DATA_DIR"] = options.data
        uvicorn.run("moneygraph.api:app", host=options.host, port=options.port, access_log=False)
        return 0
    if options.command == "demo-data":
        output = Path(options.out).expanduser()
        output.mkdir(parents=True, exist_ok=True)
        for name, frame in zip(("nodes", "edges", "transactions"), synthetic_frames(), strict=True):
            frame.write_parquet(output / f"{name}.parquet")
        print(json.dumps({"dataset": "synthetic", "directory": str(output)}))
        return 0
    if getattr(options, "bundle", None) and Path(options.bundle).suffix.lower() != ".zip":
        raise ValueError("Bundle destination must end in .zip")
    try:
        analysis = load_analysis(options.data)
    except (ValueError, TypeError, OverflowError):
        # Parsing exceptions may contain private cell values. Keep diagnostics structural.
        raise ValueError("Cannot analyze input: check nodes.parquet, edges.parquet and transactions.parquet, "
                         "required columns, valid dates/amounts and consistent aggregates") from None
    if options.command == "validate-submission":
        from .submission import validate_submission
        report = validate_submission(analysis, Path(options.out).expanduser())
        _print_report(report, report_path)
        return 0 if report["valid"] else 1
    if options.command == "explain":
        from .explain import explain_node, format_explanation
        report = explain_node(analysis, options.gid)
        _print_report(report, report_path, text=None if options.json else format_explanation(report))
        return 0
    if options.command in {"sensitivity", "compare-rankings"}:
        from .ranking import compare_rankings, sensitivity_report
        report = (sensitivity_report(analysis, delta=options.delta, top=options.top)
                  if options.command == "sensitivity" else compare_rankings(analysis, top=options.top))
        _print_report(report, report_path)
        return 0
    output = Path(options.out).expanduser()
    files = analysis.exports(output)
    from .audit import provenance
    receipt_path = output / "provenance.json"
    receipt_path.write_text(json.dumps(provenance(analysis), indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    files["provenance.json"] = str(receipt_path)
    summary = analysis.summary()
    result = {"dataset": summary["dataset"]["kind"], "counts": summary["counts"],
              "runtime_ms": summary["runtime_ms"], "exports": files}
    if options.bundle:
        from .bundle import build_bundle
        result["bundle"] = str(build_bundle(analysis, output, Path(options.bundle).expanduser()))
    print(json.dumps(result, indent=2))
    return 0


def main() -> None:
    load_dotenv(override=False)
    parser = argparse.ArgumentParser(prog="moneygraph", description="Local explainable transaction graph analysis")
    commands = parser.add_subparsers(dest="command", required=True)

    def data_argument(command):
        command.add_argument("--data", default=os.getenv("MONEYGRAPH_DATA_DIR"),
                             help="Directory with three Parquet files; default MONEYGRAPH_DATA_DIR, otherwise synthetic")

    def report_argument(command):
        data_argument(command)
        command.add_argument("--report", help="Also save the full JSON report locally")

    export = commands.add_parser("export", aliases=["analyze", "pipeline"], help="Build the three required CSVs")
    data_argument(export)
    export.add_argument("--out", default=os.getenv("MONEYGRAPH_OUTPUT_DIR", "outputs"))
    export.add_argument("--bundle", metavar="FILE.zip", help="Validate and pack CSVs, provenance and validation report")
    validate = commands.add_parser("validate-submission", help="Check actual CSV files against the loaded analysis")
    report_argument(validate)
    validate.add_argument("--out", default=os.getenv("MONEYGRAPH_OUTPUT_DIR", "outputs"), help="Directory to validate")
    explain = commands.add_parser("explain", help="Explain all role rules and priority contributions for one account")
    report_argument(explain)
    explain.add_argument("--gid", required=True, type=int)
    explain.add_argument("--json", action="store_true", help="Print structured JSON instead of readable text")
    sensitivity = commands.add_parser("sensitivity", help="Measure rank changes under twelve weight perturbations")
    report_argument(sensitivity)
    sensitivity.add_argument("--delta", default=0.1, type=float, help="Relative weight change, from 0 to 0.5 (default 0.1)")
    sensitivity.add_argument("--top", default=20, type=int, help="Top set size, from 1 to 100")
    comparison = commands.add_parser("compare-rankings", help="Compare priority with volume-only and degree-only rankings")
    report_argument(comparison)
    comparison.add_argument("--top", default=20, type=int, help="Top set size, from 1 to 100")
    serve = commands.add_parser("serve", help="Serve API and the built frontend")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", default=8000, type=int)
    data_argument(serve)
    demo = commands.add_parser("demo-data", help="Write original synthetic Parquet fixtures")
    demo.add_argument("--out", default="outputs/demo-data")
    options = parser.parse_args()
    try:
        status = _execute(options)
    except KeyError:
        parser.error("Account ID is not present in the loaded dataset")
    except ValueError as error:
        parser.error(str(error))
    except (OSError, PolarsError):
        parser.error("Cannot read input or write output; check paths, permissions and Parquet format")
    if status:
        raise SystemExit(status)


if __name__ == "__main__":
    main()

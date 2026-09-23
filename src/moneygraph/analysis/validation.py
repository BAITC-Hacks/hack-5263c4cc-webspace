"""Validate and canonicalize the three input tables without external I/O."""
from collections import defaultdict
import math

import polars as pl

from ..domain.models import CanonicalInput, day_value as _day

def validate_inputs(nodes: pl.DataFrame, edges: pl.DataFrame, tx: pl.DataFrame) -> None:
    required = [(nodes, {"gid", "depth", "is_seed"}), (edges, {"src", "dst", "sum_kzt", "n_tx", "depth"}),
                (tx, {"src", "dst", "date", "sum_kzt"})]
    for frame, columns in required:
        if not columns.issubset(frame.columns):
            raise ValueError(f"Input table is missing required columns: {', '.join(sorted(columns - set(frame.columns)))}")
        if any(frame.select(sorted(columns)).null_count().row(0)):
            raise ValueError("Required input fields must not contain null values")
    if not nodes.height:
        raise ValueError("The nodes table must contain at least one node")
    gids = nodes["gid"].to_list()
    if any(not isinstance(gid, int) or isinstance(gid, bool) for gid in gids):
        raise ValueError("Node identifiers must be integers")
    if any(not 0 <= gid <= 2**63 - 1 for gid in gids):
        raise ValueError("Node identifiers must be within the nonnegative int64 range")
    if len(set(gids)) != len(gids):
        raise ValueError("Node identifiers must be unique")
    if any(not isinstance(d, int) or isinstance(d, bool) or d < 0 for d in nodes["depth"]):
        raise ValueError("Node depth must be a nonnegative integer")
    if any(not isinstance(v, bool) for v in nodes["is_seed"]):
        raise ValueError("is_seed must contain boolean values")
    known = set(gids)
    for frame in (edges, tx):
        for column in ("src", "dst"):
            if any(not isinstance(value, int) or isinstance(value, bool) for value in frame[column]):
                raise ValueError("Edge and transaction endpoints must be integers")
        if not (set(frame["src"]) | set(frame["dst"])).issubset(known):
            raise ValueError("Every edge and transaction endpoint must exist in nodes")
        if any(not math.isfinite(float(v)) or float(v) <= 0 for v in frame["sum_kzt"]):
            raise ValueError("Transaction and edge amounts must be finite and positive")
    for column, minimum in (("n_tx", 1), ("depth", 0)):
        if any(not isinstance(value, int) or isinstance(value, bool) or value < minimum for value in edges[column]):
            message = "Edge transaction counts must be positive integers" if column == "n_tx" else "Edge depth must be a nonnegative integer"
            raise ValueError(message)
    pairs = [(r["src"], r["dst"]) for r in edges.iter_rows(named=True)]
    if len(pairs) != len(set(pairs)):
        raise ValueError("Edges must have one row per directed pair")
    aggregate: dict[tuple[int, int], list[float]] = defaultdict(lambda: [0.0, 0])
    for row in tx.iter_rows(named=True):
        _day(row["date"])
        pair = aggregate[(row["src"], row["dst"])]
        pair[0] += float(row["sum_kzt"])
        pair[1] += 1
    if set(pairs) != set(aggregate):
        raise ValueError("Edges and transactions do not cover the same directed pairs")
    for r in edges.iter_rows(named=True):
        total, count = aggregate[(r["src"], r["dst"])]
        if not math.isclose(float(r["sum_kzt"]), total, rel_tol=0.0, abs_tol=0.01) or r["n_tx"] != count:
            raise ValueError("Edge amounts or counts do not match transaction aggregates")



def prepare_input(nodes: pl.DataFrame, edges: pl.DataFrame, transactions: pl.DataFrame) -> CanonicalInput:
    validate_inputs(nodes, edges, transactions)
    return CanonicalInput(
        nodes={int(row["gid"]): {"gid": int(row["gid"]), "depth": int(row["depth"]), "is_seed": bool(row["is_seed"])}
               for row in nodes.sort("gid").to_dicts()},
        edges=sorted(edges.to_dicts(), key=lambda row: (row["src"], row["dst"])),
        transactions=sorted(transactions.to_dicts(), key=lambda row: (_day(row["date"]), row["src"], row["dst"], row["sum_kzt"])),
    )

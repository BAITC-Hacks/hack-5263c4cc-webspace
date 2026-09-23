"""Explicit local Parquet loading without environment or network access."""
from pathlib import Path

import polars as pl


def read_parquet_tables(data_dir: str | Path) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    directory = Path(data_dir).expanduser().resolve()
    paths = {name: directory / f"{name}.parquet" for name in ("nodes", "edges", "transactions")}
    if not all(path.is_file() for path in paths.values()):
        raise ValueError("MONEYGRAPH_DATA_DIR must contain nodes.parquet, edges.parquet and transactions.parquet")
    return tuple(pl.read_parquet(paths[name]) for name in ("nodes", "edges", "transactions"))

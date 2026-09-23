"""Original deterministic demonstration, containing no organizer records."""
from datetime import date
import random
from typing import Any

import polars as pl

def synthetic_frames() -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Create a reproducible, original demo with no organizer records or labels."""
    rng = random.Random(5263)
    nodes: dict[int, dict[str, Any]] = {}
    tx: list[dict[str, Any]] = []

    def add(gid: int, depth: int, seed: bool = False) -> int:
        nodes[gid] = {"gid": gid, "depth": depth, "is_seed": seed}
        return gid

    def transfer(src: int, dst: int, amount: float, day: int) -> None:
        tx.append({"src": src, "dst": dst, "date": date(2026, 7, day), "sum_kzt": float(amount)})

    collectors = []
    for group in range(3):
        base = 1000 + group * 100
        seeds = [add(base + i, 0, True) for i in range(1, 7)]
        collect = [add(base + 10 + i, 1) for i in range(2)]
        transit = [add(base + 20 + i, 2) for i in range(3)]
        distributors = [add(base + 30 + i, 3) for i in range(2)]
        boundary = [add(base + 40 + i, 4) for i in range(18)]
        terminals = [add(base + 70 + i, 3) for i in range(4)]
        collectors.append(collect)
        for cycle in range(4):
            day = 2 + cycle * 6
            for i, seed in enumerate(seeds):
                transfer(seed, collect[i % 2], rng.randrange(8, 22) * 5000, day)
                if i < 3:
                    transfer(seed, collect[(i + 1) % 2], 10000, day)
            for i, collector in enumerate(collect):
                transfer(collector, transit[i], 120000, day + 1)
                transfer(collector, transit[2], 20000, day + 1)
            transfer(transit[0], distributors[0], 115000, day + 2)
            transfer(transit[1], distributors[1], 115000, day + 2)
            for terminal in terminals:
                transfer(transit[2], terminal, 10000, day + 2)
            for i, target in enumerate(boundary):
                transfer(distributors[i % 2], target, 10000, day + 3)
        # One source-only account illustrates incomplete visible inflows.
        add(base + 90, 0, True)
    for i in range(3):
        transfer(collectors[i][0], collectors[(i + 1) % 3][1], 15000, 28)
    transactions = pl.DataFrame(tx)
    edges = transactions.group_by(["src", "dst"]).agg(
        pl.col("sum_kzt").sum(), pl.len().alias("n_tx")
    ).with_columns(
        pl.col("src").replace_strict({gid: min(row["depth"] + 1, 4) for gid, row in nodes.items()}).alias("depth")
    ).sort(["src", "dst"])
    return pl.DataFrame(list(nodes.values())).sort("gid"), edges, transactions.sort(["date", "src", "dst"])

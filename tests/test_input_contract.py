"""Invalid table primitives fail before they can produce unusable API identifiers."""
import polars as pl
import pytest
from fastapi.testclient import TestClient

from moneygraph.api import make_app
from moneygraph.engine import Analysis, synthetic_frames


@pytest.mark.parametrize("gid", [-1, 2**63])
def test_unsupported_node_id_range_fails_before_analysis(gid):
    _, edges, tx = synthetic_frames()
    nodes = pl.DataFrame({"gid": [gid], "depth": [0], "is_seed": [True]},
                         schema_overrides={"gid": pl.Int64 if gid < 0 else pl.UInt64})
    with pytest.raises(ValueError, match="nonnegative int64"):
        Analysis(nodes, edges.head(0), tx.head(0))


@pytest.mark.parametrize("table,column,dtype", [
    (1, "src", pl.Float64), (1, "dst", pl.Float64),
    (2, "src", pl.Float64), (2, "dst", pl.Float64),
    (1, "n_tx", pl.Float64), (1, "depth", pl.Float64),
])
def test_integer_fields_do_not_accept_float_equivalence(table, column, dtype):
    frames = list(synthetic_frames())
    frames[table] = frames[table].with_columns(pl.col(column).cast(dtype))
    with pytest.raises(ValueError, match="integer"):
        Analysis(*frames)


@pytest.mark.parametrize("gid", [0, 2**63 - 1])
def test_int64_boundary_ids_and_empty_period_roundtrip(gid):
    _, edges, tx = synthetic_frames()
    nodes = pl.DataFrame({"gid": [gid], "depth": [0], "is_seed": [True]})
    with TestClient(make_app(Analysis(nodes, edges.head(0), tx.head(0)))) as client:
        summary = client.get("/api/v1/summary")
        assert summary.status_code == 200
        assert summary.json()["period"] == {"start": None, "end": None}
        node = client.get(f"/api/v1/nodes/{gid}")
        assert node.status_code == 200
        assert node.json()["gid"] == str(gid)
        assert node.json()["metrics"]["pass_through"] is None

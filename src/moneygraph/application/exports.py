"""The single byte serializer for required CSV artifacts."""
from __future__ import annotations

import csv
import io
import json
from typing import Any

from ..analysis.snapshot import snapshot_of
from ..domain.models import CLUSTER_COLUMNS, ROLE_COLUMNS, TOP_COLUMNS

EXPORT_NAMES = ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")


class ExportService:
    def __init__(self, analysis: Any):
        self.snapshot = snapshot_of(analysis)

    def rows(self, name: str) -> tuple[tuple[str, ...], list[dict[str, Any]]]:
        if name == "nodes_roles.csv":
            records = self.snapshot.node_records()
            return ROLE_COLUMNS, [{key: row[key] for key in ROLE_COLUMNS}
                                  for row in sorted(records.values(), key=lambda row: row["gid"])]
        if name == "clusters.csv":
            return CLUSTER_COLUMNS, [{key: json.dumps(row[key]) if key == "top_gids" else row[key]
                                      for key in CLUSTER_COLUMNS} for row in self.snapshot.cluster_records()]
        if name == "top_nodes.csv":
            ranked = self.snapshot.ranked_records()
            return TOP_COLUMNS, [{"rank": row["rank"], "gid": row["gid"], "role": row["role"],
                                  "priority_score": row["priority_score"], "why": row["evidence"]}
                                 for row in ranked[:max(20, min(100, len(ranked)))]]
        raise ValueError("Unknown export")

    def render(self, name: str) -> bytes:
        columns, rows = self.rows(name)
        stream = io.StringIO(newline="")
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\r\n")
        writer.writeheader()
        writer.writerows(rows)
        return stream.getvalue().encode("utf-8")

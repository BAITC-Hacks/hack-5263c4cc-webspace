"""One byte-exact CSV contract for files, HTTP downloads and receipts."""
from __future__ import annotations

import csv
from io import StringIO
from typing import Any

EXPORT_NAMES = ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")


def export_content(analysis: Any, name: str) -> str:
    columns, rows = analysis.export_rows(name)
    stream = StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def export_bytes(analysis: Any, name: str) -> bytes:
    return export_content(analysis, name).encode("utf-8")

"""Canonical UTF-8 CSV bytes shared by files, HTTP downloads and receipts."""
from __future__ import annotations

import csv
from io import StringIO
from typing import Any, Protocol


EXPORT_NAMES = ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")


class ExportSource(Protocol):
    def export_rows(self, name: str) -> tuple[tuple[str, ...], list[dict[str, Any]]]: ...


def export_bytes(analysis: ExportSource, name: str) -> bytes:
    """Preserve declared columns, row order, CSV quoting and CRLF line endings."""
    columns, rows = analysis.export_rows(name)
    stream = StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode("utf-8")

import hashlib
import json
import os
import subprocess
import sys

from fastapi.testclient import TestClient
import pytest

from moneygraph.api import make_app
from moneygraph.audit import export_content
from moneygraph.engine import load_analysis
from moneygraph.exports import EXPORT_NAMES, export_bytes


def test_cli_http_and_receipts_share_exact_csv_bytes(tmp_path):
    output = tmp_path / "cli"
    environment = {
        **os.environ,
        "PYTHON_DOTENV_DISABLED": "1",
        "MONEYGRAPH_DATA_DIR": "",
        "MONEYGRAPH_AI_ENABLED": "false",
        "MONEYGRAPH_ALLOW_EXTERNAL_AI": "false",
    }
    subprocess.run(
        [sys.executable, "-m", "moneygraph", "export", "--out", str(output)],
        cwd=tmp_path, env=environment, capture_output=True, text=True, timeout=30, check=True,
    )
    cli_receipt = json.loads((output / "provenance.json").read_text(encoding="utf-8"))
    analysis = load_analysis()
    with TestClient(make_app(analysis)) as client:
        http_receipt = client.get("/api/provenance").json()
        assert http_receipt["exports"] == cli_receipt["exports"]
        assert tuple(item["name"] for item in cli_receipt["exports"]) == EXPORT_NAMES
        for item in cli_receipt["exports"]:
            name = item["name"]
            response = client.get(f"/api/exports/{name}")
            assert response.status_code == 200
            content = (output / name).read_bytes()
            assert content == response.content == export_bytes(analysis, name)
            assert content == export_content(analysis, name).encode("utf-8")
            assert len(content) == item["bytes"]
            assert hashlib.sha256(content).hexdigest() == item["sha256"]
            assert content.endswith(b"\r\n")


def test_csv_bytes_preserve_unicode_quoting_newlines_and_number_text():
    class EvidenceFixture:
        def export_rows(self, name):
            return ("gid", "role", "role_score", "cluster_id", "priority_score", "evidence"), [
                {"gid": 2, "role": "transit", "role_score": 0.5, "cluster_id": 0,
                 "priority_score": 0.0, "evidence": 'Счёт, "quoted"\nsecond line'},
            ]

    content = export_bytes(EvidenceFixture(), "nodes_roles.csv")
    assert content == (
        'gid,role,role_score,cluster_id,priority_score,evidence\r\n'
        '2,transit,0.5,0,0.0,"Счёт, ""quoted""\nsecond line"\r\n'
    ).encode("utf-8")


def test_csv_bytes_preserve_unknown_export_rejection():
    with pytest.raises(ValueError, match="Unknown export"):
        export_bytes(load_analysis(), "unrecognized.csv")

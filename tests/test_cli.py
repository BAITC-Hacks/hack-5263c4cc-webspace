import csv
import hashlib
import json
import os
import subprocess
import sys


def test_clean_directory_cli_produces_all_exports_and_matching_receipt(tmp_path):
    environment = {**os.environ, 'MONEYGRAPH_DATA_DIR':'', 'MONEYGRAPH_AI_ENABLED':'false'}
    result = subprocess.run([sys.executable, '-m', 'moneygraph', 'export', '--out', str(tmp_path/'result')],
                            cwd=tmp_path, env=environment, capture_output=True, text=True, timeout=30, check=True)
    report = json.loads(result.stdout)
    assert report['dataset'] == 'synthetic'
    receipt = json.loads((tmp_path/'result'/'provenance.json').read_text())
    for exported in receipt['exports']:
        path = tmp_path/'result'/exported['name']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == exported['sha256']
        with path.open() as stream:
            assert len(list(csv.DictReader(stream))) == exported['rows']
    assert report['counts']['nodes'] > 20

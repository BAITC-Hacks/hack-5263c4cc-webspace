import hashlib

from moneygraph.audit import dossier_markdown, provenance
from moneygraph.engine import Analysis, synthetic_frames


def test_receipt_matches_export_files_and_is_order_invariant(tmp_path):
    nodes, edges, tx = synthetic_frames()
    first = Analysis(nodes, edges, tx)
    second = Analysis(nodes.reverse(), edges.reverse(), tx.reverse())
    receipt = provenance(first)
    assert receipt == provenance(second)
    paths = first.exports(tmp_path)
    for item in receipt['exports']:
        from pathlib import Path
        assert hashlib.sha256(Path(paths[item['name']]).read_bytes()).hexdigest() == item['sha256']
    changed = tx.with_columns((tx['sum_kzt'] * 2).alias('sum_kzt'))
    changed_edges = edges.with_columns((edges['sum_kzt'] * 2).alias('sum_kzt'))
    assert provenance(Analysis(nodes, changed_edges, changed))['dataset_sha256'] != receipt['dataset_sha256']


def test_dossier_preserves_uncertainty_and_receipt():
    dossier = {'title': 'Account review', 'gid': 1, 'role': 'boundary_unknown', 'priority_score': .2,
               'evidence': ['Depth 4'], 'hypotheses': ['Financial purpose unknown'],
               'missing_evidence': ['Outgoing transfers beyond depth 4'],
               'next_requests': [{'priority': 1, 'request': 'Extend collection.', 'reason': 'Boundary.'}]}
    rendered = dossier_markdown(dossier, {'dataset_sha256': 'abc', 'algorithm_sha256': 'def'})
    assert 'not a finding of wrongdoing' in rendered
    assert 'Outgoing transfers beyond depth 4' in rendered
    assert '`abc`' in rendered

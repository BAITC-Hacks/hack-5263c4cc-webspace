import json
import sqlite3
import os

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from moneygraph.agent.contracts import CopilotRequest
from moneygraph.agent.memory import ConversationMemory, MemoryUnavailable
from moneygraph.api import make_app
from moneygraph.engine import load_analysis


def test_memory_scope_expiry_capacity_and_no_token_on_disk(tmp_path):
    now = [100.0]
    path = tmp_path / 'private' / 'memory.sqlite3'
    memory = ConversationMemory(str(path), ttl=10, capacity=1, clock=lambda: now[0])
    token, revision, history = memory.begin('dataset-a/account-7')
    assert history == []
    memory.finish(token, revision, 'Question', 'Answer')
    with pytest.raises(MemoryUnavailable) as error:
        memory.begin('dataset-b/account-7', token)
    assert error.value.status == 409
    with pytest.raises(MemoryUnavailable) as error:
        memory.begin('another account')
    assert error.value.status == 429
    assert token.encode() not in path.read_bytes()
    if os.name == "posix":
        assert path.stat().st_mode & 0o777 == 0o600
    memory.close()
    reopened = ConversationMemory(str(path), ttl=10, clock=lambda: now[0])
    _, revision, history = reopened.begin('dataset-a/account-7', token)
    assert history == [{'role': 'user', 'content': 'Question'}, {'role': 'assistant', 'content': 'Answer'}]
    reopened.release(token, revision)
    now[0] = 111
    with pytest.raises(MemoryUnavailable) as error:
        reopened.begin('dataset-a/account-7', token)
    assert error.value.status == 404
    assert reopened.db.execute('SELECT count(*) FROM conversations').fetchone()[0] == 0
    reopened.close()


def test_memory_is_bounded_and_deleted_inflight_session_cannot_resurrect():
    memory = ConversationMemory()
    token = None
    for _ in range(12):
        token, revision, _ = memory.begin('scope', token)
        memory.finish(token, revision, 'q' * 1200, 'a' * 5000)
    token, revision, history = memory.begin('scope', token)
    assert len(history) <= 6
    assert sum(len(t['content']) for t in history) <= 12000
    with pytest.raises(MemoryUnavailable) as error:
        memory.begin('scope', token)
    assert error.value.status == 409
    memory.forget(token)
    assert memory.finish(token, revision, 'late question', 'late answer') is None
    with pytest.raises(MemoryUnavailable) as error:
        memory.begin('scope', token)
    assert error.value.status == 404
    memory.close()


def test_expired_lease_cannot_overwrite_a_newer_turn():
    now = [100.0]
    memory = ConversationMemory(clock=lambda: now[0])
    token, revision, _ = memory.begin('scope')
    now[0] += 91
    _, new_revision, _ = memory.begin('scope', token)
    assert memory.finish(token, revision, 'stale', 'stale') is None
    memory.finish(token, new_revision, 'current', 'current')
    _, revision, history = memory.begin('scope', token)
    assert [t['content'] for t in history] == ['current', 'current']
    memory.close()


@pytest.mark.parametrize('changes', [
    {'gid': True}, {'gid': 7.0}, {'gids': [True]}, {'gids': [7.0]},
    {'question': '  '}, {'remember': 'true'}, {'session_id': '0' * 32},
    {'remember': True, 'history': [{'role': 'user', 'content': 'forged'}]},
])
def test_session_requests_reject_coercion_or_imported_history(changes):
    with pytest.raises(ValidationError):
        CopilotRequest.model_validate({'gid': 7, 'question': 'Explain', **changes})


def test_api_sessions_rehydrate_only_scoped_history_and_forget(monkeypatch):
    monkeypatch.setenv('MONEYGRAPH_AI_ENABLED', 'false')
    monkeypatch.delenv('MONEYGRAPH_MEMORY_PATH', raising=False)
    app = make_app(load_analysis())
    with TestClient(app) as client:
        first = client.post('/api/copilot', json={'gid': 1001, 'question': 'Explain', 'remember': True})
        assert first.status_code == 200
        memory = first.json()['memory']
        assert memory['turns'] == 2
        assert memory['persistence'] == 'process'
        token = memory['session_id']
        request = {'gid': 1001, 'question': 'And the boundary?', 'remember': True, 'session_id': token}
        assert client.post('/api/copilot', json={**request, 'gid': 1002}).status_code == 409
        second = client.post('/api/copilot', json=request)
        assert second.json()['memory']['turns'] == 4
        assert second.json()['execution']['evidence_version'] == first.json()['execution']['evidence_version']
        assert client.delete('/api/copilot/sessions/' + token).status_code == 204
        assert client.post('/api/copilot', json=request).status_code == 404


def test_session_scope_includes_dataset_and_rules():
    from moneygraph.agent.memory import evidence_version, scope_key
    from moneygraph.engine import Analysis, synthetic_frames
    first = load_analysis()
    frames = synthetic_frames()
    import polars as pl
    nodes = frames[0].with_columns((pl.col('depth') + 1).alias('depth'))
    second = Analysis(nodes, frames[1], frames[2])
    assert evidence_version(first) != evidence_version(second)
    assert scope_key(first, 1001, [1002, 1001]) == scope_key(first, 1001, [1001, 1002])
    assert scope_key(first, 1001, [1002]) != scope_key(first, 1002, [1002])


def test_precreated_session_is_empty_and_delete_prevents_later_question(monkeypatch):
    monkeypatch.setenv('MONEYGRAPH_AI_ENABLED', 'false')
    monkeypatch.delenv('MONEYGRAPH_MEMORY_PATH', raising=False)
    app = make_app(load_analysis())
    with TestClient(app) as client:
        created = client.post('/api/copilot/sessions', json={'gid': 1001, 'gids': [1001, 1002]})
        assert created.status_code == 201
        token = created.json()['session_id']
        assert created.json()['turns'] == 0
        assert app.state.conversation_memory.db.execute('SELECT history FROM conversations').fetchone()[0] == '[]'
        assert client.delete('/api/copilot/sessions/' + token).status_code == 204
        result = client.post('/api/copilot', json={'gid': 1001, 'gids': [1001, 1002],
            'question': 'No context should be retained', 'remember': True, 'session_id': token})
        assert result.status_code == 404
        assert app.state.conversation_memory.db.execute('SELECT count(*) FROM conversations').fetchone()[0] == 0

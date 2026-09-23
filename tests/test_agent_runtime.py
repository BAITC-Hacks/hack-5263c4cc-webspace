import json
from types import SimpleNamespace

from moneygraph.agent.runtime import run_investigation
from moneygraph.copilot import CopilotRequest
from test_copilot import Engine, FakeClient, answer_response, tool_response


def test_deadline_checked_after_provider_and_remaining_timeout_passed():
    now = [0.0]
    class SlowClient(FakeClient):
        def create(self, **kwargs):
            response = super().create(**kwargs)
            now[0] += 46
            return response
    client = SlowClient([tool_response()])
    result = run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), client, clock=lambda: now[0])
    assert result['mode'] == 'fallback'
    assert result['execution']['fallback_code'] == 'deadline_exceeded'
    assert result['trace'] == []
    assert client.requests[0]['timeout'] == 20


def test_final_round_cannot_execute_a_tool_even_if_provider_ignores_schema():
    calls = [tool_response() for _ in range(3)]
    for index, response in enumerate(calls):
        response.output[0].call_id = str(index)
    client = FakeClient(calls)
    result = run_investigation(Engine(), CopilotRequest(gid=7, question='Keep looking'), client)
    assert len(client.requests) == 3
    assert result['execution']['tool_calls'] == 2
    assert result['execution']['fallback_code'] == 'tools_disabled'
    assert [item['status'] for item in result['trace']] == ['complete', 'cached']


def test_usage_and_evidence_receipt_are_returned_without_raw_provider_state():
    first, last = tool_response(), answer_response()
    first.usage = SimpleNamespace(input_tokens=100, output_tokens=25)
    last.usage = SimpleNamespace(input_tokens=120, output_tokens=75)
    result = run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), FakeClient([first, last]))
    assert result['execution']['input_tokens'] == 220
    assert result['execution']['output_tokens'] == 100
    assert len(result['citations'][0]['payload_sha256']) == 64
    assert result['execution']['status'] == 'completed'
    assert 'conversation_history' not in json.dumps(result)


def test_replayed_call_id_and_cached_argument_override_are_rejected():
    for second in [tool_response(), tool_response(arguments='{"gid":999}')]:
        result = run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), FakeClient([tool_response(), second]))
        assert result['mode'] == 'fallback'
        assert len(result['trace']) == 1


def test_semaphore_released_after_failed_validation():
    invalid = answer_response('node:999')
    assert run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), FakeClient([tool_response(), invalid]))['mode'] == 'fallback'
    for _ in range(3):
        assert run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), FakeClient([tool_response(), answer_response()]))['mode'] == 'openai'


def test_complete_brief_separates_evidence_hypotheses_gaps_without_mutation():
    from moneygraph.agent.evidence import evidence_tool
    from moneygraph.engine import load_analysis
    engine = load_analysis()
    before = engine.export_rows('nodes_roles.csv')
    result = evidence_tool('inspect_investigation_brief', '{}', engine, 1020)
    assert result['evidence_id'] == 'brief:1020'
    assert {'observations', 'hypotheses', 'missing_evidence', 'coverage', 'next_requests'} <= result['data'].keys()
    assert len(json.dumps(result, default=str)) < 24000
    assert len(result['data']['signal_examples']['routes']) <= 2
    assert engine.export_rows('nodes_roles.csv') == before


def test_provider_replayed_items_count_toward_context_budget():
    first = tool_response()
    first.output.append(SimpleNamespace(type='reasoning', content='x' * 80000))
    client = FakeClient([first])
    result = run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), client)
    assert result['execution']['fallback_code'] == 'context_budget_exhausted'
    assert result['trace'] == []
    assert len(client.requests) == 1


def test_blank_answer_is_rejected_even_with_valid_citation():
    answer = answer_response()
    answer.output_text = json.dumps({'answer': '   ', 'citations': ['node:7'], 'limitations': []})
    result = run_investigation(Engine(), CopilotRequest(gid=7, question='Explain'), FakeClient([tool_response(), answer]))
    assert result['mode'] == 'fallback'
    assert result['execution']['fallback_code'] == 'validation_failed'

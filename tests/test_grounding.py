import json

import pytest
from pydantic import ValidationError

from moneygraph.agent.contracts import FORMAT, ModelAnswer
from moneygraph.agent.grounding import GroundingError, ground_answer, validate_observations


LARGE_ID = "9223372036854775807"


@pytest.fixture
def evidence():
    return {"node:" + LARGE_ID: {
        "evidence_id": "node:" + LARGE_ID,
        "payload_sha256": "999999999-secret-hash",
        "data": {"gid": LARGE_ID, "out_kzt": 1234567.89, "in_degree": 3,
                 "depth": 4, "role": "boundary_unknown", "is_seed": False,
                 "metrics": {"matched_2d_ratio": 0.712345},
                 "nullable": None, "examples": [{"source": LARGE_ID, "target": "42"}],
                 "a/b~c": "exact field", "token_hash": "999999999-private-token"},
        "coverage": {"truncated": True, "omitted_items": 2},
    }}


def claim(path, value, evidence_id="node:" + LARGE_ID):
    return {"evidence_id": evidence_id, "path": path, "value": value}


def test_checked_observations_use_server_values_labels_units_and_exact_large_ids(evidence):
    observations = validate_observations([
        claim("/data/gid", LARGE_ID), claim("/data/out_kzt", "1234567.8900"),
        claim("/data/role", '"boundary_unknown"'), claim("/coverage/truncated", "true"),
        claim("/data/nullable", "null"), claim("/data/examples/0/target", "42"),
        claim("/data/a~1b~0c", "exact field"),
    ], evidence)
    assert observations[0]["value"] == LARGE_ID
    assert observations[1] == {
        "evidence_id": "node:" + LARGE_ID, "path": "/data/out_kzt",
        "label": "Visible outgoing amount", "value": "1234567.89", "unit": "KZT",
    }
    assert observations[2]["value"] == "boundary_unknown"
    assert observations[3]["value"] == "true"
    assert observations[4]["value"] == "null"
    assert observations[5]["value"] == "42"
    assert observations[6]["value"] == "exact field"


@pytest.mark.parametrize("path,value", [
    ("/data/out_kzt", "999999999"), ("/data/out_kzt", "1234567.90"),
    ("/data/depth", "3"), ("/data/role", "terminal"),
    ("/data/is_seed", "0"), ("/data/in_degree", "true"),
    ("/data/gid", "9223372036854775808"),
    ("/data/gid", "9.223372036854776e18"),
    ("/data/gid", LARGE_ID + ".0"),
    ("/data/out_kzt", "NaN"), ("/data/out_kzt", "Infinity"),
])
def test_wrong_values_fail_even_with_retrieved_citation(evidence, path, value):
    with pytest.raises(GroundingError, match="observation_value_mismatch"):
        validate_observations([claim(path, value)], evidence)


@pytest.mark.parametrize("path", [
    "", "data/depth", "/data", "/data/examples", "/data/missing", "/data/examples/1/target",
    "/data/examples/00/target", "/data/examples/-1/target", "/data/examples/-/target",
    "/data/a~2b", "/data/a~", "/data/../../depth", "/evidence_id", "/payload_sha256",
    "/data/token_hash", "/data/metrics/matched_2d_ratio/anything",
])
def test_invalid_missing_container_or_metadata_paths_fail(evidence, path):
    with pytest.raises(GroundingError):
        validate_observations([claim(path, "4")], evidence)


def test_foreign_or_mislabeled_payload_never_authorizes_observation(evidence):
    with pytest.raises(GroundingError, match="unretrieved_observation"):
        validate_observations([claim("/data/depth", "4", "node:other")], evidence)
    evidence["node:" + LARGE_ID]["evidence_id"] = "node:other"
    with pytest.raises(GroundingError, match="unretrieved_observation"):
        validate_observations([claim("/data/depth", "4")], evidence)


def test_observation_validation_does_not_mutate_evidence_and_deduplicates(evidence):
    before = json.dumps(evidence, sort_keys=True)
    assert len(validate_observations([claim("/data/depth", "4")] * 2, evidence)) == 1
    assert json.dumps(evidence, sort_keys=True) == before
    with pytest.raises(GroundingError, match="too_many_observations"):
        validate_observations([claim("/data/depth", "4")] * 9, evidence)


@pytest.mark.parametrize("answer", [
    "Visible outgoing amount is 1,234,567.89 KZT.",
    "Visible outgoing amount is 1 234 567.89 KZT.",
    "Visible outgoing amount is 1\u202f234\u202f567.89 KZT.",
    "Visible outgoing amount is 1.23M KZT.",
    "Visible outgoing amount is 1234.568K KZT.",
    "Visible outgoing amount is 0.001235B KZT.",
    "The overlap is 71.2%.",
    "The overlap is 71.23 %.",
    "The overlap ratio is 0.712.",
    "Account " + LARGE_ID + " has 3 distinct incoming payers.",
    "1. Observed depth is 4.\n2. The evidence is truncated.",
])
def test_numeric_presence_handles_exact_decimal_ids_and_display_formats(evidence, answer):
    result = ground_answer(answer=answer, observations=[], evidence_by_id=evidence)
    assert result["grounding"]["numeric_literals_checked"] >= 1
    assert result["grounding"]["prose_entailment"] == "not_checked"


@pytest.mark.parametrize("answer", [
    "Visible outflow is 999999999 KZT.", "There are 999.999999M KZT.",
    "The overlap is 99.9%.", "Account 9223372036854775808 received money.",
])
def test_numeric_gate_rejects_unsupported_numbers_not_sourced_from_hashes(evidence, answer):
    with pytest.raises(GroundingError, match="unsupported_numeric_literal") as failure:
        ground_answer(answer=answer, observations=[], evidence_by_id=evidence)
    assert LARGE_ID not in str(failure.value)
    assert "999999999" not in str(failure.value)
    assert "secret" not in str(failure.value)


def test_checker_honestly_does_not_claim_semantic_entailment(evidence):
    result = ground_answer(answer="The observed depth is 3.", observations=[], evidence_by_id=evidence)
    # Three exists as payer count; free prose meaning is intentionally not certified.
    assert result["grounding"]["prose_entailment"] == "not_checked"
    assert result["grounding"]["typed_observations_checked"] == 0
    with pytest.raises(GroundingError, match="observation_value_mismatch"):
        ground_answer(answer="The observed depth is 3.", observations=[claim("/data/depth", "3")],
                      evidence_by_id=evidence)


def test_no_numeric_prose_returns_explicit_coverage(evidence):
    result = ground_answer(answer="Visible evidence is incomplete.", observations=[], evidence_by_id=evidence)
    assert result["grounding"]["numeric_literals_checked"] == 0
    assert result["grounding"]["prose_entailment"] == "not_checked"


def test_nonfinite_and_oversized_evidence_fail_without_serializing_it(evidence):
    evidence["node:" + LARGE_ID]["data"]["out_kzt"] = float("nan")
    with pytest.raises(GroundingError, match="nonfinite_observation"):
        validate_observations([claim("/data/out_kzt", "NaN")], evidence)
    with pytest.raises(GroundingError, match="grounding_answer_budget"):
        ground_answer(answer="x" * 5001, observations=[], evidence_by_id={})
    deep = {}
    cursor = deep
    for _ in range(22):
        cursor["nested"] = {}
        cursor = cursor["nested"]
    with pytest.raises(GroundingError, match="grounding_evidence_budget"):
        ground_answer(answer="Checked.", observations=[], evidence_by_id={"node:1": {"data": deep}})


def test_answer_contract_is_backward_compatible_but_provider_requires_observations():
    answer = ModelAnswer(answer="Evidence is incomplete.", citations=["node:1"], limitations=[])
    assert answer.observations == []
    schema = FORMAT["schema"]
    assert "observations" in schema["required"]
    assert schema["properties"]["observations"]["items"]["additionalProperties"] is False
    with pytest.raises(ValidationError):
        ModelAnswer(answer="Checked.", citations=["node:1"], limitations=[],
                    observations=[claim("/data/depth", 4)])
    with pytest.raises(ValidationError):
        ModelAnswer(answer="Checked.", citations=["node:1"], limitations=[],
                    observations=[claim("/data/depth", "4")] * 9)

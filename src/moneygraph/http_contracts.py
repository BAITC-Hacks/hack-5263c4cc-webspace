"""Public JSON response contracts, independent of datasets and provider clients.

Models reject undeclared fields so an engine change cannot silently disappear at
the HTTP boundary. Account IDs are strings on the wire, with exact integers
accepted from the deterministic engine. These DTOs do not assign financial roles.
"""
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, JsonValue

from .identifiers import parse_account_id


def _account_string(value: object) -> str:
    return str(parse_account_id(value))


AccountId = Annotated[str, BeforeValidator(_account_string), Field(pattern=r"^(0|[1-9][0-9]{0,18})$")]
Day = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
Role = Literal["consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral", "boundary_unknown"]
DatasetKind = Literal["synthetic", "official"]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class ErrorResponse(Contract):
    detail: str


class HealthResponse(Contract):
    status: Literal["ok"]
    dataset_kind: DatasetKind


class NodeSummary(Contract):
    gid: AccountId
    role: Role
    role_score: float
    priority_score: float
    cluster_id: int
    evidence: str
    depth: int
    is_seed: bool
    truncated_by_depth: bool
    in_degree: int
    out_degree: int
    in_kzt: float
    out_kzt: float
    rank: int


class DatasetInfo(Contract):
    name: str
    kind: DatasetKind
    description: str


class SummaryCounts(Contract):
    nodes: int
    edges: int
    transactions: int
    seeds: int
    clusters: int
    components: int
    boundary_nodes: int
    isolated_nodes: int


class Period(Contract):
    start: Day | None
    end: Day | None


class SummaryActivity(Contract):
    start: Day
    end: Day
    n_tx: int
    sum_kzt: float


class SummaryResponse(Contract):
    dataset: DatasetInfo
    counts: SummaryCounts
    period: Period
    activity: list[SummaryActivity]
    total_kzt: float
    runtime_ms: float
    role_counts: dict[Role, int]
    limitations: list[str]
    top_nodes: list[NodeSummary]


class NodesResponse(Contract):
    items: list[NodeSummary]
    total: int


class NodeMetrics(Contract):
    in_degree: int
    out_degree: int
    in_kzt: float
    out_kzt: float
    in_tx: int
    out_tx: int
    pagerank: float
    betweenness: float
    pass_through: float | None
    seed_reach: int
    neighbor_clusters: int
    matched_2d_ratio: float
    active_days: int
    visible_volume: float


class Reason(Contract):
    label: str
    value: str | int | float
    detail: str


class ScoreFactor(Contract):
    label: str
    value: float
    weight: float
    contribution: float


class Observability(Contract):
    label: str
    level: Literal["boundary", "isolated", "seed_limited", "partial"]
    notes: list[str]


class TimelineDay(Contract):
    date: Day
    in_kzt: float
    out_kzt: float
    # The engine's daily aggregates deliberately use the same numeric renderer.
    in_tx: float
    out_tx: float


class Counterparty(Contract):
    gid: AccountId
    role: Role
    sum_kzt: float
    n_tx: int


class Counterparties(Contract):
    incoming: list[Counterparty]
    outgoing: list[Counterparty]


class NodeResponse(NodeSummary):
    metrics: NodeMetrics
    role_scores: dict[Role, float]
    reasons: list[Reason]
    score_factors: list[ScoreFactor]
    limitations: list[str]
    observability: Observability
    timeline: list[TimelineDay]
    counterparties: Counterparties


class GraphNode(NodeSummary):
    id: AccountId
    label: AccountId
    is_root: bool


class GraphEdge(Contract):
    id: str
    source: AccountId
    target: AccountId
    src: AccountId
    dst: AccountId
    sum_kzt: float
    n_tx: int
    depth: int


class GraphResponse(Contract):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    truncated: bool
    root_gid: AccountId | None


class Cluster(Contract):
    cluster_id: int
    n_nodes: int
    n_seed: int
    sum_kzt_internal: float
    top_gids: list[AccountId]
    hypothesis: str
    roles: dict[Role, int]


class ClustersResponse(Contract):
    items: list[Cluster]


class Spike(Contract):
    date: Day
    total_kzt: float
    baseline_median_kzt: float
    ratio: float


class SynchronizedInflow(Contract):
    date: Day
    payers: list[AccountId]
    payer_count: int
    sum_kzt: float


class TemporalSignals(Contract):
    overlap_2d_ratio: float
    spikes: list[Spike]
    synchronized_inflows: list[SynchronizedInflow]
    caveat: str


class RouteOccurrence(Contract):
    in_date: Day
    out_date: Day
    in_kzt: float
    out_kzt: float
    lag_days: int


class RecurringRoute(Contract):
    path: list[AccountId]
    occurrences: list[RouteOccurrence]
    occurrence_count: int
    distinct_start_dates: int


class CycleEdge(Contract):
    src: AccountId
    dst: AccountId
    sum_kzt: float
    dates: list[Day]


class ChronologicalEdge(Contract):
    src: AccountId
    dst: AccountId
    date: Day
    sum_kzt: float


class Cycle(Contract):
    path: list[AccountId]
    edges: list[CycleEdge]
    chronological_example: list[ChronologicalEdge] | None
    kind: Literal["date_consistent_cycle", "structural_cycle"]


class DepthPeerMetrics(Contract):
    value: float
    peer_median: float
    comparison_baseline: float
    percentile: float
    peer_count: int
    depth: int


class RepeatedAmountMetrics(Contract):
    direction: Literal["incoming", "outgoing"]
    date: Day
    amount_kzt: float
    transaction_count: int
    counterparty_count: int
    counterparties: list[AccountId]
    sum_kzt: float


class Anomaly(Contract):
    id: str
    title: str
    evidence: str
    metrics: DepthPeerMetrics | RepeatedAmountMetrics


class SignalLimits(Contract):
    route_center_gid: AccountId
    max_route_pairs: int
    max_routes: int
    max_occurrences_per_route: int
    routes_truncated: bool
    max_cycle_length: int
    max_cycles: int
    max_cycle_steps: int
    cycles_truncated: bool


class SignalsResponse(Contract):
    gid: AccountId
    temporal: TemporalSignals
    routes: list[RecurringRoute]
    cycles: list[Cycle]
    anomalies: list[Anomaly]
    limits: SignalLimits
    caveats: list[str]


class ResilienceMetrics(Contract):
    nodes: int
    edges: int
    weak_components: int
    largest_component_nodes: int
    reachable_seed_pairs: int


class ResilienceChange(Contract):
    weak_components: int
    largest_component_nodes: int
    reachable_seed_pairs: int


class ResilienceResponse(Contract):
    top_n: int
    removed_gids: list[AccountId]
    baseline: ResilienceMetrics
    after: ResilienceMetrics
    change: ResilienceChange
    caveat: str


class CollectorPath(Contract):
    source_gid: AccountId
    path: list[AccountId]
    hops: int


class Collector(Contract):
    gid: AccountId
    role: Role
    priority_score: float
    paths: list[CollectorPath]
    matched_sources: int


class CollectorsResponse(Contract):
    gids: list[AccountId]
    max_hops: int
    items: list[Collector]
    total: int
    truncated: bool
    caveat: str


class EvidenceRequest(Contract):
    priority: int
    request: str
    reason: str


class DossierResponse(Contract):
    gid: AccountId
    title: str
    role: Role
    priority_score: float
    evidence: list[str]
    hypotheses: list[str]
    missing_evidence: list[str]
    next_requests: list[EvidenceRequest]
    citations: list[str]


class ExportReceipt(Contract):
    name: Literal["nodes_roles.csv", "clusters.csv", "top_nodes.csv"]
    sha256: str
    bytes: int
    rows: int


class TableHashes(Contract):
    nodes: str
    edges: str
    transactions: str


class ProvenanceResponse(Contract):
    schema_version: int
    dataset_kind: DatasetKind
    dataset_sha256: str
    canonical_table_sha256: TableHashes
    algorithm_sha256: str
    source_sha256: dict[str, str]
    runtime_versions: dict[str, str]
    evidence_version: str
    exports: list[ExportReceipt]
    interpretation: str


class CopilotCapabilities(Contract):
    conversation_history: bool
    history_max_turns: int
    history_max_characters: int
    user_message_max_characters: int
    assistant_message_max_characters: int
    read_only_tools: int
    session_memory: bool
    memory_ttl_seconds: int
    memory_max_sessions: int
    attachments: bool
    streaming: bool


class CopilotStatusResponse(Contract):
    enabled: bool
    mode: Literal["openai", "offline"]
    provider_status: Literal["not_checked"]
    message: str
    capabilities: CopilotCapabilities


class SessionResponse(Contract):
    session_id: str
    turns: int
    expires_in_seconds: int
    persistence: Literal["process", "sqlite"]


class Citation(Contract):
    label: str
    gid: AccountId
    text: str
    kind: str | None = None
    evidence_version: str | None = None
    payload_sha256: str | None = None
    # Source snapshots preserve heterogeneous bounded tool projections exactly;
    # they are already validated by the fixed evidence-tool authorization layer.
    source: dict[str, JsonValue] | None = None
    source_json: str | None = None


class ToolTrace(Contract):
    tool: str
    status: Literal["complete", "cached"]
    elapsed_ms: int | None = None


class Execution(Contract):
    run_id: str
    status: Literal["completed", "offline", "fallback"]
    model_rounds: int
    tool_calls: int
    input_tokens: int
    output_tokens: int
    elapsed_ms: int
    evidence_version: str | None
    fallback_code: str | None = None


class CheckedObservation(Contract):
    evidence_id: str
    path: str
    label: str
    value: str
    unit: str | None = None


class Grounding(Contract):
    typed_observations_checked: int
    numeric_literals_checked: int
    prose_entailment: Literal["not_checked"]
    note: str


class LocalWorkflow(Contract):
    action: Literal["priority", "patterns", "collectors", "resilience", "missing_evidence", "challenge", "brief", "summary"]
    action_label: str
    recognized: bool


class CopilotResponse(Contract):
    answer: str
    mode: Literal["offline", "openai", "fallback"]
    citations: list[Citation]
    limitations: list[str]
    trace: list[ToolTrace]
    execution: Execution
    model: str | None = None
    memory: SessionResponse | None = None
    observations: list[CheckedObservation] | None = None
    grounding: Grounding | None = None
    local_workflow: LocalWorkflow | None = None


# Shared documentation for sanitized application errors, including middleware.
ERROR_RESPONSES = {status: {"model": ErrorResponse} for status in (400, 403, 404, 408, 409, 413, 415, 422, 429, 500, 503)}

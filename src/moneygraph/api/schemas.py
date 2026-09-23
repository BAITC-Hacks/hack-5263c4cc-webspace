"""Version 1 wire contract. Account identifiers never pass through a JS number."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from ..copilot.schemas import ConversationTurn, CopilotRequest

Gid = Annotated[str, Field(pattern=r"^(0|[1-9][0-9]{0,18})$")]
Role = Literal["consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral", "boundary_unknown"]


class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class AnalysisMetadata(DTO):
    analysis_id: str


class NodeSummary(DTO):
    gid: Gid
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


class Dataset(DTO):
    name: str
    kind: Literal["synthetic", "official"]
    description: str


class Counts(DTO):
    nodes: int
    edges: int
    transactions: int
    seeds: int
    clusters: int
    components: int
    boundary_nodes: int
    isolated_nodes: int


class Period(DTO):
    start: str | None
    end: str | None


class Summary(AnalysisMetadata):
    dataset: Dataset
    counts: Counts
    period: Period
    total_kzt: float
    runtime_ms: float
    role_counts: dict[Role, int]
    limitations: list[str]
    top_nodes: list[NodeSummary]


class Health(AnalysisMetadata):
    status: Literal["ok"]
    dataset_kind: Literal["synthetic", "official"]


class NodeList(AnalysisMetadata):
    items: list[NodeSummary]
    total: int


class Metrics(DTO):
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


class Reason(DTO):
    label: str
    value: str | int | float
    detail: str


class ScoreFactor(DTO):
    label: str
    value: float
    weight: float
    contribution: float


class Observability(DTO):
    label: str
    level: Literal["boundary", "isolated", "seed_limited", "partial"]
    notes: list[str]


class TimelineDay(DTO):
    date: str
    in_kzt: float
    out_kzt: float
    in_tx: int
    out_tx: int


class Counterparty(DTO):
    gid: Gid
    role: Role
    sum_kzt: float
    n_tx: int


class Counterparties(DTO):
    incoming: list[Counterparty]
    outgoing: list[Counterparty]


class NodeDetail(NodeSummary, AnalysisMetadata):
    metrics: Metrics
    role_scores: dict[Role, float]
    reasons: list[Reason]
    score_factors: list[ScoreFactor]
    limitations: list[str]
    observability: Observability
    timeline: list[TimelineDay]
    counterparties: Counterparties


class GraphNode(NodeSummary):
    id: Gid
    label: str
    is_root: bool


class GraphEdge(DTO):
    id: str
    source: Gid
    target: Gid
    src: Gid
    dst: Gid
    sum_kzt: float
    n_tx: int
    depth: int


class GraphData(AnalysisMetadata):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    root_gid: Gid | None
    truncated: bool
    total_nodes: int
    total_edges: int
    returned_nodes: int
    returned_edges: int
    truncation_reasons: list[str]


class Cluster(DTO):
    cluster_id: int
    n_nodes: int
    n_seed: int
    sum_kzt_internal: float
    top_gids: list[Gid]
    hypothesis: str
    roles: dict[Role, int]


class ClusterList(AnalysisMetadata):
    items: list[Cluster]


class Spike(DTO):
    date: str
    total_kzt: float
    baseline_median_kzt: float
    ratio: float


class SynchronizedInflow(DTO):
    date: str
    payers: list[Gid]
    payer_count: int
    sum_kzt: float


class TemporalSignals(DTO):
    overlap_2d_ratio: float
    spikes: list[Spike]
    synchronized_inflows: list[SynchronizedInflow]
    caveat: str


class Occurrence(DTO):
    in_date: str
    out_date: str
    in_kzt: float
    out_kzt: float
    lag_days: int


class Route(DTO):
    path: list[Gid]
    occurrences: list[Occurrence]
    occurrence_count: int
    distinct_start_dates: int


class CycleEdge(DTO):
    src: Gid
    dst: Gid
    sum_kzt: float
    dates: list[str]


class DatedEdge(DTO):
    src: Gid
    dst: Gid
    date: str
    sum_kzt: float


class Cycle(DTO):
    path: list[Gid]
    edges: list[CycleEdge]
    chronological_example: list[DatedEdge] | None
    kind: Literal["date_consistent_cycle", "structural_cycle"]


class PeerMetrics(DTO):
    value: float
    peer_median: float
    comparison_baseline: float
    percentile: float
    peer_count: int
    depth: int


class PaymentMetrics(DTO):
    direction: Literal["incoming", "outgoing"]
    date: str
    amount_kzt: float
    transaction_count: int
    counterparty_count: int
    counterparties: list[Gid]
    sum_kzt: float


class Anomaly(DTO):
    id: str
    title: str
    evidence: str
    metrics: PeerMetrics | PaymentMetrics


class SignalLimits(DTO):
    route_center_gid: Gid
    max_route_pairs: int
    max_routes: int
    max_occurrences_per_route: int
    routes_truncated: bool
    max_cycle_length: int
    max_cycles: int
    max_cycle_steps: int
    cycles_truncated: bool


class SignalReport(AnalysisMetadata):
    gid: Gid
    temporal: TemporalSignals
    routes: list[Route]
    cycles: list[Cycle]
    anomalies: list[Anomaly]
    limits: SignalLimits
    caveats: list[str]


class ResilienceMetrics(DTO):
    nodes: int
    edges: int
    weak_components: int
    largest_component_nodes: int
    reachable_seed_pairs: int


class ResilienceChange(DTO):
    weak_components: int
    largest_component_nodes: int
    reachable_seed_pairs: int


class ResilienceReport(AnalysisMetadata):
    top_n: int
    removed_gids: list[Gid]
    baseline: ResilienceMetrics
    after: ResilienceMetrics
    change: ResilienceChange
    caveat: str


class CollectorPath(DTO):
    source_gid: Gid
    path: list[Gid]
    hops: int


class Collector(DTO):
    gid: Gid
    role: Role
    priority_score: float
    paths: list[CollectorPath]
    matched_sources: int


class CollectorReport(AnalysisMetadata):
    gids: list[Gid]
    max_hops: int
    items: list[Collector]
    total: int
    truncated: bool
    caveat: str


class EvidenceRequest(DTO):
    priority: int
    request: str
    reason: str


class Dossier(AnalysisMetadata):
    gid: Gid
    title: str
    role: Role
    priority_score: float
    evidence: list[str]
    hypotheses: list[str]
    missing_evidence: list[str]
    next_requests: list[EvidenceRequest]
    citations: list[str]


class Citation(DTO):
    label: str
    gid: Gid
    text: str
    kind: str | None = None
    evidence_version: str | None = None
    payload_sha256: str | None = None


class TraceStep(DTO):
    tool: str
    status: Literal["complete", "cached"]
    elapsed_ms: int | None = None


class ConversationMemory(DTO):
    session_id: str
    turns: int
    expires_in_seconds: int
    persistence: Literal["process", "sqlite"]


class SessionResponse(ConversationMemory, AnalysisMetadata):
    pass


class Execution(DTO):
    run_id: str
    status: Literal["completed", "offline", "fallback"]
    model_rounds: int
    tool_calls: int
    input_tokens: int
    output_tokens: int
    elapsed_ms: int
    fallback_code: str | None = None
    evidence_version: str | None = None


class CopilotCapabilities(DTO):
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


class CopilotStatus(AnalysisMetadata):
    enabled: bool
    mode: Literal["openai", "offline"]
    provider_status: Literal["not_checked"]
    message: str
    capabilities: CopilotCapabilities


class CopilotResponse(AnalysisMetadata):
    answer: str
    mode: Literal["offline", "openai", "fallback"]
    citations: list[Citation]
    limitations: list[str]
    trace: list[TraceStep]
    model: str | None = None
    memory: ConversationMemory | None = None
    execution: Execution


class SessionInput(DTO):
    gid: Gid
    gids: list[Gid] | None = Field(default=None, min_length=1, max_length=5)

    @field_validator("gid")
    @classmethod
    def bounded_gid(cls, gid: str) -> str:
        if int(gid) > 2**63 - 1:
            raise ValueError("Account identifier exceeds int64")
        return gid

    @field_validator("gids")
    @classmethod
    def valid_cohort(cls, gids):
        if gids is not None and (len(set(gids)) != len(gids) or any(int(gid) > 2**63 - 1 for gid in gids)):
            raise ValueError("Select distinct int64 account identifiers")
        return gids


class CopilotInput(SessionInput):
    question: str = Field(min_length=1, max_length=1200, strict=True)
    history: list[ConversationTurn] = Field(default_factory=list, max_length=6)
    remember: bool = Field(default=False, strict=True)
    session_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")

    @model_validator(mode="after")
    def bounded_history(self):
        CopilotRequest.model_validate({**self.model_dump(), "gid": int(self.gid),
                                      "gids": [int(gid) for gid in self.gids] if self.gids else None})
        return self


class ErrorDetail(DTO):
    code: str
    message: str
    request_id: str


class ErrorResponse(DTO):
    error: ErrorDetail


class ExportReceipt(DTO):
    name: str
    sha256: str
    bytes: int
    rows: int


class ManifestFile(DTO):
    path: str
    sha256: str


class SourceManifest(DTO):
    version: int
    normalization: str
    files: list[ManifestFile]
    sha256: str


class CanonicalTables(DTO):
    nodes: str
    edges: str
    transactions: str


class Provenance(AnalysisMetadata):
    schema_version: Literal[2]
    dataset_kind: Literal["synthetic", "official"]
    dataset_sha256: str
    canonical_table_sha256: CanonicalTables
    algorithm_sha256: str
    exports: list[ExportReceipt]
    interpretation: str
    rules_version: str
    configuration_sha256: str
    dependency_lock_sha256: str
    source_manifest: SourceManifest

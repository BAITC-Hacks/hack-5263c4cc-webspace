export type Role =
  | "consolidator"
  | "transit"
  | "distributor"
  | "terminal"
  | "coordinator"
  | "peripheral"
  | "boundary_unknown"
  | string;
export interface NodeSummary {
  gid: number;
  role: Role;
  role_score: number;
  priority_score: number;
  cluster_id: number;
  evidence: string;
  depth: number;
  is_seed: boolean;
  truncated_by_depth: boolean;
  in_degree: number;
  out_degree: number;
  in_kzt: number;
  out_kzt: number;
  rank: number;
}
export interface Summary {
  dataset: {
    name: string;
    kind: "synthetic" | "official";
    description: string;
  };
  counts: {
    nodes: number;
    edges: number;
    transactions: number;
    seeds: number;
    clusters: number;
    components: number;
    boundary_nodes: number;
    isolated_nodes: number;
  };
  period: { start: string; end: string };
  total_kzt: number;
  runtime_ms: number;
  role_counts: Record<string, number>;
  limitations: string[];
  top_nodes: NodeSummary[];
}
export interface Counterparty {
  gid: number;
  role: Role;
  sum_kzt: number;
  n_tx: number;
}
export interface TimelineDay {
  date: string;
  in_kzt: number;
  out_kzt: number;
  in_tx: number;
  out_tx: number;
}
export interface NodeDetail extends NodeSummary {
  metrics: {
    in_degree: number;
    out_degree: number;
    in_kzt: number;
    out_kzt: number;
    in_tx: number;
    out_tx: number;
    pagerank: number;
    betweenness: number;
    pass_through: number;
    seed_reach: number;
    neighbor_clusters: number;
    matched_2d_ratio: number;
    active_days: number;
  };
  role_scores: Record<string, number>;
  reasons: { label: string; value: string | number; detail: string }[];
  score_factors: {
    label: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
  limitations: string[];
  observability: { label: string; level: string; notes: string[] };
  timeline: TimelineDay[];
  counterparties: { incoming: Counterparty[]; outgoing: Counterparty[] };
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  src: number;
  dst: number;
  sum_kzt: number;
  n_tx: number;
  depth: number;
}
export interface GraphData {
  nodes: (NodeSummary & { id: string; label: string; is_root: boolean })[];
  edges: GraphEdge[];
  truncated: boolean;
  root_gid: number | null;
}
export interface Cluster {
  cluster_id: number;
  n_nodes: number;
  n_seed: number;
  sum_kzt_internal: number;
  top_gids: number[];
  hypothesis: string;
  roles: Record<string, number>;
}
export interface CopilotResponse {
  answer: string;
  mode: "offline" | "openai" | "fallback";
  citations: {
    label?: string;
    gid?: number;
    text?: string;
    kind?: string;
    evidence_version?: string;
    payload_sha256?: string;
  }[];
  limitations: string[];
  trace: { tool: string; status: string; elapsed_ms?: number }[];
  model?: string;
  memory?: {
    session_id: string;
    turns: number;
    expires_in_seconds: number;
    persistence: "process" | "sqlite";
  };
  execution?: {
    run_id: string;
    status: "completed" | "offline" | "fallback";
    model_rounds: number;
    tool_calls: number;
    input_tokens: number;
    output_tokens: number;
    elapsed_ms: number;
    fallback_code?: string;
    evidence_version?: string;
  };
}

/** Safe message metadata: session IDs are private capabilities, never transcript data. */
export type CopilotReply = Omit<CopilotResponse, "memory"> & {
  memory?: Omit<NonNullable<CopilotResponse["memory"]>, "session_id">;
};

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const retryAfter = response.headers.get("Retry-After");
    const retryDelay =
      retryAfter === null
        ? NaN
        : /^\d+$/.test(retryAfter.trim())
          ? Number(retryAfter)
          : (Date.parse(retryAfter) - Date.now()) / 1000;
    const retryAfterSeconds = Number.isFinite(retryDelay)
      ? Math.max(1, Math.ceil(retryDelay))
      : null;
    const message =
      response.status === 429
        ? `Too many requests. ${retryAfterSeconds === null ? "Wait a moment" : `Wait ${retryAfterSeconds} seconds`} before trying again.`
        : typeof detail === "string"
          ? detail
          : `Request failed (${response.status}). Try again.`;
    throw new ApiError(message, response.status, retryAfterSeconds);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const roleColors: Record<string, string> = {
  consolidator: "#098830",
  transit: "#567b94",
  distributor: "#a37f32",
  terminal: "#7c7192",
  coordinator: "#26342b",
  peripheral: "#97a394",
  boundary_unknown: "#67875c",
};
export const roleLabel = (role: string) =>
  role === "boundary_unknown"
    ? "Boundary unknown"
    : role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ");
export const roleColor = (role: string) => roleColors[role] ?? "#94a3b8";
export const number = (value: number | undefined) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);
export const compact = (value: number | undefined) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
export const money = (value: number | undefined) => `${compact(value)} ₸`;
export const exactMoney = (value: number | undefined) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0)} KZT`;
export const score = (value: number | undefined) =>
  Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
export const dateLabel = (date: string, year = false) =>
  new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
  });

export interface SignalReport {
  gid: number;
  temporal: {
    overlap_2d_ratio: number;
    spikes: {
      date: string;
      total_kzt: number;
      baseline_median_kzt: number;
      ratio: number;
    }[];
    synchronized_inflows: {
      date: string;
      payers: number[];
      payer_count: number;
      sum_kzt: number;
    }[];
    caveat: string;
  };
  routes: {
    path: number[];
    occurrences: {
      in_date: string;
      out_date: string;
      in_kzt: number;
      out_kzt: number;
      lag_days: number;
    }[];
    occurrence_count: number;
    distinct_start_dates: number;
  }[];
  cycles: {
    path: number[];
    edges: { src: number; dst: number; sum_kzt: number; dates: string[] }[];
    chronological_example:
      { src: number; dst: number; date: string; sum_kzt: number }[] | null;
    kind: string;
  }[];
  anomalies: {
    id: string;
    title: string;
    evidence: string;
    metrics: Record<string, unknown>;
  }[];
  limits: Record<string, unknown>;
  caveats: string[];
}
export interface ResilienceReport {
  top_n: number;
  removed_gids: number[];
  baseline: ResilienceMetrics;
  after: ResilienceMetrics;
  change: Partial<ResilienceMetrics>;
  caveat: string;
}
export interface ResilienceMetrics {
  nodes: number;
  edges: number;
  weak_components: number;
  largest_component_nodes: number;
  reachable_seed_pairs: number;
}
export interface CollectorReport {
  gids: number[];
  max_hops: number;
  items: {
    gid: number;
    role: string;
    priority_score: number;
    paths: { source_gid: number; path: number[]; hops: number }[];
    matched_sources: number;
  }[];
  total?: number;
  truncated?: boolean;
  caveat: string;
}
export interface Dossier {
  gid: number;
  title: string;
  role: string;
  priority_score: number;
  evidence: string[];
  hypotheses: string[];
  missing_evidence: string[];
  next_requests: { priority: number; request: string; reason: string }[];
  citations: string[];
}

// Shared categorical identity across overview and investigation views.
export const communityColors = [
  "#098830",
  "#3c6d4e",
  "#638a52",
  "#667787",
  "#7c7490",
  "#a2784f",
  "#6c8a86",
  "#505b54",
];
export const communityColor = (id: number) =>
  communityColors[Math.abs(id) % communityColors.length];

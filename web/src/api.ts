import type { components } from "./generated/api";

export type Gid = string;

export function isGid(value: unknown): value is Gid {
  return typeof value === "string" && /^(0|[1-9]\d{0,18})$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

export const compareGids = (a: Gid, b: Gid) => a.length - b.length || a.localeCompare(b);

export type Role = NodeSummary["role"];
export type NodeSummary = components["schemas"]["NodeSummary"];
export type SummaryActivity = components["schemas"]["SummaryActivity"];
export type Summary = components["schemas"]["SummaryResponse"];
export type Counterparty = components["schemas"]["Counterparty"];
export type TimelineDay = components["schemas"]["TimelineDay"];
export type NodeDetail = components["schemas"]["NodeResponse"];
export type GraphEdge = components["schemas"]["GraphEdge"];
export type GraphData = components["schemas"]["GraphResponse"];
export type Cluster = components["schemas"]["Cluster"];
export type CopilotResponse = components["schemas"]["CopilotResponse"];

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

export { roleColors, roleColor, communityColors, communityColor } from "./lib/visualization";

export const roleLabel = (role: string) =>
  role === "boundary_unknown"
    ? "Boundary unknown"
    : role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ");
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
export const dateLabel = (date: string | null | undefined, year = false) =>
  date
    ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        ...(year ? { year: "numeric" } : {}),
      })
    : "—";

export type SignalReport = components["schemas"]["SignalsResponse"];
export type ResilienceReport = components["schemas"]["ResilienceResponse"];
export type ResilienceMetrics = components["schemas"]["ResilienceMetrics"];
export type CollectorReport = components["schemas"]["CollectorsResponse"];
export type Dossier = components["schemas"]["DossierResponse"];

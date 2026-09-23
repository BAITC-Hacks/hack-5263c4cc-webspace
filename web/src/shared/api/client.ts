import type {paths} from './schema';
import type {CopilotInput, CopilotResponse, Gid, NodeFilters, SessionInput, SessionResponse, CopilotStatus} from './types.ts';

type GetPath = '/api/v1/summary' | '/api/v1/nodes' | '/api/v1/nodes/{gid}' | '/api/v1/graph' | '/api/v1/clusters' | '/api/v1/signals/{gid}' | '/api/v1/collectors' | '/api/v1/resilience' | '/api/v1/dossier/{gid}' | '/api/v1/provenance';
type GetResponse<P extends GetPath> = paths[P]['get'] extends { responses: { 200: { content: { 'application/json': infer Result } } } } ? Result : never;

export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = body.error;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  }
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = body.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') return detail.message;
  }
  return `Request failed (${status}). Try again.`;
}

async function request(url: string, options: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (response.status === 204 && options.method === 'DELETE') return undefined;
  const body: unknown = await response.json().catch(() => null);
  options.signal?.throwIfAborted();
  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter === null ? NaN : /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter) : (Date.parse(retryAfter) - Date.now()) / 1000;
    const retry = Number.isFinite(delay) ? Math.max(1, Math.ceil(delay)) : null;
    const message = response.status === 429
      ? `Too many requests. ${retry === null ? 'Wait a moment' : `Wait ${retry} seconds`} before trying again.`
      : errorMessage(body, response.status);
    throw new ApiError(message, response.status, retry);
  }
  if (!body || typeof body !== 'object' || !('analysis_id' in body) || typeof body.analysis_id !== 'string' || !body.analysis_id) {
    throw new Error('The server returned evidence without an analysis version. Refresh and try again.');
  }
  return body;
}

// Only these endpoint-bound methods are public. Response types come from OpenAPI;
// a caller cannot supply an arbitrary result type to a generic fetch function.
async function get<P extends GetPath>(path: P, signal?: AbortSignal, url: string = path): Promise<GetResponse<P>> {
  return await request(url, { signal }) as GetResponse<P>;
}

function parameters(values: Record<string, string | number | null | undefined>) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') result.set(key, String(value));
  }
  return result.toString();
}

export const api = {
  async copilotStatus(signal?: AbortSignal): Promise<CopilotStatus> {
    return await request('/api/v1/copilot/status', {signal}) as CopilotStatus;
  },
  async createSession(input: SessionInput, signal?: AbortSignal): Promise<SessionResponse> {
    return await request('/api/v1/copilot/sessions', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input), signal}) as SessionResponse;
  },
  async forgetSession(sessionId: string, signal?: AbortSignal): Promise<void> {
    await request(`/api/v1/copilot/sessions/${encodeURIComponent(sessionId)}`, {method: 'DELETE', signal});
  },
  summary: (signal?: AbortSignal) => get('/api/v1/summary', signal),
  nodes: (filters: NodeFilters, signal?: AbortSignal) => get('/api/v1/nodes', signal, `/api/v1/nodes?${parameters(filters)}`),
  node: (gid: Gid, signal?: AbortSignal) => get('/api/v1/nodes/{gid}', signal, `/api/v1/nodes/${encodeURIComponent(gid)}`),
  graph: (gid: Gid, hops: number, signal?: AbortSignal) => get('/api/v1/graph', signal, `/api/v1/graph?${parameters({ gid, hops, limit: 180 })}`),
  clusters: (signal?: AbortSignal) => get('/api/v1/clusters', signal),
  signals: (gid: Gid, signal?: AbortSignal) => get('/api/v1/signals/{gid}', signal, `/api/v1/signals/${encodeURIComponent(gid)}`),
  collectors: (gids: Gid[], signal?: AbortSignal) => get('/api/v1/collectors', signal, `/api/v1/collectors?${parameters({ gids: gids.join(','), max_hops: 3 })}`),
  resilience: (topN: number, signal?: AbortSignal) => get('/api/v1/resilience', signal, `/api/v1/resilience?${parameters({ top_n: topN })}`),
  dossier: (gid: Gid, signal?: AbortSignal) => get('/api/v1/dossier/{gid}', signal, `/api/v1/dossier/${encodeURIComponent(gid)}`),
  provenance: (signal?: AbortSignal) => get('/api/v1/provenance', signal),
  async copilot(input: CopilotInput, signal?: AbortSignal): Promise<CopilotResponse> {
    return await request('/api/v1/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal }) as CopilotResponse;
  },
};

export const downloads = {
  csv: (name: 'nodes_roles.csv' | 'clusters.csv' | 'top_nodes.csv') => `/api/v1/exports/${name}`,
  provenance: '/api/v1/provenance',
  dossier: (gid: Gid, format: 'json' | 'markdown' = 'json') => `/api/v1/dossier/${encodeURIComponent(gid)}?format=${format}`,
};

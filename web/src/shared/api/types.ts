import type {components, operations} from './schema';

export type Gid = components['schemas']['NodeSummary']['gid'];
export type Role = components['schemas']['NodeSummary']['role'];
export type Summary = components['schemas']['Summary'];
export type NodeSummary = components['schemas']['NodeSummary'];
export type NodeDetail = components['schemas']['NodeDetail'];
export type NodeList = components['schemas']['NodeList'];
export type Counterparty = components['schemas']['Counterparty'];
export type TimelineDay = components['schemas']['TimelineDay'];
export type Period = components['schemas']['Period'];
export type GraphData = components['schemas']['GraphData'];
export type GraphEdge = components['schemas']['GraphEdge'];
export type Cluster = components['schemas']['Cluster'];
export type SignalReport = components['schemas']['SignalReport'];
export type CollectorReport = components['schemas']['CollectorReport'];
export type ResilienceReport = components['schemas']['ResilienceReport'];
export type ResilienceMetrics = components['schemas']['ResilienceMetrics'];
export type Dossier = components['schemas']['Dossier'];
export type CopilotInput = components['schemas']['CopilotInput'];
export type CopilotResponse = components['schemas']['CopilotResponse'];
export type NodeFilters = NonNullable<operations['nodes_api_v1_nodes_get']['parameters']['query']>;

/** Account IDs are opaque decimal strings, including values above 2^53. */
export function isGid(value: unknown): value is Gid {
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value)
    && (value.length < 19 || value <= '9223372036854775807');
}

export type CopilotReply = Omit<CopilotResponse, 'memory'> & {
  memory?: Omit<NonNullable<CopilotResponse['memory']>, 'session_id'>;
};
export type SessionInput = components['schemas']['SessionInput'];
export type SessionResponse = components['schemas']['SessionResponse'];
export type CopilotStatus = components['schemas']['CopilotStatus'];
export function compareGids(a: Gid, b: Gid): number {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

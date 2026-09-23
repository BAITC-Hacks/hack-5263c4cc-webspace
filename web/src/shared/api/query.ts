import {MutationCache, QueryCache, QueryClient} from '@tanstack/react-query';
import {ApiError} from './client.ts';
import type {Gid, NodeFilters} from './types.ts';

export const queryKeys = {
  summary: ['summary'] as const,
  analysis: (id: string) => ['analysis', id] as const,
  nodes: (id: string, filters: NodeFilters) => ['analysis', id, 'nodes', filters] as const,
  node: (id: string, gid: Gid | null) => ['analysis', id, 'node', gid] as const,
  graph: (id: string, gid: Gid | null, hops: number) => ['analysis', id, 'graph', gid, hops] as const,
  clusters: (id: string) => ['analysis', id, 'clusters'] as const,
  signals: (id: string, gid: Gid | null) => ['analysis', id, 'signals', gid] as const,
  dossier: (id: string, gid: Gid | null) => ['analysis', id, 'dossier', gid] as const,
  collectors: (id: string, gids: Gid[]) => ['analysis', id, 'collectors', [...gids].sort(), 3] as const,
  resilience: (id: string, topN: number) => ['analysis', id, 'resilience', topN] as const,
  copilot: (id: string, gid: Gid, gids: Gid[]) => ['analysis', id, 'copilot', gid, [...gids].sort()] as const,
};

export class AnalysisChangedError extends Error {
  constructor() { super('The analysis changed. Loading the current dataset…'); this.name = 'AnalysisChangedError'; }
}

export async function forAnalysis<T extends { analysis_id: string }>(id: string, request: Promise<T>): Promise<T> {
  const result = await request;
  if (result.analysis_id !== id) throw new AnalysisChangedError();
  return result;
}

export function createAppQueryClient() {
  const onError = (error: Error) => {
    if (error instanceof AnalysisChangedError) void client.invalidateQueries({ queryKey: queryKeys.summary });
  };
  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => count < 1 && !(error instanceof AnalysisChangedError) && !(error instanceof ApiError && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
  return client;
}

/** Keep summary/current data; retire every query from a previous dataset. */
export async function resetAnalysisQueries(client: QueryClient, currentId: string) {
  const predicate = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === 'analysis' && query.queryKey[1] !== currentId;
  await client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
  for (const mutation of client.getMutationCache().getAll()) {
    const key = mutation.options.mutationKey;
    if (key?.[0] === 'analysis' && key[1] !== currentId) client.getMutationCache().remove(mutation);
  }
}

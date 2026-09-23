import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';
import type {Gid} from '../../shared/api/types';

export function useSignals(analysisId: string, gid: Gid | null) {
  return useQuery({ queryKey: queryKeys.signals(analysisId, gid), queryFn: ({ signal }) => forAnalysis(analysisId, api.signals(gid!, signal)), enabled: gid !== null });
}

export function useCollectors(analysisId: string, gids: Gid[]) {
  return useQuery({ queryKey: queryKeys.collectors(analysisId, gids), queryFn: ({ signal }) => forAnalysis(analysisId, api.collectors(gids, signal)), enabled: gids.length > 0 });
}

export function useValidateCohort(analysisId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['analysis', analysisId, 'validate-cohort'], retry: false,
    mutationFn: async ({ gids, signal }: { gids: Gid[]; signal: AbortSignal }) => {
      // This request is owned by the edit action, so aborting it cannot cancel a
      // detail request observed by the evidence panel.
      const nodes = await Promise.all(gids.map(gid => forAnalysis(analysisId, api.node(gid, signal))));
      signal.throwIfAborted();
      nodes.forEach(node => client.setQueryData(queryKeys.node(analysisId, node.gid), node));
      return gids;
    },
  });
}

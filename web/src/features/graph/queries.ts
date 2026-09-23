import {useQuery} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';
import type {Gid} from '../../shared/api/types';

export function useGraph(analysisId: string, gid: Gid | null, hops: number) {
  return useQuery({ queryKey: queryKeys.graph(analysisId, gid, hops), queryFn: ({ signal }) => forAnalysis(analysisId, api.graph(gid!, hops, signal)), enabled: gid !== null });
}

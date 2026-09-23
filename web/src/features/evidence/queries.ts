import {useQuery} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';
import type {Gid} from '../../shared/api/types';

export function useNodeDetail(analysisId: string, gid: Gid | null) {
  return useQuery({ queryKey: queryKeys.node(analysisId, gid), queryFn: ({ signal }) => forAnalysis(analysisId, api.node(gid!, signal)), enabled: gid !== null });
}

export function useDossier(analysisId: string, gid: Gid | null) {
  return useQuery({ queryKey: queryKeys.dossier(analysisId, gid), queryFn: ({ signal }) => forAnalysis(analysisId, api.dossier(gid!, signal)), enabled: gid !== null });
}

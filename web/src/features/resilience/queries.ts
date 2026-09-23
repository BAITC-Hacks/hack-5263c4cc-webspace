import {useQuery} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';

export function useResilience(analysisId: string, topN: number) {
  return useQuery({ queryKey: queryKeys.resilience(analysisId, topN), queryFn: ({ signal }) => forAnalysis(analysisId, api.resilience(topN, signal)) });
}

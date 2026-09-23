import {useQuery} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';

export function useClusters(analysisId: string) {
  return useQuery({ queryKey: queryKeys.clusters(analysisId), queryFn: ({ signal }) => forAnalysis(analysisId, api.clusters(signal)) });
}

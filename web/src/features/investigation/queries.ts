import {useQuery} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';
import type {NodeFilters} from '../../shared/api/types';

export const QUEUE_PAGE_SIZE = 40;

export function useNodes(analysisId: string, filters: NodeFilters) {
  return useQuery({ queryKey: queryKeys.nodes(analysisId, filters), queryFn: ({ signal }) => forAnalysis(analysisId, api.nodes(filters, signal)) });
}

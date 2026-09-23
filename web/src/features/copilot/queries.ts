import {useMutation} from '@tanstack/react-query';
import {api} from '../../shared/api/client';
import {forAnalysis, queryKeys} from '../../shared/api/query';
import type {CopilotInput, Gid} from '../../shared/api/types';

export function useCopilot(analysisId: string, gid: Gid, gids: Gid[]) {
  return useMutation({
    mutationKey: queryKeys.copilot(analysisId, gid, gids),
    mutationFn: ({ input, signal }: { input: CopilotInput; signal: AbortSignal }) => forAnalysis(analysisId, api.copilot(input, signal)),
    retry: false,
  });
}

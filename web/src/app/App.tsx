import {useEffect} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '../shared/api/client';
import {queryKeys, resetAnalysisQueries} from '../shared/api/query';
import {Failure, Pending} from '../components/AsyncState';
import {Workspace} from './Workspace';

export default function App() {
  const client = useQueryClient();
  const summary = useQuery({queryKey: queryKeys.summary, queryFn: ({signal}) => api.summary(signal)});
  const id = summary.data?.analysis_id;
  useEffect(() => {if (id) void resetAnalysisQueries(client, id);}, [client, id]);
  if (!summary.data) return <main className="flex min-h-svh items-center justify-center p-6">{summary.error
    ? <Failure message={summary.error.message} retry={() => {void summary.refetch();}}/>
    : <Pending label="Loading the investigation workspace…"/>}</main>;
  // Remounting binds all selections, forms and conversations to the current snapshot.
  return <Workspace key={summary.data.analysis_id} summary={summary.data} summaryError={summary.error?.message}/>;
}

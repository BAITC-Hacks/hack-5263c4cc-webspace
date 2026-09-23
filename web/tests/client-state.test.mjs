import assert from 'node:assert/strict';
import test from 'node:test';

const largeGid = '9223372036854775807';

test('cohort input retains exact int64 IDs, canonicalizes duplicates, and rejects invalid scope', async () => {
  const { parseCohort } = await import('../src/features/signals/cohort.ts');
  assert.deepEqual(parseCohort(`00042, ${largeGid};42`, ['7']), ['7', '42', largeGid]);
  for (const text of ['1.5', '1e3', '-1', '9223372036854775808', '1 2 3 4 5 6']) {
    assert.throws(() => parseCohort(text, []));
  }
});

test('typed client keeps IDs and AbortSignal unchanged at the HTTP boundary', async (t) => {
  const { api } = await import('../src/shared/api/client.ts');
  const controller = new AbortController();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ analysis_id: 'analysis-a', gid: largeGid });
  });
  const node = await api.node(largeGid, controller.signal);
  assert.equal(node.gid, largeGid);
  assert.equal(calls[0].url, `/api/v1/nodes/${largeGid}`);
  assert.equal(calls[0].options.signal, controller.signal);
  await api.copilot({ gid: largeGid, gids: ['42', largeGid], question: 'Explain evidence.' }, controller.signal);
  assert.deepEqual(JSON.parse(calls[1].options.body), { gid: largeGid, gids: ['42', largeGid], question: 'Explain evidence.' });
});

test('client exposes stable API error messages and rejects unversioned JSON', async (t) => {
  const { api, ApiError } = await import('../src/shared/api/client.ts');
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: 'not_found', message: 'Account not found.', request_id: 'test' } }, { status: 404 }));
  await assert.rejects(api.node('42'), error => error instanceof ApiError && error.status === 404 && error.message === 'Account not found.');
  fetch.mock.mockImplementation(async () => Response.json({ gid: largeGid }));
  await assert.rejects(api.node(largeGid), /analysis version/);
});

test('query keys isolate account selections, queue pages, filters and analyses', async () => {
  const { queryKeys } = await import('../src/shared/api/query.ts');
  assert.notDeepEqual(queryKeys.node('a', '42'), queryKeys.node('a', largeGid));
  assert.notDeepEqual(queryKeys.node('a', '42'), queryKeys.node('b', '42'));
  assert.notDeepEqual(queryKeys.nodes('a', { offset: 0, limit: 40 }), queryKeys.nodes('a', { offset: 40, limit: 40 }));
  assert.notDeepEqual(queryKeys.nodes('a', { role: 'transit' }), queryKeys.nodes('a', { role: 'terminal' }));
  assert.notDeepEqual(queryKeys.graph('a', '42', 1), queryKeys.graph('a', '42', 2));
});

test('cancelling an old selection aborts its request and cannot fill the new account cache', async (t) => {
  const { api } = await import('../src/shared/api/client.ts');
  const { createAppQueryClient, queryKeys, forAnalysis } = await import('../src/shared/api/query.ts');
  const client = createAppQueryClient();
  t.after(() => client.clear());
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/42')) {
      requestSignal = options.signal;
      return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
    }
    return Response.json({ analysis_id: 'a', gid: largeGid });
  });
  const oldKey = queryKeys.node('a', '42');
  const oldRequest = client.fetchQuery({ queryKey: oldKey, queryFn: ({ signal }) => forAnalysis('a', api.node('42', signal)) });
  void oldRequest.catch(() => {});
  await client.cancelQueries({ queryKey: oldKey });
  const newKey = queryKeys.node('a', largeGid);
  await client.fetchQuery({ queryKey: newKey, queryFn: ({ signal }) => forAnalysis('a', api.node(largeGid, signal)) });
  assert.equal(requestSignal.aborted, true);
  assert.equal(client.getQueryData(oldKey), undefined);
  assert.equal(client.getQueryData(newKey).gid, largeGid);
});

test('analysis changes reject mixed evidence, clear old caches and leave the current cache intact', async (t) => {
  const { createAppQueryClient, queryKeys, forAnalysis, resetAnalysisQueries } = await import('../src/shared/api/query.ts');
  const client = createAppQueryClient();
  t.after(() => client.clear());
  await assert.rejects(forAnalysis('old', Promise.resolve({ analysis_id: 'new', gid: largeGid })), /analysis changed/i);
  client.setQueryData(queryKeys.node('old', '42'), { analysis_id: 'old', gid: '42' });
  client.setQueryData(queryKeys.node('new', largeGid), { analysis_id: 'new', gid: largeGid });
  await resetAnalysisQueries(client, 'new');
  assert.equal(client.getQueryData(queryKeys.node('old', '42')), undefined);
  assert.equal(client.getQueryData(queryKeys.node('new', largeGid)).gid, largeGid);
});

test('copilot mutations never retry automatically', async (t) => {
  const { createAppQueryClient } = await import('../src/shared/api/query.ts');
  const client = createAppQueryClient();
  t.after(() => client.clear());
  let attempts = 0;
  const mutation = client.getMutationCache().build(client, { mutationKey: ['copilot'], mutationFn: async () => { attempts += 1; throw new Error('Provider unavailable'); } });
  await assert.rejects(mutation.execute({}), /Provider unavailable/);
  assert.equal(attempts, 1);
});

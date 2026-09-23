const assert = require("node:assert/strict");
const { after, afterEach, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

// Compile the actual browser helpers without adding a second test runtime.
const output = fs.mkdtempSync(path.join(os.tmpdir(), "moneygraph-session-tests-"));
for (const name of ["api", "assistant-session", "lib/visualization", "evidence-packet"]) {
  const source = fs.readFileSync(path.join(__dirname, "../src", `${name}.ts`), "utf8");
  fs.mkdirSync(path.dirname(path.join(output, `${name}.js`)), { recursive: true });
  fs.writeFileSync(path.join(output, `${name}.js`), ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText);
}
const { AssistantSessions, publicCopilotReply } = require(path.join(output, "assistant-session.js"));
const { ApiError, fetchApi, isGid, compareGids } = require(path.join(output, "api.js"));
const { evidencePacket } = require(path.join(output, "evidence-packet.js"));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
after(() => fs.rmSync(output, { recursive: true }));

const scope = { gid: "1211", gids: [] };
test("evidence packets retain exact source IDs and omit private session capabilities", () => {
  const source = { evidence_id: "node:test", data: { gid: "9007199254740993", in_kzt: 100 } };
  const source_json = '{"data": {"gid": "9007199254740993", "in_kzt": 100.0}, "evidence_id": "node:test"}';
  const hash = require("node:crypto").createHash("sha256").update(source_json).digest("hex");
  const packet = evidencePacket({
    answer: "Observed inflow.", mode: "offline", citations: [{ label: "node:test", source, source_json, payload_sha256: hash }],
    limitations: ["Partial observation"], trace: [],
    memory: { session_id: "private-capability", turns: 1, expires_in_seconds: 86400, persistence: "process" },
  }, "2026-09-23T12:00:00Z");
  assert.equal(packet.review_status, "unreviewed");
  assert.deepEqual(packet.citations[0].source, source);
  assert.equal(packet.citations[0].source.data.gid, "9007199254740993");
  assert.equal(packet.created_at, "2026-09-23T12:00:00Z");
  assert.equal(JSON.stringify(packet).includes("private-capability"), false);
  assert.equal(Object.hasOwn(packet, "memory"), false);
  const downloaded = JSON.parse(JSON.stringify(packet));
  assert.equal(downloaded.citations[0].source_json, source_json);
  assert.equal(require("node:crypto").createHash("sha256").update(downloaded.citations[0].source_json).digest("hex"), downloaded.citations[0].payload_sha256);
});
const memory = (id) => ({ session_id: id, turns: 0, expires_in_seconds: 86400, persistence: "process" });
function server() {
  const calls = [];
  let sequence = 0;
  global.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(memory((++sequence).toString(16).padStart(32, "0")), { status: 201 });
  };
  return calls;
}

test("handshake contains scope only; follow-ups reuse the private capability", async () => {
  const calls = server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("thread", undefined, scope);
  assert.deepEqual(JSON.parse(calls[0].body), { gid: scope.gid });
  assert.equal(calls[0].url, "/api/copilot/sessions");
  await sessions.complete(first, memory(first.sessionId), "reply1");
  const next = await sessions.prepare("thread", "reply1", scope);
  assert.equal(next.sessionId, first.sessionId);
  assert.equal(next.fresh, false);
  assert.equal(calls.length, 1);
});

test("int64 account IDs remain exact through validation, sorting and session JSON", async () => {
  const gid = "9007199254740993";
  const adjacent = "9007199254740992";
  assert.equal(isGid(gid), true);
  assert.equal(isGid("9223372036854775807"), true);
  for (const invalid of [Number(gid), "9223372036854775808", "01", "+1", "1.0", "1e3", "-1", " 1", true]) {
    assert.equal(isGid(invalid), false);
  }
  assert.deepEqual([gid, "10", adjacent, "2"].sort(compareGids), ["2", "10", adjacent, gid]);
  const calls = server();
  const sessions = new AssistantSessions();
  await sessions.prepare("large", undefined, { gid, gids: [adjacent] });
  assert.deepEqual(JSON.parse(calls[0].body), { gid, gids: [adjacent] });
});

test("branches and interrupted requests delete old context before starting fresh", async () => {
  const calls = server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("thread", undefined, scope);
  await sessions.complete(first, memory(first.sessionId), "reply1");
  const edited = await sessions.prepare("thread", undefined, scope);
  assert.equal(edited.reset, true);
  assert.notEqual(edited.sessionId, first.sessionId);
  assert.equal(calls[1].method, "DELETE");
  const interrupted = await sessions.prepare("thread", undefined, scope);
  assert.equal(interrupted.reset, true);
  assert.notEqual(interrupted.sessionId, edited.sessionId);
  await assert.rejects(() => sessions.complete(edited, memory(edited.sessionId), "late"), /reset/);
});

test("delete during the empty-session handshake removes its late capability", async () => {
  const calls = [];
  let resolveHandshake;
  global.fetch = (url, options) => {
    calls.push({ url, ...options });
    if (options.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
    return new Promise(resolve => { resolveHandshake = resolve; });
  };
  const sessions = new AssistantSessions();
  const pending = sessions.prepare("thread", undefined, scope);
  await sessions.forget("thread");
  resolveHandshake(Response.json(memory("a".repeat(32)), { status: 201 }));
  await assert.rejects(() => pending, /reset/);
  assert.equal(calls[1].method, "DELETE");
});

test("cancel deletes known context and a late answer cannot restore it", async () => {
  const calls = server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("thread", undefined, scope);
  await sessions.cancel(first);
  assert.equal(calls[1].method, "DELETE");
  await assert.rejects(() => sessions.complete(first, memory(first.sessionId), "late"), /reset/);
  const next = await sessions.prepare("thread", undefined, scope);
  assert.notEqual(next.sessionId, first.sessionId);
});

test("stale scopes stop reuse and independent conversations never share a capability", async () => {
  server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("one", undefined, scope);
  await sessions.complete(first, memory(first.sessionId), "reply1");
  const other = await sessions.prepare("two", undefined, scope);
  assert.notEqual(other.sessionId, first.sessionId);
  sessions.markStale("one");
  await assert.rejects(() => sessions.prepare("one", "reply1", scope), /new conversation/);
  await sessions.forget("one");
  assert.notEqual((await sessions.prepare("one", undefined, scope)).sessionId, first.sessionId);
});

test("failed deletion retains the capability for a later deletion attempt", async () => {
  server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("thread", undefined, scope);
  global.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(() => sessions.forget("thread"), /offline/);
  const calls = server();
  await sessions.forget("thread");
  assert.equal(calls[0].url, `/api/copilot/sessions/${first.sessionId}`);
});

test("mismatched response context is rejected; transcripts omit capability tokens", async () => {
  server();
  const sessions = new AssistantSessions();
  const first = await sessions.prepare("thread", undefined, scope);
  await assert.rejects(() => sessions.complete(first, memory("f".repeat(32)), "reply1"), /mismatched/);
  const reply = publicCopilotReply({ answer: "Synthetic summary", mode: "offline", citations: [], trace: [], limitations: [], memory: memory(first.sessionId) });
  assert.equal(reply.memory.persistence, "process");
  assert.equal(JSON.stringify(reply).includes("session_id"), false);
  assert.equal(JSON.stringify(reply).includes(first.sessionId), false);
});

test("429 exposes Retry-After without retrying; DELETE accepts empty 204", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json({ detail: "Busy" }, { status: 429, headers: { "Retry-After": "17" } });
  };
  await assert.rejects(() => fetchApi("/copilot"), error => error instanceof ApiError && error.status === 429 && error.retryAfterSeconds === 17 && error.message.includes("17 seconds"));
  assert.equal(calls, 1);
  global.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await fetchApi("/copilot/sessions/synthetic", { method: "DELETE" }), undefined);
});

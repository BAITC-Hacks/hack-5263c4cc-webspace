import type { Gid } from "@/api";
import { ApiError, fetchApi } from "./api";
import type { CopilotReply, CopilotResponse } from "./api";

type Session = { sessionId: string; lastReplyId?: string; uncertain: boolean; stale?: boolean };
type Run = { threadId: string; generation: symbol; sessionId: string; reset: boolean; fresh: boolean };

/** Kept outside assistant-ui metadata, browser storage, and exported transcripts. */
export class AssistantSessions {
  private readonly sessions = new Map<string, Session>();
  private readonly runs = new Map<string, symbol>();

  async prepare(threadId: string, previousReplyId: string | undefined, scope: { gid: Gid; gids: Gid[] }): Promise<Run> {
    const session = this.sessions.get(threadId);
    if (session?.stale) throw new Error("This conversation's saved context expired or no longer matches the dataset. Start a new conversation to continue safely.");
    const reset = !!session && (session.uncertain || session.lastReplyId !== previousReplyId);
    if (reset) await this.forget(threadId);
    const continuation = this.sessions.get(threadId);
    const generation = Symbol();
    this.runs.set(threadId, generation);
    if (continuation) {
      continuation.uncertain = true;
      return { threadId, generation, sessionId: continuation.sessionId, reset, fresh: false };
    }
    // Obtain the capability before sending any question. User cancellation must
    // not discard this response; an abandoned handshake contains scope only.
    const memory = await fetchApi<NonNullable<CopilotResponse["memory"]>>("/copilot/sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gid: scope.gid, ...(scope.gids.length ? { gids: scope.gids } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!/^[a-f0-9]{32}$/.test(memory.session_id)) throw new Error("The assistant could not establish private conversation context. Try again.");
    if (this.runs.get(threadId) !== generation) {
      await this.deleteToken(memory.session_id);
      throw new Error("This conversation was reset. Start a new conversation to continue.");
    }
    this.sessions.set(threadId, { sessionId: memory.session_id, uncertain: true });
    return { threadId, generation, sessionId: memory.session_id, reset, fresh: true };
  }

  markStale(threadId: string): void {
    const session = this.sessions.get(threadId);
    if (session) session.stale = true;
  }

  async cancel(run: Run): Promise<void> {
    if (this.runs.get(run.threadId) === run.generation) await this.forget(run.threadId);
  }

  async complete(run: Run, memory: CopilotResponse["memory"], replyId: string): Promise<void> {
    if (this.runs.get(run.threadId) !== run.generation) {
      await this.deleteToken(run.sessionId);
      throw new Error("This conversation was reset. Start a new conversation to continue.");
    }
    if (!memory || memory.session_id !== run.sessionId) throw new Error("The assistant returned mismatched conversation context. Retry to start fresh context.");
    this.sessions.set(run.threadId, { sessionId: memory.session_id, lastReplyId: replyId, uncertain: false });
  }

  /** Preserve the token on deletion failure so the analyst can retry removal. */
  async forget(threadId: string): Promise<void> {
    this.runs.delete(threadId);
    const session = this.sessions.get(threadId);
    if (session) {
      session.uncertain = true;
      await this.deleteToken(session.sessionId);
      this.sessions.delete(threadId);
    }
  }

  private async deleteToken(sessionId: string): Promise<void> {
    try {
      await fetchApi<void>(`/copilot/sessions/${sessionId}`, { method: "DELETE", signal: AbortSignal.timeout(10000) });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
}

export function publicCopilotReply(response: CopilotResponse): CopilotReply {
  const { memory, ...reply } = response;
  return {
    ...reply,
    ...(memory ? { memory: {
      turns: memory.turns,
      expires_in_seconds: memory.expires_in_seconds,
      persistence: memory.persistence,
    } } : {}),
  };
}

import type { Gid } from "@/api";
import { isGid } from "@/api";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AssistantRuntimeProvider,
  InMemoryThreadListAdapter,
  useAui,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";
import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  ChatCircleTextIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  FingerprintIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AssistantPanel } from "./AssistantPanel";
import type { AssistantRequest, EvidenceScope } from "./AssistantWorkspace";
import { ApiError, fetchApi } from "./api";
import type { CopilotResponse } from "./api";
import { AssistantSessions, publicCopilotReply } from "./assistant-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function validatedScope(value: unknown): EvidenceScope | null {
  if (!value || typeof value !== "object") return null;
  const { gid, gids } = value as EvidenceScope;
  if (
    !isGid(gid) ||
    !Array.isArray(gids) ||
    gids.length > 5 ||
    gids.some((id) => !isGid(id)) ||
    new Set(gids).size !== gids.length
  )
    return null;
  return { gid, gids: [...gids] };
}
const messageText = (message: ThreadMessage) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

/** Each hosted thread owns its adapter. The current graph selection never resolves a run's scope. */
function useEvidenceRuntime(sessions: AssistantSessions) {
  const aui = useAui();
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages, abortSignal, unstable_getMessage }) {
        const scope = validatedScope(aui.threadListItem.getState().custom);
        if (!scope)
          throw new Error("Choose an entity before asking a question.");
        const reverseIndex = [...messages]
          .reverse()
          .findIndex((message) => message.role === "user");
        const lastIndex =
          reverseIndex < 0 ? -1 : messages.length - reverseIndex - 1;
        const question =
          lastIndex < 0 ? "" : messageText(messages[lastIndex]).trim();
        if (!question || question.length > 1200)
          throw new Error("Enter a question between 1 and 1,200 characters.");
        const item = aui.threadListItem;
        const threadId = item.getState().id;
        if (
          lastIndex === 0 &&
          item.getState().title === `Entity ${scope.gid}`
        ) {
          await item.rename(
            question.length > 56 ? `${question.slice(0, 53)}…` : question,
          );
        }
        const previousMessage = messages.slice(0, lastIndex).at(-1);
        const run = await sessions.prepare(
          threadId,
          previousMessage?.role === "assistant"
            ? previousMessage.id
            : undefined,
          scope,
        );
        const started = performance.now();
        let response: CopilotResponse;
        try {
          abortSignal.throwIfAborted();
          response = await fetchApi<CopilotResponse>("/copilot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortSignal,
            body: JSON.stringify({
              gid: scope.gid,
              ...(scope.gids.length ? { gids: scope.gids } : {}),
              question,
              remember: true,
              session_id: run.sessionId,
            }),
          });
          await sessions.complete(
            run,
            response.memory,
            unstable_getMessage().id,
          );
          abortSignal.throwIfAborted();
        } catch (error) {
          if (abortSignal.aborted) {
            // If the server is unreachable, keep the token privately for a later
            // deletion attempt; the bounded server TTL remains the backstop.
            await sessions.cancel(run).catch(() => undefined);
            throw abortSignal.reason;
          }
          if (
            run.sessionId &&
            error instanceof ApiError &&
            (error.status === 404 || error.status === 409)
          ) {
            sessions.markStale(threadId);
            throw new Error(
              "This conversation's saved context expired or no longer matches the dataset. Start a new conversation to continue safely.",
            );
          }
          throw error;
        }
        if (
          typeof response.answer !== "string" ||
          !["offline", "openai", "fallback"].includes(response.mode)
        )
          throw new Error(
            "The assistant returned an unreadable response. Retry this check.",
          );
        return {
          content: [{ type: "text", text: response.answer }],
          metadata: {
            custom: {
              evidence: publicCopilotReply(response),
              elapsedMs: Math.round(performance.now() - started),
              scope,
              memoryReset: run.reset || (run.fresh && lastIndex > 0),
            },
          },
        };
      },
    }),
    [aui, sessions],
  );
  return useLocalRuntime(adapter, { maxSteps: 1 });
}

type Props = {
  open: boolean;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  close: () => void;
  request: AssistantRequest;
  selection: EvidenceScope | null;
  onSelect: (gid: Gid) => void;
};

export default function AssistantRuntime({
  open,
  expanded,
  setExpanded,
  close,
  request,
  selection,
  onSelect,
}: Props) {
  const [adapter] = useState(() => new InMemoryThreadListAdapter());
  const [sessions] = useState(() => new AssistantSessions());
  const runtimeHook = useMemo(
    () =>
      function useScopedEvidenceRuntime() {
        return useEvidenceRuntime(sessions);
      },
    [sessions],
  );
  const runtime = useRemoteThreadListRuntime({ adapter, runtimeHook });
  const threads = useSyncExternalStore(
    runtime.threads.subscribe,
    runtime.threads.getState,
  );
  const current = threads.threadItems[threads.mainThreadId];
  const scope = validatedScope(current?.custom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [rename, setRename] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    enabled: boolean;
    message: string;
  } | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const handled = useRef(0);
  const operation = useRef(false);
  const pending = useRef<{
    next: EvidenceScope | null;
    prompt?: string;
  } | null>(null);
  const modal = expanded || mobile;
  useEffect(() => {
    setHistoryOpen(expanded && !mobile);
  }, [expanded, mobile]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatusError(false);
    fetchApi<{ enabled: boolean; message: string }>("/copilot/status", {
      signal: controller.signal,
    })
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted) setStatusError(true);
      });
    return () => controller.abort();
  }, [open]);

  async function startConversation(
    next: EvidenceScope | null,
    prompt?: string,
  ) {
    if (operation.current) {
      pending.current = { next, prompt };
      return;
    }
    const safe = validatedScope(next);
    if (!safe) {
      setError("Select an entity in the workspace to start a conversation.");
      return;
    }
    if (runtime.threads.getState().threadIds.length >= 30) {
      setError(
        "This session has 30 conversations. Delete one before starting another.",
      );
      return;
    }
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      await runtime.threads.switchToNewThread();
      const id = runtime.threads.getState().mainThreadId;
      const item = runtime.threads.getItemById(id);
      if (item.getState().status !== "new" || item.getState().custom)
        throw new Error("Conversation target changed.");
      await item.initialize();
      if (item.getState().custom)
        throw new Error("Conversation already has a scope.");
      await item.updateCustom(safe);
      await item.rename(prompt ? prompt.slice(0, 64) : `Entity ${safe.gid}`);
      const thread = runtime.threads.getById(id);
      if (prompt) thread.composer.setText(prompt.slice(0, 1200));
      if (!expanded || mobile) setHistoryOpen(false);
      setRename(null);
      setConfirmDelete(null);
      requestAnimationFrame(() =>
        document.getElementById("evidence-assistant-question")?.focus(),
      );
    } catch {
      setError("Could not open this conversation. Try again.");
    } finally {
      finishOperation();
    }
  }
  function finishOperation() {
    setBusy(false);
    operation.current = false;
    const queued = pending.current;
    pending.current = null;
    if (queued) void startConversation(queued.next, queued.prompt);
  }
  async function switchConversation(id: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      await runtime.threads.switchToThread(id);
      if (!expanded || mobile) setHistoryOpen(false);
      setConfirmDelete(null);
    } catch {
      setError("Could not open this conversation.");
    } finally {
      finishOperation();
    }
  }
  useEffect(() => {
    if (handled.current === request.sequence) return;
    handled.current = request.sequence;
    if (
      request.newChat ||
      !validatedScope(runtime.threads.mainItem.getState().custom)
    )
      void startConversation(request.scope, request.prompt);
    else
      requestAnimationFrame(() =>
        document.getElementById("evidence-assistant-question")?.focus(),
      );
  }, [request.sequence]);

  async function deleteConversation(id: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      runtime.threads.getById(id).cancelRun();
      await sessions.forget(id);
      await runtime.threads.getItemById(id).delete();
      setConfirmDelete(null);
      if (!validatedScope(runtime.threads.mainItem.getState().custom)) {
        const first = runtime.threads.getState().threadIds[0];
        if (first) await runtime.threads.switchToThread(first);
        else {
          pending.current = { next: selection };
        }
      }
    } catch {
      setError(
        "Could not remove the saved server context. The conversation is still available; retry deletion when connected.",
      );
    } finally {
      finishOperation();
    }
  }
  function exportConversation() {
    const messages = runtime.thread.getState().messages;
    const content = {
      title: current?.title,
      scope,
      exported_at: new Date().toISOString(),
      notice:
        "AI interpretations require human review. Scores are not probabilities.",
      messages: messages.map((message) => ({
        role: message.role,
        content: messageText(message),
        evidence: message.metadata?.custom,
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `aqsha-conversation-${scope?.gid ?? "session"}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectCitation = (gid: Gid) => {
    onSelect(gid);
    if (mobile) close();
    else setExpanded(false);
  };
  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <img
          src="/brand/aqsha-freedom-mark.png"
          alt=""
          className="size-8 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">Aqsha assistant</h2>
          <p
            className="truncate text-[11px] text-muted-foreground"
            title={status?.message}
          >
            {statusError
              ? "Connection status unavailable"
              : status
                ? status.enabled
                  ? "AI configured · scoped evidence"
                  : "Local evidence · AI disconnected"
                : "Checking connection…"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="Conversation history"
          aria-expanded={historyOpen}
          title="Conversation history"
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          <ClockCounterClockwiseIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="New conversation"
          title="New conversation"
          disabled={busy || !selection}
          onClick={() => void startConversation(selection)}
        >
          <NotePencilIcon />
        </Button>
        {!mobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={expanded ? "Dock assistant" : "Expand assistant"}
            title={expanded ? "Dock assistant" : "Expand assistant"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ArrowsInSimpleIcon /> : <ArrowsOutSimpleIcon />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-md:size-11"
          aria-label="Close assistant"
          title="Close assistant"
          onClick={close}
        >
          <XIcon />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        {historyOpen && (
          <nav
            aria-label="Conversations"
            className={cn(
              "flex shrink-0 flex-col border-r bg-muted/40 p-3",
              expanded && !mobile ? "w-60" : "w-full",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Conversations</h3>
              <Badge variant="secondary">{threads.threadIds.length}</Badge>
            </div>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                aria-label="Search conversations"
                placeholder="Search conversations"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              className="mb-3 justify-start"
              disabled={busy || !selection}
              onClick={() => void startConversation(selection)}
            >
              <NotePencilIcon />
              New conversation
            </Button>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {threads.threadIds
                .filter((id) =>
                  `${threads.threadItems[id]?.title} ${(threads.threadItems[id]?.custom as EvidenceScope | undefined)?.gid}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((id) => {
                  const item = threads.threadItems[id];
                  return (
                    <div
                      key={id}
                      className={cn(
                        "group mb-1 flex items-center gap-1 rounded-lg p-1",
                        id === threads.mainThreadId &&
                          "bg-background ring-1 ring-border",
                      )}
                    >
                      {rename?.id === id ? (
                        <form
                          className="flex min-w-0 flex-1 gap-1"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const title = rename.title.trim();
                            if (title)
                              void runtime.threads
                                .getItemById(id)
                                .rename(title)
                                .then(() => setRename(null));
                          }}
                        >
                          <Input
                            autoFocus
                            aria-label="Conversation name"
                            maxLength={80}
                            value={rename.title}
                            onChange={(event) =>
                              setRename({ id, title: event.target.value })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                setRename(null);
                              }
                            }}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Save conversation name"
                          >
                            <CheckIcon />
                          </Button>
                        </form>
                      ) : (
                        <>
                          <button
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                            aria-current={
                              id === threads.mainThreadId ? "true" : undefined
                            }
                            disabled={busy}
                            onClick={() => void switchConversation(id)}
                          >
                            <ChatCircleTextIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {item.title ?? "New conversation"}
                            </span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Options for ${item.title ?? "conversation"}`}
                                />
                              }
                            >
                              <DotsThreeIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() =>
                                  setRename({ id, title: item.title ?? "" })
                                }
                              >
                                <PencilSimpleIcon />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirmDelete(id)}
                              >
                                <TrashIcon />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
            {confirmDelete && (
              <div className="my-2 rounded-lg border bg-card p-3 text-xs">
                <p className="mb-2">
                  Delete this conversation, its drafts, and saved server
                  context?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void deleteConversation(confirmDelete)}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirmDelete(null)}
                  >
                    Keep
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Chats stay until refresh. Export a conversation to keep a copy.
            </p>
          </nav>
        )}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            historyOpen && !(expanded && !mobile) && "hidden",
          )}
        >
          {scope && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 font-normal"
                title="Open this account in the graph"
                onClick={() => selectCitation(scope.gid)}
              >
                <FingerprintIcon />
                Entity <span className="font-mono">{scope.gid}</span>
              </Button>
              {scope.gids.length > 0 && (
                <span
                  className="text-xs text-muted-foreground"
                  title={scope.gids.join(", ")}
                >
                  + {scope.gids.length} comparison accounts
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      aria-label="Conversation actions"
                    />
                  }
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportConversation}>
                    <DownloadSimpleIcon />
                    Export conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setRename({
                        id: threads.mainThreadId,
                        title: current?.title ?? "",
                      });
                      setHistoryOpen(true);
                    }}
                  >
                    <PencilSimpleIcon />
                    Rename conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setConfirmDelete(threads.mainThreadId);
                      setHistoryOpen(true);
                    }}
                  >
                    <TrashIcon />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {selection &&
                (selection.gid !== scope.gid ||
                  [...selection.gids].sort().join() !==
                    [...scope.gids].sort().join()) && (
                  <div className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Workspace selection changed.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void startConversation(selection)}
                    >
                      Use entity {selection.gid}
                    </Button>
                  </div>
                )}
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="m-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {busy ? (
            <p role="status" className="m-auto text-sm text-muted-foreground">
              Preparing conversation…
            </p>
          ) : scope ? (
            <AssistantPanel
              gid={scope.gid}
              gids={scope.gids}
              onSelect={selectCitation}
              expanded={expanded}
            />
          ) : (
            <div className="m-auto max-w-xs p-5 text-center">
              <FingerprintIcon className="mx-auto mb-3 size-7 text-muted-foreground" />
              <h3 className="mb-2 font-medium">Choose your starting point</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Select an entity to investigate its evidence with Aqsha.
              </p>
              <Button
                disabled={!selection}
                onClick={() => void startConversation(selection)}
              >
                Start conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {modal ? (
        <Sheet
          open={open}
          onOpenChange={(value) => {
            if (!value) close();
          }}
        >
          <SheetContent
            showCloseButton={false}
            className="w-full! max-w-none! gap-0 md:inset-y-4! md:right-4! md:h-[calc(100dvh-2rem)]! md:w-[min(1100px,calc(100vw-2rem))]! md:rounded-2xl md:border"
          >
            <SheetTitle className="sr-only">Aqsha assistant</SheetTitle>
            <SheetDescription className="sr-only">
              Conversations grounded in selected account evidence.
            </SheetDescription>
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        open && (
          <aside
            aria-label="Aqsha assistant"
            className="assistant-dock fixed top-20 right-5 bottom-5 z-40 w-[460px] overflow-hidden rounded-2xl border bg-background shadow-[0_16px_64px_-16px_#27272440]"
          >
            {body}
          </aside>
        )
      )}
    </AssistantRuntimeProvider>
  );
}

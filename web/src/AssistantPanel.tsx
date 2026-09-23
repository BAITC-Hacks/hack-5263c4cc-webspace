import { lazy, Suspense, useId } from "react";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowCounterClockwise,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  Check,
  Copy,
  Fingerprint,
  GitBranch,
  ListChecks,
  PencilSimple,
  Question,
  ShieldCheck,
  Stop,
  Users,
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import type { CopilotReply } from "./api";
import "./assistant-panel.css";

const EvidenceMarkdown = lazy(() => import("./EvidenceMarkdown"));

export interface AssistantPanelProps {
  gid: number;
  gids: number[];
  onSelect: (gid: number) => void;
  expanded?: boolean;
}

type ReplyMetadata = {
  evidence: CopilotReply;
  elapsedMs: number;
  memoryReset?: boolean;
};

const toolLabels: Record<string, string> = {
  inspect_investigation_brief: "Investigation brief and next evidence requests",
  inspect_selected_node: "Account activity and review priority",
  inspect_neighborhood: "Connected accounts and transfers",
  inspect_cluster: "Community structure",
  inspect_patterns: "Timing, repeated routes, and return flows",
  find_common_collectors: "Shared collectors across selected accounts",
  simulate_top_removal: "Network resilience",
  inspect_missing_evidence: "Evidence gaps and next requests",
};

/** Conversation UI only. The workspace owns its lifetime and evidence scope. */
export function AssistantPanel({
  gid,
  gids,
  onSelect,
  expanded = false,
}: AssistantPanelProps) {
  return (
    <ThreadPrimitive.Root
      className="asst-thread"
      data-expanded={expanded || undefined}
      aria-label={`Assistant conversation for entity ${gid}`}
    >
      <ThreadPrimitive.Viewport
        className="asst-viewport"
        turnAnchor="top"
        autoScroll={false}
      >
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <Welcome gid={gid} gids={gids} />
        </AuiIf>
        <div className="asst-messages" aria-label="Conversation messages">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.role === "user") {
                return message.composer.isEditing ? (
                  <EditComposer />
                ) : (
                  <UserMessage />
                );
              }
              return <AssistantMessage onSelect={onSelect} />;
            }}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="asst-footer">
          <div className="asst-composer-wrap">
            <AuiIf condition={(state) => !state.thread.isEmpty}>
              <ThreadPrimitive.ScrollToBottom
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="asst-scroll-latest disabled:hidden"
                  />
                }
                aria-label="Scroll to latest reply"
                title="Scroll to latest reply"
              >
                <ArrowDown />
              </ThreadPrimitive.ScrollToBottom>
            </AuiIf>
            <EvidenceComposer />
            <MemoryNotice />
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function MemoryNotice() {
  const memory = useAuiState((state) => {
    const latestReply = [...state.thread.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && message.metadata.custom?.evidence,
      );
    return (latestReply?.metadata.custom as Partial<ReplyMetadata> | undefined)
      ?.evidence?.memory;
  });
  return (
    <p className="asst-footnote" role="status">
      Evidence rechecked for every answer.{" "}
      {memory
        ? `Context expires within ${Math.max(1, Math.ceil(memory.expires_in_seconds / 3600))}h; delete this chat to clear it.`
        : "Context expires within 24h; delete a chat to clear it."}
    </p>
  );
}

function Welcome({ gid, gids }: { gid: number; gids: number[] }) {
  const suggestions = [
    {
      title: "Explain this account",
      detail: "Activity, role, and review priority",
      prompt:
        "Explain this entity’s observed activity, role hypothesis, and review priority. Separate facts from hypotheses.",
      Icon: Fingerprint,
    },
    {
      title: "Follow the money",
      detail: "Repeated routes and return flows",
      prompt:
        "Check repeated routes and return flows for this entity. Show observed paths and their limits.",
      Icon: GitBranch,
    },
    {
      title: "Plan the next step",
      detail: "Missing evidence and useful requests",
      prompt:
        "What evidence is missing, and what should I request next? Prioritize the requests and explain why.",
      Icon: ListChecks,
    },
    gids.length > 0
      ? {
          title: "Compare selected accounts",
          detail: "Shared collectors and observed paths",
          prompt: `Who collects money from these ${gids.length} selected comparison accounts? Show the observed paths and limitations.`,
          Icon: Users,
        }
      : {
          title: "Challenge the hypothesis",
          detail: "Alternative explanations and limits",
          prompt:
            "Challenge this entity’s role hypothesis. Which observations support it, what alternative explanations fit, and what cannot be established?",
          Icon: ShieldCheck,
        },
  ];
  return (
    <div className="asst-welcome">
      <img
        src="/brand/aqsha-freedom-mark.png"
        alt=""
        className="asst-welcome-mark"
        width={48}
        height={48}
      />
      <h2>What would you like to investigate?</h2>
      <p className="asst-welcome-description">
        Explore the evidence for account <strong>{gid}</strong>.
      </p>
      <div className="asst-suggestions" aria-label="Suggested questions">
        {suggestions.map(({ title, detail, prompt, Icon }) => (
          <ThreadPrimitive.Suggestion
            key={title}
            prompt={prompt}
            send
            render={<Button variant="outline" className="asst-suggestion" />}
          >
            <Icon className="asst-suggestion-icon" />
            <span className="min-w-0">
              <span className="asst-suggestion-title">{title}</span>
              <span className="asst-suggestion-detail">{detail}</span>
            </span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="asst-user-message">
      <div className="asst-user-bubble">
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root hideWhenRunning className="asst-user-actions">
        <ActionBarPrimitive.Copy
          render={<Button variant="ghost" size="icon-sm" />}
          className="asst-copy"
          aria-label="Copy question"
          title="Copy question"
          copiedDuration={1800}
        >
          <Copy className="asst-copy-icon" />
          <Check className="asst-copied-icon" />
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Edit
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label="Edit question"
          title="Edit question"
        >
          <PencilSimple />
        </ActionBarPrimitive.Edit>
        <ReplyBranches question />
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  const inputId = useId();
  return (
    <MessagePrimitive.Root className="asst-edit-message">
      <ComposerPrimitive.Root className="asst-edit-composer">
        <Field>
          <FieldLabel htmlFor={inputId}>Edit your question</FieldLabel>
          <InputGroup>
            <ComposerPrimitive.Input
              render={
                <InputGroupTextarea className="min-h-24 max-h-56 text-sm" />
              }
              id={inputId}
              maxLength={1200}
              rows={3}
              submitMode="enter"
              unstable_insertNewlineOnTouchEnter
              addAttachmentOnPaste={false}
              autoFocus
            />
            <InputGroupAddon align="block-end" className="justify-end gap-2">
              <ComposerPrimitive.Cancel
                render={<Button variant="ghost" size="sm" />}
              >
                Cancel
              </ComposerPrimitive.Cancel>
              <ComposerPrimitive.Send render={<Button size="sm" />}>
                Save & resend <ArrowUp />
              </ComposerPrimitive.Send>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function SafeMarkdown() {
  return (
    <Suspense
      fallback={
        <div className="asst-markdown">
          <MessagePartPrimitive.Text />
        </div>
      }
    >
      <EvidenceMarkdown />
    </Suspense>
  );
}

function AssistantMessage({ onSelect }: { onSelect: (gid: number) => void }) {
  const metadata = useAuiState(
    (state) => state.message.metadata.custom as Partial<ReplyMetadata>,
  );
  const status = useAuiState((state) => state.message.status);
  const reply = metadata.evidence;
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  return (
    <MessagePrimitive.Root className="asst-assistant-message">
      <div className="asst-reply-heading">
        <img
          src="/brand/aqsha-freedom-mark.png"
          alt=""
          width={24}
          height={24}
        />
        <span className="font-medium">Aqsha</span>
        {reply && <ModeBadge mode={reply.mode} />}
      </div>
      <AuiIf condition={(state) => state.message.status?.type === "running"}>
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Spinner />
          <span>Checking the evidence…</span>
        </div>
      </AuiIf>
      <MessagePrimitive.Parts components={{ Text: SafeMarkdown }} />
      {isCancelled && (
        <p className="text-sm text-muted-foreground" role="status">
          Reply stopped. You can retry or ask another question.
        </p>
      )}
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root render={<Alert variant="destructive" />}>
          <Question />
          <AlertTitle>This check did not finish</AlertTitle>
          <AlertDescription>
            <ErrorPrimitive.Message />
            <p className="mt-2">
              Your question and the computed evidence are still available.
            </p>
          </AlertDescription>
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
      {reply && (
        <>
          {metadata.memoryReset && (
            <p className="asst-local-notice" role="status">
              <ShieldCheck />
              This version starts fresh context. Earlier branches and
              interrupted replies were not sent.
            </p>
          )}
          {reply.mode !== "openai" && (
            <p className="asst-local-notice" role="status">
              <ShieldCheck />
              {reply.mode === "fallback"
                ? "AI could not complete this check. Showing the computed local summary."
                : "Computed locally. Free-form follow-ups need the optional AI connection."}
            </p>
          )}
          <EvidenceDetails reply={reply} onSelect={onSelect} />
        </>
      )}
      <ActionBarPrimitive.Root hideWhenRunning className="asst-reply-actions">
        <ActionBarPrimitive.Copy
          render={<Button variant="ghost" size="sm" />}
          className="asst-copy"
          aria-label="Copy answer"
          copiedDuration={1800}
        >
          <Copy className="asst-copy-icon" />
          <Check className="asst-copied-icon" />
          <span className="asst-copy-label">Copy</span>
          <span className="asst-copied-label">Copied</span>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload
          render={<Button variant="ghost" size="sm" />}
          aria-label="Retry this evidence check"
        >
          <ArrowCounterClockwise />
          Retry
        </ActionBarPrimitive.Reload>
        <ReplyBranches />
        {typeof metadata.elapsedMs === "number" && (
          <span
            className="ml-auto text-xs text-muted-foreground tabular-nums"
            title="Time to receive the completed evidence check"
          >
            {(metadata.elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function EvidenceDetails({
  reply,
  onSelect,
}: {
  reply: CopilotReply;
  onSelect: (gid: number) => void;
}) {
  if (
    !reply.citations.length &&
    !reply.trace.length &&
    !reply.limitations.length &&
    !reply.execution
  )
    return null;
  return (
    <div className="asst-evidence-details">
      {reply.citations.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="asst-detail-trigger group" />
            }
          >
            <Fingerprint />
            <span>
              {reply.citations.length} evidence{" "}
              {reply.citations.length === 1 ? "reference" : "references"}
            </span>
            <CaretRight className="ml-auto group-data-panel-open:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="asst-sources" aria-label="Evidence references">
              {reply.citations.map((citation, index) => (
                <li key={`${citation.label}-${index}`}>
                  <span className="asst-source-number">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    {citation.gid !== undefined ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="asst-source-link"
                        onClick={() => onSelect(citation.gid!)}
                      >
                        <span>
                          {citation.label || `Entity ${citation.gid}`}
                        </span>
                        <ArrowSquareOut />
                      </Button>
                    ) : (
                      <strong className="text-xs font-medium">
                        {citation.label || `Reference ${index + 1}`}
                      </strong>
                    )}
                    {citation.text && <p>{citation.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
      {reply.trace.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="asst-detail-trigger group" />
            }
          >
            <ListChecks />
            <span>
              {reply.trace.length} evidence{" "}
              {reply.trace.length === 1 ? "check" : "checks"}
            </span>
            <CaretRight className="ml-auto group-data-panel-open:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="asst-trace">
              {reply.trace.map((step, index) => (
                <li key={`${step.tool}-${index}`}>
                  <span className="min-w-0 flex-1">
                    {toolLabels[step.tool] || step.tool.replaceAll("_", " ")}
                  </span>
                  <Badge variant="secondary">
                    {step.status === "ok" || step.status === "success"
                      ? "Checked"
                      : step.status.replaceAll("_", " ")}
                  </Badge>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
      {reply.limitations.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="asst-detail-trigger group" />
            }
          >
            <ShieldCheck />
            <span>Limits of this answer</span>
            <CaretRight className="ml-auto group-data-panel-open:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="asst-limitations">
              {reply.limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {reply.execution && (
        <Collapsible>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="asst-detail-trigger group" />
            }
          >
            <ListChecks />
            <span>Execution details</span>
            <CaretRight className="ml-auto group-data-panel-open:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 px-3 py-2 text-xs text-muted-foreground">
              <dt>Status</dt>
              <dd>{reply.execution.status}</dd>
              {reply.model && (
                <>
                  <dt>Model</dt>
                  <dd className="break-all">{reply.model}</dd>
                </>
              )}
              <dt>Evidence checks</dt>
              <dd>{reply.execution.tool_calls}</dd>
              <dt>Model rounds</dt>
              <dd>{reply.execution.model_rounds}</dd>
              <dt>Reported tokens</dt>
              <dd>
                {reply.execution.input_tokens.toLocaleString()} input ·{" "}
                {reply.execution.output_tokens.toLocaleString()} output
              </dd>
              <dt>Server time</dt>
              <dd>{(reply.execution.elapsed_ms / 1000).toFixed(1)}s</dd>
              {reply.execution.fallback_code && (
                <>
                  <dt>Fallback reason</dt>
                  <dd>{reply.execution.fallback_code.replaceAll("_", " ")}</dd>
                </>
              )}
              {reply.execution.evidence_version && (
                <>
                  <dt>Evidence version</dt>
                  <dd className="break-all font-mono">
                    {reply.execution.evidence_version}
                  </dd>
                </>
              )}
              <dt>Run receipt</dt>
              <dd className="break-all font-mono">{reply.execution.run_id}</dd>
            </dl>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ReplyBranches({ question = false }: { question?: boolean }) {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="flex items-center gap-0.5 text-xs text-muted-foreground"
    >
      <BranchPickerPrimitive.Previous
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={`Previous ${question ? "question" : "reply"} version`}
      >
        <CaretLeft />
      </BranchPickerPrimitive.Previous>
      <span className="tabular-nums">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={`Next ${question ? "question" : "reply"} version`}
      >
        <CaretRight />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}

function ModeBadge({ mode }: { mode: CopilotReply["mode"] }) {
  return (
    <Badge variant="outline" className="asst-mode-badge">
      {mode === "openai"
        ? "AI assisted"
        : mode === "fallback"
          ? "Local fallback"
          : "Local summary"}
    </Badge>
  );
}

function EvidenceComposer() {
  const length = useAuiState((state) => state.composer.text.length);
  const isEmpty = useAuiState((state) => state.thread.isEmpty);
  return (
    <ComposerPrimitive.Root className="asst-composer">
      <Field>
        <FieldLabel htmlFor="evidence-assistant-question" className="sr-only">
          Ask Aqsha about the evidence
        </FieldLabel>
        <InputGroup className="asst-composer-input-group">
          <ComposerPrimitive.Input
            render={<InputGroupTextarea className="asst-composer-input" />}
            id="evidence-assistant-question"
            placeholder={
              isEmpty ? "Ask Aqsha about this account…" : "Ask a follow-up…"
            }
            maxLength={1200}
            rows={2}
            submitMode="enter"
            unstable_insertNewlineOnTouchEnter
            addAttachmentOnPaste={false}
            unstable_focusOnThreadSwitched={false}
            aria-describedby="assistant-input-help"
          />
          <InputGroupAddon align="block-end" className="asst-composer-actions">
            <span id="assistant-input-help" className="asst-input-help">
              {length > 1000 ? (
                `${length}/1,200 characters`
              ) : (
                <>
                  <span className="asst-keyboard-help">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <span className="asst-touch-help">
                    Ask about the scoped evidence
                  </span>
                </>
              )}
            </span>
            <AuiIf condition={(state) => !state.thread.isRunning}>
              <ComposerPrimitive.Send
                render={<Button size="icon-lg" className="rounded-full" />}
                aria-label="Send question"
              >
                <ArrowUp weight="bold" />
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(state) => state.thread.isRunning}>
              <ComposerPrimitive.Cancel
                render={
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    className="rounded-full"
                  />
                }
                aria-label="Stop waiting for this reply"
              >
                <Stop weight="fill" />
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </ComposerPrimitive.Root>
  );
}

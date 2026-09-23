import {lazy, Suspense, useEffect, useMemo, useRef} from 'react';
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useLocalRuntime,
} from '@assistant-ui/react';
import type {ChatModelAdapter} from '@assistant-ui/react';
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, CircleHelp,
  Copy, Fingerprint, LoaderCircle, MessageSquare, RotateCcw,
  ShieldCheck, Square, Trash2, Users,
} from 'lucide-react';
import type {CopilotResponse} from './api';
import {fetchApi} from './api';
import './assistant-panel.css';

const EvidenceMarkdown = lazy(() => import('./EvidenceMarkdown'));

export interface AssistantPanelProps {
  gid: number;
  gids: number[];
  onSelect: (gid: number) => void;
}

type ReplyMetadata = {evidence: CopilotResponse; elapsedMs: number};

/** The browser renders completed server evidence; it never executes agent tools. */
export function AssistantPanel({gid, gids, onSelect}: AssistantPanelProps) {
  const cohort = [...new Set(gids)].sort((a, b) => a - b);
  if (!Number.isSafeInteger(gid) || cohort.length > 5 || cohort.some(id => !Number.isSafeInteger(id))) {
    return <div className="asst-scope-error" role="alert">Select one entity and at most five comparison entities.</div>;
  }
  const scope = `${gid}:${cohort.join(',')}`;
  return <ScopedAssistant key={scope} gid={gid} gids={cohort} onSelect={onSelect}/>;
}

function ScopedAssistant({gid, gids, onSelect}: AssistantPanelProps) {
  const activeRequests = useRef(new Set<AbortController>());
  const cohortKey = gids.join(',');
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({messages, abortSignal}) {
      // The server accepts an independent question, not chat history. Scope is
      // immutable for this runtime and never supplied by model-generated text.
      const latestUser = [...messages].reverse().find(message => message.role === 'user');
      const question = latestUser?.content.filter(part => part.type === 'text').map(part => part.text).join('\n').trim() ?? '';
      if (!question || question.length > 1200) throw new Error('Enter a question between 1 and 1,200 characters.');
      const requestController = new AbortController();
      activeRequests.current.add(requestController);
      const cancel = () => requestController.abort();
      abortSignal.addEventListener('abort', cancel, {once: true});
      if (abortSignal.aborted) requestController.abort();
      const started = performance.now();
      try {
        const response = await fetchApi<CopilotResponse>('/copilot', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({gid, ...(cohortKey ? {gids: cohortKey.split(',').map(Number)} : {}), question}),
          signal: requestController.signal,
        });
        requestController.signal.throwIfAborted();
        if (typeof response.answer !== 'string' || !['offline', 'openai', 'fallback'].includes(response.mode)) {
          throw new Error('The assistant returned an unreadable response. Retry this evidence check.');
        }
        return {
          content: [{type: 'text', text: response.answer}],
          metadata: {custom: {evidence: response, elapsedMs: Math.round(performance.now() - started)}},
        };
      } finally {
        abortSignal.removeEventListener('abort', cancel);
        activeRequests.current.delete(requestController);
      }
    },
  }), [gid, cohortKey]);
  const runtime = useLocalRuntime(adapter, {maxSteps: 1});

  useEffect(() => {
    const requests = activeRequests.current;
    return () => {for (const request of requests) request.abort(); requests.clear();};
  }, []);

  return <AssistantRuntimeProvider runtime={runtime}>
    <EvidenceThread gid={gid} gids={gids} onSelect={onSelect}/>
  </AssistantRuntimeProvider>;
}

function EvidenceThread({gid, gids, onSelect}: AssistantPanelProps) {
  return <ThreadPrimitive.Root className="asst-panel" aria-label={`Evidence assistant for entity ${gid}`}>
    <ScopeHeader gid={gid} gids={gids}/>
    <ThreadPrimitive.Viewport className="asst-viewport" turnAnchor="top" autoScroll={false}>
      <AuiIf condition={state => state.thread.isEmpty}>
        <div className="asst-welcome">
          <span className="asst-welcome-icon"><MessageSquare size={20}/></span>
          <h3>Ask the evidence</h3>
          <p>Test a role hypothesis, follow a route, or identify what’s missing.</p>
          <div className="asst-suggestions" aria-label="Suggested evidence checks">
            <ThreadPrimitive.Suggestion prompt="Why is this entity prioritized?" send>
              <span>Explain this review priority</span><ChevronRight size={14}/>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt="Check repeated routes and return flows for this entity." send>
              <span>Find routes and return flows</span><ChevronRight size={14}/>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt="What evidence is missing, and what should I request next?" send>
              <span>What should I request next?</span><ChevronRight size={14}/>
            </ThreadPrimitive.Suggestion>
            {gids.length > 0 && <ThreadPrimitive.Suggestion prompt={`Who collects money from these ${gids.length} selected comparison accounts? Show the observed paths.`} send>
              <span>Find shared collectors</span><Users size={14}/>
            </ThreadPrimitive.Suggestion>}
          </div>
        </div>
      </AuiIf>
      <div className="asst-messages" aria-label="Evidence check history">
        <ThreadPrimitive.Messages>{({message}) => message.role === 'user'
          ? <UserMessage/>
          : <AssistantMessage onSelect={onSelect}/>
        }</ThreadPrimitive.Messages>
      </div>
      <ThreadPrimitive.ViewportFooter className="asst-composer-area">
      <ThreadPrimitive.ScrollToBottom className="asst-scroll-bottom" aria-label="Scroll to latest evidence check"><ArrowDown size={13}/><span>Latest reply</span></ThreadPrimitive.ScrollToBottom>
      <EvidenceComposer/>
      <p className="asst-session-note"><ShieldCheck size={11}/><span>Each question checks this scope afresh. History stays in this view.</span></p>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
  </ThreadPrimitive.Root>;
}

function ScopeHeader({gid, gids}: {gid: number; gids: number[]}) {
  const aui = useAui();
  return <header className="asst-scope">
    <div><Fingerprint size={14}/><span>Entity <strong className="mono">{gid}</strong></span></div>
    <AuiIf condition={state => !state.thread.isEmpty}>
      <button type="button" className="asst-icon-button" aria-label="Clear this local conversation" title="Clear this local conversation" onClick={() => {aui.thread().cancelRun(); aui.thread().reset();}}><Trash2 size={14}/></button>
    </AuiIf>
    {gids.length > 0 && <p className="asst-cohort-scope"><Users size={12}/><span>Comparing {gids.join(', ')}</span></p>}
  </header>;
}

function UserMessage() {
  return <MessagePrimitive.Root className="asst-user-message">
    <span className="asst-message-label">Your question</span>
    <MessagePrimitive.Parts/>
  </MessagePrimitive.Root>;
}

function SafeMarkdown() {
  return <Suspense fallback={<div className="asst-markdown"><MessagePartPrimitive.Text/></div>}><EvidenceMarkdown/></Suspense>;
}

function AssistantMessage({onSelect}: {onSelect: (gid: number) => void}) {
  const metadata = useAuiState(state => state.message.metadata.custom as Partial<ReplyMetadata>);
  const status = useAuiState(state => state.message.status);
  const reply = metadata.evidence;
  const isCancelled = status?.type === 'incomplete' && status.reason === 'cancelled';
  return <MessagePrimitive.Root className="asst-assistant-message">
    <div className="asst-reply-heading"><span className="asst-agent-mark"><ShieldCheck size={13}/></span><strong>Evidence check</strong>{reply && <ModeBadge mode={reply.mode}/>}</div>
    <AuiIf condition={state => state.message.status?.type === 'running'}>
      <div className="asst-pending" role="status"><LoaderCircle size={16}/><span>Checking selected evidence…</span></div>
    </AuiIf>
    <MessagePrimitive.Parts components={{Text: SafeMarkdown}}/>
    {isCancelled && <p className="asst-cancelled" role="status">Stopped waiting for this reply.</p>}
    <MessagePrimitive.Error><ErrorPrimitive.Root className="asst-error" role="alert"><CircleHelp size={15}/><div><strong>This check did not finish</strong><ErrorPrimitive.Message/><p>Retry below. The graph and computed evidence remain available.</p></div></ErrorPrimitive.Root></MessagePrimitive.Error>
    {reply && <>
      {reply.mode !== 'openai' && <div className="asst-local-note"><CircleHelp size={13}/><p>{reply.mode === 'fallback' ? 'The AI connection did not return an answer. This is the computed local summary.' : 'Local evidence summary. Free-form analysis needs the optional AI connection.'}</p></div>}
      {reply.citations.length > 0 && <section className="asst-citations" aria-label="Evidence references"><h4>Evidence references</h4>{reply.citations.map((citation, index) => <div key={`${citation.label}-${index}`}>{citation.gid !== undefined
        ? <button type="button" onClick={() => onSelect(citation.gid!)}><Fingerprint size={12}/><span>{citation.label || `Entity ${citation.gid}`}</span><ChevronRight size={12}/></button>
        : <strong>{citation.label || `Reference ${index + 1}`}</strong>}{citation.text && <p>{citation.text}</p>}</div>)}</section>}
      {reply.trace.length > 0 && <details className="asst-trace"><summary><Check size={13}/><span>{reply.trace.length} evidence checks</span><ChevronRight size={13}/></summary><ol>{reply.trace.map((step, index) => <li key={`${step.tool}-${index}`}><span>{step.tool.replaceAll('_', ' ')}</span><small>{step.status}</small></li>)}</ol></details>}
      {reply.limitations.length > 0 && <details className="asst-limitations"><summary>What this answer cannot establish</summary><ul>{reply.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details>}
    </>}
    <ActionBarPrimitive.Root hideWhenRunning className="asst-actions">
      <ActionBarPrimitive.Copy className="asst-copy" aria-label="Copy answer" copiedDuration={1800}><Copy size={13} className="asst-copy-icon"/><Check size={13} className="asst-copied-icon"/><span className="asst-copy-label">Copy</span><span className="asst-copied-label">Copied</span></ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload aria-label="Retry this evidence check"><RotateCcw size={13}/><span>Retry</span></ActionBarPrimitive.Reload>
      {typeof metadata.elapsedMs === 'number' && <span className="asst-response-time">{(metadata.elapsedMs / 1000).toFixed(1)}s</span>}
      <BranchPickerPrimitive.Root hideWhenSingleBranch className="asst-branches"><BranchPickerPrimitive.Previous aria-label="Previous reply version"><ChevronLeft size={12}/></BranchPickerPrimitive.Previous><span><BranchPickerPrimitive.Number/>/<BranchPickerPrimitive.Count/></span><BranchPickerPrimitive.Next aria-label="Next reply version"><ChevronRight size={12}/></BranchPickerPrimitive.Next></BranchPickerPrimitive.Root>
    </ActionBarPrimitive.Root>
  </MessagePrimitive.Root>;
}

function ModeBadge({mode}: {mode: CopilotResponse['mode']}) {
  return <span className={`asst-mode asst-mode-${mode}`}>{mode === 'openai' ? 'AI assisted' : mode === 'fallback' ? 'Local fallback' : 'Local summary'}</span>;
}

function EvidenceComposer() {
  const length = useAuiState(state => state.composer.text.length);
  return <ComposerPrimitive.Root className="asst-composer">
    <label htmlFor="evidence-assistant-question" className="sr-only">Ask about the selected evidence</label>
    <ComposerPrimitive.Input id="evidence-assistant-question" placeholder="Ask about the selected evidence…" maxLength={1200} minRows={2} maxRows={5} submitMode="enter" unstable_insertNewlineOnTouchEnter addAttachmentOnPaste={false} unstable_focusOnThreadSwitched={false} aria-describedby="assistant-input-help"/>
    <div className="asst-composer-controls"><span id="assistant-input-help">{length > 1000 ? `${length}/1,200` : 'Enter to send / Shift + Enter for a new line'}</span>
      <AuiIf condition={state => !state.thread.isRunning}><ComposerPrimitive.Send className="asst-send" aria-label="Ask evidence assistant"><ArrowUp size={16}/></ComposerPrimitive.Send></AuiIf>
      <AuiIf condition={state => state.thread.isRunning}><ComposerPrimitive.Cancel className="asst-send asst-stop" aria-label="Stop waiting for this reply"><Square size={13}/></ComposerPrimitive.Cancel></AuiIf>
    </div>
  </ComposerPrimitive.Root>;
}

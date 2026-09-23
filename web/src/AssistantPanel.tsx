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
  ArrowDown, ArrowUp, Check, CaretLeft, CaretRight, Question,
  Copy, Fingerprint, ChatCircleText, ArrowCounterClockwise,
  ShieldCheck, Stop, Trash, Users,
} from '@phosphor-icons/react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from '@/components/ui/empty';
import {Field, FieldGroup, FieldLabel} from '@/components/ui/field';
import {InputGroup, InputGroupAddon, InputGroupTextarea} from '@/components/ui/input-group';
import {Separator} from '@/components/ui/separator';
import {Spinner} from '@/components/ui/spinner';
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
    return <Alert variant="destructive"><Question/><AlertTitle>Choose a valid scope</AlertTitle><AlertDescription>Select one entity and at most five comparison entities.</AlertDescription></Alert>;
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
  return <ThreadPrimitive.Root className="flex h-[70dvh] min-h-96 max-h-190 min-w-0 flex-col bg-background text-foreground" aria-label={`Evidence assistant for entity ${gid}`}>
    <ScopeHeader gid={gid} gids={gids}/>
    <Separator/>
    <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-5" turnAnchor="top" autoScroll={false}>
      <AuiIf condition={state => state.thread.isEmpty}>
        <Empty className="flex-none px-0 pt-2 pb-5">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ChatCircleText/></EmptyMedia>
            <EmptyTitle>Ask the evidence</EmptyTitle>
            <EmptyDescription>Test a role hypothesis, follow a route, or identify what’s missing.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent aria-label="Suggested evidence checks">
            <ThreadPrimitive.Suggestion prompt="Why is this entity prioritized?" send render={<Button variant="outline" className="h-auto w-full justify-between py-2.5"/>}>
              <span className="min-w-0 whitespace-normal text-left">Explain this review priority</span><CaretRight data-icon="inline-end"/>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt="Check repeated routes and return flows for this entity." send render={<Button variant="outline" className="h-auto w-full justify-between py-2.5"/>}>
              <span className="min-w-0 whitespace-normal text-left">Find routes and return flows</span><CaretRight data-icon="inline-end"/>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt="What evidence is missing, and what should I request next?" send render={<Button variant="outline" className="h-auto w-full justify-between py-2.5"/>}>
              <span className="min-w-0 whitespace-normal text-left">What should I request next?</span><CaretRight data-icon="inline-end"/>
            </ThreadPrimitive.Suggestion>
            {gids.length > 0 && <ThreadPrimitive.Suggestion prompt={`Who collects money from these ${gids.length} selected comparison accounts? Show the observed paths.`} send render={<Button variant="outline" className="h-auto w-full justify-between py-2.5"/>}>
              <span className="min-w-0 whitespace-normal text-left">Find shared collectors</span><Users data-icon="inline-end"/>
            </ThreadPrimitive.Suggestion>}
          </EmptyContent>
        </Empty>
      </AuiIf>
      <div className="flex flex-col gap-6 pb-5" aria-label="Evidence check history">
        <ThreadPrimitive.Messages>{({message}) => message.role === 'user'
          ? <UserMessage/>
          : <AssistantMessage onSelect={onSelect}/>
        }</ThreadPrimitive.Messages>
      </div>
      <ThreadPrimitive.ViewportFooter className="sticky bottom-0 -mx-4 mt-auto flex shrink-0 flex-col gap-3 bg-background px-4 pb-4">
        <Separator/>
        <ThreadPrimitive.ScrollToBottom render={<Button variant="outline" size="sm" className="absolute left-1/2 -top-9 -translate-x-1/2 disabled:hidden"/>} aria-label="Scroll to latest evidence check"><ArrowDown data-icon="inline-start"/>Latest reply</ThreadPrimitive.ScrollToBottom>
        <EvidenceComposer/>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0"/><span>Each question checks this scope afresh. History stays in this view.</span></p>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
  </ThreadPrimitive.Root>;
}

function ScopeHeader({gid, gids}: {gid: number; gids: number[]}) {
  const aui = useAui();
  return <header className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
    <Fingerprint className="size-4 text-muted-foreground"/>
    <span className="text-sm">Entity <strong className="font-mono font-medium">{gid}</strong></span>
    <AuiIf condition={state => !state.thread.isEmpty}>
      <Button variant="ghost" size="icon" className="ml-auto" aria-label="Clear this local conversation" title="Clear this local conversation" onClick={() => {aui.thread().cancelRun(); aui.thread().reset();}}><Trash/></Button>
    </AuiIf>
    {gids.length > 0 && <p className="flex w-full items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Users className="mt-0.5 size-3.5 shrink-0"/><span className="break-words">Comparing {gids.join(', ')}</span></p>}
  </header>;
}

function UserMessage() {
  return <MessagePrimitive.Root className="flex flex-col gap-1.5 rounded-lg bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
    <span className="text-xs font-medium text-muted-foreground">Your question</span>
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
  return <MessagePrimitive.Root className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2 text-sm"><ShieldCheck className="size-4 text-muted-foreground"/><strong className="font-medium">Evidence check</strong>{reply && <ModeBadge mode={reply.mode}/>}</div>
    <AuiIf condition={state => state.message.status?.type === 'running'}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Spinner/><span>Checking selected evidence…</span></div>
    </AuiIf>
    <MessagePrimitive.Parts components={{Text: SafeMarkdown}}/>
    {isCancelled && <p className="text-sm text-muted-foreground" role="status">Stopped waiting for this reply.</p>}
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root render={<Alert variant="destructive"/>}>
        <Question/>
        <AlertTitle>This check did not finish</AlertTitle>
        <AlertDescription><ErrorPrimitive.Message/><p className="mt-2">Retry below. The graph and computed evidence remain available.</p></AlertDescription>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
    {reply && <>
      {reply.mode !== 'openai' && <Alert role="status"><Question/><AlertTitle>{reply.mode === 'fallback' ? 'Local fallback' : 'Local evidence summary'}</AlertTitle><AlertDescription>{reply.mode === 'fallback' ? 'The AI connection did not return an answer. This is the computed local summary.' : 'Free-form analysis needs the optional AI connection.'}</AlertDescription></Alert>}
      {reply.citations.length > 0 && <section className="flex flex-col gap-3" aria-label="Evidence references">
        <Separator/>
        <h4 className="text-xs font-medium text-muted-foreground">Evidence references</h4>
        {reply.citations.map((citation, index) => <div className="flex min-w-0 flex-col gap-2" key={`${citation.label}-${index}`}>{citation.gid !== undefined
          ? <Button variant="outline" size="sm" className="h-auto max-w-full self-start py-1.5" onClick={() => onSelect(citation.gid!)}><Fingerprint data-icon="inline-start"/><span className="whitespace-normal text-left [overflow-wrap:anywhere]">{citation.label || `Entity ${citation.gid}`}</span><CaretRight data-icon="inline-end"/></Button>
          : <strong className="text-xs font-medium">{citation.label || `Reference ${index + 1}`}</strong>}{citation.text && <p className="text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{citation.text}</p>}</div>)}
      </section>}
      {reply.trace.length > 0 && <Collapsible>
        <CollapsibleTrigger render={<Button variant="outline" className="group h-auto w-full justify-between py-2"/>}><Check data-icon="inline-start"/><span className="flex-1 text-left">{reply.trace.length} evidence checks</span><CaretRight data-icon="inline-end" className="group-data-panel-open:rotate-90"/></CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="flex list-none flex-col gap-3 px-1 pt-3">{reply.trace.map((step, index) => <li className="flex items-start justify-between gap-3 text-xs" key={`${step.tool}-${index}`}><span className="min-w-0 leading-relaxed [overflow-wrap:anywhere]">{step.tool.replaceAll('_', ' ')}</span><Badge variant="secondary">{step.status}</Badge></li>)}</ol>
        </CollapsibleContent>
      </Collapsible>}
      {reply.limitations.length > 0 && <Collapsible>
        <CollapsibleTrigger render={<Button variant="ghost" className="group h-auto w-full justify-between py-2"/>}><span className="whitespace-normal text-left">What this answer cannot establish</span><CaretRight data-icon="inline-end" className="group-data-panel-open:rotate-90"/></CollapsibleTrigger>
        <CollapsibleContent><ul className="flex list-disc flex-col gap-2 pl-5 pt-2 text-xs leading-relaxed text-muted-foreground">{reply.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></CollapsibleContent>
      </Collapsible>}
    </>}
    <ActionBarPrimitive.Root hideWhenRunning className="flex flex-wrap items-center gap-1">
      <ActionBarPrimitive.Copy render={<Button variant="ghost" size="sm"/>} className="asst-copy" aria-label="Copy answer" copiedDuration={1800}><Copy data-icon="inline-start" className="asst-copy-icon"/><Check data-icon="inline-start" className="asst-copied-icon"/><span className="asst-copy-label">Copy</span><span className="asst-copied-label">Copied</span></ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload render={<Button variant="ghost" size="sm"/>} aria-label="Retry this evidence check"><ArrowCounterClockwise data-icon="inline-start"/>Retry</ActionBarPrimitive.Reload>
      {typeof metadata.elapsedMs === 'number' && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{(metadata.elapsedMs / 1000).toFixed(1)}s</span>}
      <BranchPickerPrimitive.Root hideWhenSingleBranch className="flex items-center gap-1 text-xs text-muted-foreground">
        <BranchPickerPrimitive.Previous render={<Button variant="ghost" size="icon-sm"/>} aria-label="Previous reply version"><CaretLeft/></BranchPickerPrimitive.Previous>
        <span><BranchPickerPrimitive.Number/>/<BranchPickerPrimitive.Count/></span>
        <BranchPickerPrimitive.Next render={<Button variant="ghost" size="icon-sm"/>} aria-label="Next reply version"><CaretRight/></BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>
    </ActionBarPrimitive.Root>
  </MessagePrimitive.Root>;
}

function ModeBadge({mode}: {mode: CopilotResponse['mode']}) {
  return <Badge variant={mode === 'openai' ? 'secondary' : 'outline'} className="ml-auto">{mode === 'openai' ? 'AI assisted' : mode === 'fallback' ? 'Local fallback' : 'Local summary'}</Badge>;
}

function EvidenceComposer() {
  const length = useAuiState(state => state.composer.text.length);
  return <ComposerPrimitive.Root>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="evidence-assistant-question" className="sr-only">Ask about the selected evidence</FieldLabel>
        <InputGroup>
          <ComposerPrimitive.Input render={<InputGroupTextarea className="min-h-20 max-h-40"/>} id="evidence-assistant-question" placeholder="Ask about the selected evidence…" maxLength={1200} rows={2} submitMode="enter" unstable_insertNewlineOnTouchEnter addAttachmentOnPaste={false} unstable_focusOnThreadSwitched={false} aria-describedby="assistant-input-help"/>
          <InputGroupAddon align="block-end" className="justify-between">
            <span id="assistant-input-help" className="max-w-48 text-xs leading-relaxed font-normal">{length > 1000 ? `${length}/1,200 characters` : 'Enter to send · Shift + Enter for a new line'}</span>
            <AuiIf condition={state => !state.thread.isRunning}><ComposerPrimitive.Send render={<Button size="icon"/>} aria-label="Ask evidence assistant"><ArrowUp/></ComposerPrimitive.Send></AuiIf>
            <AuiIf condition={state => state.thread.isRunning}><ComposerPrimitive.Cancel render={<Button variant="secondary" size="icon"/>} aria-label="Stop waiting for this reply"><Stop/></ComposerPrimitive.Cancel></AuiIf>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </FieldGroup>
  </ComposerPrimitive.Root>;
}

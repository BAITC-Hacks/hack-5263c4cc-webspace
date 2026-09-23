# Global evidence assistant: implementation research

Research date: 23 September 2026. Scope: the installed `@assistant-ui/react` 0.15.21 and its resolved `@assistant-ui/core` source, official assistant-ui documentation, and the Money Graph methodology and architecture. Exa reviewed ten search results across two search workstreams; implementation recommendations below use only official documentation and installed package source. This is an API audit and design recommendation, not a claim that a prototype has passed interaction testing.

The audit sections preserve the starting implementation. The final implementation appendix below supersedes their original memory limitation and tool count.

## Recommended shape

Keep one `AssistantRuntimeProvider` mounted above the workbench and assistant presentation. Mount the visible assistant in a global Base UI Sheet/Dialog with a persistent header entry point and an expanded workspace mode. Keep the same provider when the panel closes or expands. This preserves messages, composer drafts, branches, and conversations while the analyst navigates accounts.

Use assistant-ui's maintained Thread, ThreadList, Composer, ActionBar, and BranchPicker patterns; keep the project's Base UI components and Phosphor icons. Do not create a second conversation-state implementation. The official copied Thread component is the reference for complete chat composition and supports the Base UI registry flavor. The ready-made AssistantModal is a floating support widget with internally owned open state; a globally controlled evidence workspace needs a small application shell around the same primitives. [Thread component](https://www.assistant-ui.com/docs/ui/thread), [Assistant modal](https://www.assistant-ui.com/docs/ui/assistant-modal).

The live `base-nova` registry responses were fetched directly: Thread, ThreadList, AssistantModal, ToolFallback, and ToolGroup all still declare `lucide-react`. AssistantModal correctly uses `@base-ui/react/popover`. Therefore use these maintained compositions as the source, but replace the copied Lucide icon imports with the existing Phosphor equivalents; the registry flavor alone does not enforce the project's icon choice. The fetched component files now use `components/assistant-ui/elements/*.aui.tsx`, while some documentation still shows the older flat component paths. [Thread registry](https://r.assistant-ui.com/styles/base-nova/thread.json), [ThreadList registry](https://r.assistant-ui.com/styles/base-nova/thread-list.json), [AssistantModal registry](https://r.assistant-ui.com/styles/base-nova/assistant-modal.json).

The research recommendation is session-only history by default. Account evidence should not acquire browser persistence merely as an incidental UI change. Existing deterministic analysis, fixed-scope API requests, seven bounded read tools, and required CSVs remain the authority; conversation history is an interface feature, not additional model authorization.

## Installed runtime behavior: cloud is not required

`useLocalRuntime(modelAdapter, { maxSteps: 1 })` already creates a multi-thread runtime in the installed version. Its source calls `useRemoteThreadListRuntime` with the adapter returned by `useCloudThreadListAdapter`. With no explicit cloud and no `NEXT_PUBLIC_ASSISTANT_BASE_URL`, the adapter is an `InMemoryThreadListAdapter`. This supports runtime-managed creation, switching, rename, archive, delete, and custom metadata without credentials or network persistence.

The in-memory adapter's mutation methods are no-ops because the surrounding runtime owns the live metadata. `generateTitle` yields an empty stream; set a deterministic local title explicitly. `list()` returns an empty list and `fetch()` rejects unknown IDs: this adapter is not durable storage, and reloading the thread list is not a persistence mechanism. Messages live in the per-thread runtimes for the lifetime of the provider.

Some current web documentation summarizes multi-thread setup in terms of managed cloud or a custom remote adapter. The inspected installed implementation is more specific and is the authority for this build. [LocalRuntime documentation](https://www.assistant-ui.com/docs/runtimes/custom/local-runtime), [Threads documentation](https://www.assistant-ui.com/docs/runtimes/concepts/threads).

Audited implementation paths:

- `web/node_modules/@assistant-ui/core/src/react/runtimes/useLocalRuntime.ts`
- `web/node_modules/@assistant-ui/core/src/react/runtimes/cloud/createCloudThreadListAdapter.ts`
- `web/node_modules/@assistant-ui/core/src/runtimes/remote-thread-list/adapter/in-memory.ts`
- `web/node_modules/@assistant-ui/core/src/react/runtimes/RemoteThreadListHookInstanceManager.tsx`

## Exact conversation APIs

These are exported runtime APIs in the installed package:

```ts
await runtime.threads.switchToNewThread();
const id = runtime.threads.getState().mainThreadId;
const item = runtime.threads.getItemById(id);
await item.initialize();
await item.updateCustom({ gid, gids });
await item.rename(title);

await item.switchTo();
await item.archive();
await item.unarchive();
await item.delete();
```

Capture the item by ID before awaiting work. `runtime.threads.mainItem` follows the current selection and can refer to another thread after the user switches. Both `rename` and `updateCustom` throw for an uninitialized item with status `new`; initialize first. A single initialization call is safe for an already initialized item. Custom metadata is replaced, so write the complete validated scope object.

The equivalent scoped client form is `aui.threads.item({ id }).rename(title)`. `useAuiState` reads state reactively. Thread list primitives provide new-thread creation, item context, switching, title, archive, and delete. Inline rename uses the runtime API; there is no `ThreadListItemPrimitive.Rename` export. [Thread list](https://www.assistant-ui.com/docs/ui/thread-list), [ThreadList primitives](https://www.assistant-ui.com/docs/primitives/thread-list).

```tsx
<ThreadListPrimitive.Root>
  <ThreadListPrimitive.New>New conversation</ThreadListPrimitive.New>
  <ThreadListPrimitive.Items>
    {() => (
      <ThreadListItemPrimitive.Root>
        <ThreadListItemPrimitive.Trigger>
          <ThreadListItemPrimitive.Title fallback="New conversation" />
        </ThreadListItemPrimitive.Trigger>
        <ThreadListItemPrimitive.Delete>Delete</ThreadListItemPrimitive.Delete>
      </ThreadListItemPrimitive.Root>
    )}
  </ThreadListPrimitive.Items>
</ThreadListPrimitive.Root>
```

Use the existing Base UI menu for overflow actions. The `ThreadListItemMorePrimitive` family is documented as Radix-based; it is unnecessary for this project's Base UI requirement.

## Bind evidence scope to the conversation

Graph selection and conversation scope should be separate state. The visible scope label must describe the account and cohort actually used by that conversation. Starting an account-scoped conversation fixes its validated account IDs; later graph navigation must not retarget old prompts or regenerate them against a new account.

Two compatible implementation options:

1. Keep plain `useLocalRuntime` and an application-owned map of thread ID to immutable validated scope. `ChatModelAdapter.run` receives `unstable_threadId?: string`; fail closed if the ID or scope is missing. Capture the scope before the network request. The default in-memory adapter uses the local thread ID as remote ID. Explicitly initialize and bind the scope before enabling the composer. The field is marked unstable, so test its first-message behavior against the installed version.
2. Explicitly wrap `useRemoteThreadListRuntime` around a per-thread `useLocalRuntime`, with one stable `new InMemoryThreadListAdapter()` instance. Its `runtimeHook` executes in the individual thread's context. Read `aui.threadListItem.getState().custom` in that scoped adapter at run start, validate it, and copy it into the request. This avoids using the global selected thread to resolve an asynchronous request's scope.

`InMemoryThreadListAdapter`, `useRemoteThreadListRuntime`, `useLocalRuntime`, and `useAui` are all exported from `@assistant-ui/react`. The explicit wrapper does not double-nest lists: `useLocalRuntime` enables `allowNesting`, so it supplies only the local thread inside an existing thread-list context.

Do not pass arbitrary thread metadata directly into a privileged request. Validate safe integer account IDs, membership in the loaded dataset, cohort deduplication, and the existing maximum of five comparison entities. Preserve the current 1–1,200 character question limit. The server still authorizes and bounds evidence independently. Store a scope snapshot in each response's metadata for provenance. [Threads and custom metadata](https://www.assistant-ui.com/docs/runtimes/concepts/threads).

Creating an entirely separate runtime for every conversation and maintaining a parallel application history could work if all runtimes remained mounted, but it duplicates lifecycle, branching, deletion, and selection handling already provided by the library. It is not needed here.

## Editing, regenerate, and branches

LocalRuntime implements message editing, reload, cancellation, and alternate branches. Expose these through its primitives:

```tsx
<ThreadPrimitive.Messages>
  {({ message }) => {
    if (message.composer.isEditing) return <EditComposer />;
    return message.role === "user" ? <UserMessage /> : <AssistantMessage />;
  }}
</ThreadPrimitive.Messages>
```

Within a user message's `MessagePrimitive.Root`, `ActionBarPrimitive.Edit` enters its edit composer. Render `ComposerPrimitive.Root`, `.Input`, `.Send`, and `.Cancel` within that message context. Within an assistant message use `ActionBarPrimitive.Copy` and `.Reload`. Put `BranchPickerPrimitive.Root hideWhenSingleBranch` with `.Previous`, `.Number`, `.Count`, and `.Next` inside each message root. Editing or reloading creates an alternate branch and leaves the previous version available. The render-function form of `ThreadPrimitive.Messages` is preferred over its deprecated `components` prop. [Branching guide](https://www.assistant-ui.com/docs/guides/branching), [BranchPicker](https://www.assistant-ui.com/docs/primitives/branch-picker), [Thread primitives](https://www.assistant-ui.com/docs/primitives/thread).

The backend currently receives an independent latest question, not the full conversational history. Keep the interface explicit about that capability, or implement separately validated bounded history before claiming conversational memory. Editing and regenerate can work with independent questions without changing tool permissions.

## Rich results and honest tool activity

The adapter can return ordinary text plus typed parts or validated response metadata. Use structured cards for numerical evidence, role fit, hypotheses, missing evidence, citations, and navigation actions. Keep those concepts visibly distinct. A citation click can focus an existing account through application code; it must not derive authorization from model-generated text.

For actual server tool traces, `makeAssistantToolUI<Args, Result>({ toolName, render })` registers a UI-only renderer. Mount that registration within `AssistantRuntimeProvider`; return tool parts with `type: "tool-call"`, a stable `toolCallId`, the exact backend `toolName`, `args`, `argsText`, and the completed `result`. Do not register browser execution with `makeAssistantTool` for the seven server-only read tools. [Tool UI guide](https://www.assistant-ui.com/docs/guides/tool-ui).

For structured evidence pushed by the backend, data parts are semantically cleaner than inventing a tool invocation:

```ts
{
  content: [
    { type: "text", text: response.answer },
    { type: "data", name: "evidence", data: response },
  ],
}
```

Register `makeAssistantDataUI({ name: "evidence", render })`, or keep the existing typed `metadata.custom.evidence` renderer. Neither approach requires model-authored UI code. Only show tool progress the API actually supplies; a completed JSON request cannot honestly provide live per-tool execution progress. While waiting, show one request-level working state and a working stop control. [Data-part and tool rendering](https://www.assistant-ui.com/docs/guides/tool-ui).

## Scrolling and presentation

Use `ThreadPrimitive.Root` with a bounded flex height, `min-height: 0` on flexible ancestors, a scrolling `.Viewport`, and a `.ViewportFooter` containing the composer. The footer registers its height with the viewport. For a ChatGPT-like question-at-top layout use `turnAnchor="top"`; its default `autoScroll` is false, and new-run/thread-switch scroll behavior has separate options. Include `.ScrollToBottom` for returning to the latest response after reading earlier evidence. Do not add a competing imperative scrolling loop. [Viewport behavior](https://www.assistant-ui.com/docs/primitives/thread).

The assistant shell should expose a clearly named global trigger, history/new conversation, current account scope, expand/restore, and close. On narrow screens use the full available viewport; let the thread own vertical scrolling and preserve an accessible composer. Expansion changes layout state rather than the runtime key. The outer Base UI dialog owns focus, Escape, accessible title, and focus restoration; assistant-ui owns chat behavior.

## Focused acceptance checks

- Open, send, close, navigate, and reopen: history and draft survive.
- Create A for one account and B for another; switch while A runs: results and scopes remain attached to the correct conversation.
- Edit and regenerate a past question after changing graph selection: both use the original conversation scope and preserve alternate branches.
- Rename, delete the current thread, delete a background running thread, and start another: no orphaned selection or stale response appears.
- Cancel and immediately retry: cancelled work does not overwrite the new response.
- Read earlier messages during a response and expand/restore the assistant: scrolling and composer access remain usable.
- Offline mode works without API credentials or assistant-cloud; no graph scoring or CSV contract changes.

Run backend tests and the frontend production build for the final implementation as required by AGENTS.md. Interaction checks should exercise these user-visible outcomes rather than mirror component internals.

## Current implementation appendix — 23 September 2026

This appendix records the implemented source after the research above. It supersedes the earlier snapshot's independent-question limitation and seven-tool count: the backend now provides bounded conversation context and eight fixed read tools, including `inspect_investigation_brief`. The [architecture](../architecture.md) defines their authorization and execution limits. This source inventory does not by itself establish that every acceptance check above has passed.

`AssistantWorkspace.tsx` mounts the lazy `AssistantRuntime.tsx` once the assistant is first requested and keeps it mounted while closed. `App.tsx` places this provider above the application shell. The header, sidebar and Cmd/Ctrl+J open the same workspace; contextual ask actions create a conversation with an account, comparison scope and prefilled question. On desktop the presentation switches between a right-side dock and an expanded Base UI Sheet; below 768px it uses a full-viewport Sheet. The evidence inspector no longer owns the conversation runtime. Opening the assistant closes a mobile/tablet evidence Sheet to keep its composer reachable.

The runtime explicitly wraps a per-thread `useLocalRuntime` with `useRemoteThreadListRuntime` and one `InMemoryThreadListAdapter`. Each initialized thread receives validated `{ gid, gids }` metadata before its composer becomes available. Each run reads that thread's own metadata, preserving its scope when the analyst selects another account or switches conversations. The server independently validates dataset membership and the comparison limit. A visible account label and “Use entity …” action distinguish existing conversation scope from a changed workspace selection.

History supports searching by title or account, switching, creating, renaming and confirmed deletion, with a maximum of 30 visible conversations per browser session. New titles are deterministic; no model title generation is required. Conversation JSON export contains the active branch's displayed messages, scope and public response metadata. It does not export the private session token or every alternate branch. Deleting a conversation cancels browser waiting, requests deletion of its server context, and only then removes the local thread; a deletion failure remains visible and retryable.

`AssistantPanel.tsx` uses the maintained message, composer, action-bar and branch primitives. User messages expose copy, edit and resend; replies expose copy, retry and alternate versions. The viewport owns scrolling, with a footer composer and a return-to-latest control. The request shows a working state and a stop control. Cancellation stops browser waiting; already-running synchronous server or provider work may finish independently. There is no simulated token streaming or invented live tool progress.

Completed replies render the server's actual mode, Markdown answer, validated evidence references, completed evidence checks, limitations and execution metadata. Account citations navigate within the workbench; mobile navigation closes the assistant and expanded desktop navigation returns it to the dock. Generated Markdown links are inert, and HTML/images are disabled. Local summaries and degraded fallback have explicit labels. Credential-free local operation remains available; free-form contextual follow-ups require the optional AI connection.

`assistant-session.ts` privately maps each browser thread to a server session capability. It obtains that capability from `POST /api/copilot/sessions` before sending the first question, then submits `remember: true` with the token. Visible chats, drafts and capabilities remain in browser memory and disappear on refresh. Server context is separately bounded to six messages and 12,000 characters, scoped to the account, cohort and dataset/code version, with a 24-hour lifetime and at most 128 sessions. It is process-local by default; optional SQLite persistence does not restore browser history or provide cross-device chat. Expiry is enforced on store operations, not a timed physical-erasure guarantee.

Editing or retrying an earlier branch, or continuing after an uncertain interrupted request, resets the corresponding server context before the new run. The interface marks a reply that starts with fresh context. Expired or incompatible sessions require a new conversation. Context supports follow-up interpretation; every answer still needs current bounded evidence, and an old citation is not evidence for a new run. Session capabilities stay outside assistant-ui message metadata, browser storage and exported transcripts.

The current implementation files are `web/src/AssistantWorkspace.tsx`, `web/src/AssistantRuntime.tsx`, `web/src/AssistantPanel.tsx`, `web/src/assistant-session.ts` and `web/src/assistant-panel.css`. The visual system and responsive composition are recorded in [DESIGN.md](../../DESIGN.md); backend memory and execution guarantees remain in [architecture.md](../architecture.md).

import type { Gid } from "@/api";
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ChatCircleTextIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export type EvidenceScope = { gid: Gid; gids: Gid[] };
export type AssistantRequest = {
  sequence: number;
  scope: EvidenceScope | null;
  prompt?: string;
  newChat?: boolean;
};
type OpenOptions = {
  expanded?: boolean;
  gid?: Gid;
  gids?: Gid[];
  prompt?: string;
  newChat?: boolean;
};
type WorkspaceContext = {
  open: boolean;
  expanded: boolean;
  openAssistant: (options?: OpenOptions) => void;
  closeAssistant: () => void;
};
const Context = createContext<WorkspaceContext | null>(null);
const AssistantRuntime = lazy(() => import("./AssistantRuntime"));

export function useAssistantWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("Assistant workspace is unavailable.");
  return context;
}

export function AssistantWorkspaceProvider({
  children,
  selected,
  cohort,
  onSelect,
  onOpen,
}: {
  children: ReactNode;
  selected: Gid | null;
  cohort: Gid[];
  onSelect: (gid: Gid) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [request, setRequest] = useState<AssistantRequest | null>(null);
  const sequence = useRef(0);
  const openAssistant = useCallback(
    (options: OpenOptions = {}) => {
      const gid = options.gid ?? selected;
      onOpen();
      setExpanded(options.expanded ?? false);
      setOpen(true);
      setRequest({
        sequence: ++sequence.current,
        scope: gid === null ? null : { gid, gids: options.gids ?? cohort },
        prompt: options.prompt,
        newChat:
          options.newChat || options.gid !== undefined || !!options.prompt,
      });
    },
    [selected, cohort, onOpen],
  );
  const closeAssistant = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Open Aqsha assistant"]')
        ?.focus(),
    );
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        if (open) setOpen(false);
        else openAssistant();
      }
      if (
        event.key === "Escape" &&
        open &&
        !expanded &&
        !document.querySelector('[data-slot="dropdown-menu-content"]')
      )
        setOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [open, expanded, openAssistant]);
  return (
    <Context.Provider value={{ open, expanded, openAssistant, closeAssistant }}>
      {children}
      {request && (
        <Suspense
          fallback={
            open ? (
              <div
                role="status"
                className="fixed right-5 bottom-5 z-40 rounded-xl border bg-card px-5 py-4 shadow-lg"
              >
                Opening Aqsha assistant…
              </div>
            ) : null
          }
        >
          <AssistantRuntime
            open={open}
            expanded={expanded}
            setExpanded={setExpanded}
            close={closeAssistant}
            request={request}
            selection={
              selected === null ? null : { gid: selected, gids: cohort }
            }
            onSelect={onSelect}
          />
        </Suspense>
      )}
    </Context.Provider>
  );
}

export function AssistantTrigger() {
  const { openAssistant, open } = useAssistantWorkspace();
  return (
    <Button
      onClick={() => openAssistant()}
      aria-label="Open Aqsha assistant"
      aria-expanded={open}
      aria-keyshortcuts="Control+j Meta+j"
      className="gap-2"
    >
      <ChatCircleTextIcon weight="duotone" />
      <span className="hidden min-[420px]:inline">Ask Aqsha</span>
      <kbd className="hidden rounded border border-primary-foreground/20 px-1 text-[10px] text-primary-foreground/70 xl:inline">
        ⌘ J
      </kbd>
    </Button>
  );
}

export function AskEvidenceAction({
  gid,
  gids,
  prompt,
  children,
  disabled = false,
}: {
  gid?: Gid;
  gids?: Gid[];
  prompt: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { openAssistant } = useAssistantWorkspace();
  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={() => openAssistant({ gid, gids, prompt })}
    >
      <ChatCircleTextIcon />
      {children}
    </Button>
  );
}

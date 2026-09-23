import { CaretRight, DownloadSimple, Fingerprint, ShieldCheck } from "@phosphor-icons/react";
import type { CopilotReply } from "@/api";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { downloadEvidencePacket } from "@/evidence-packet";

export function EvidencePacketButton({ reply }: { reply: CopilotReply }) {
  return <Button variant="ghost" size="sm" onClick={() => downloadEvidencePacket(reply)}
    aria-label="Download evidence packet" title="Answer, checked fields, source snapshots, and provenance">
    <DownloadSimple /> Evidence
  </Button>;
}

export function CheckedObservations({ reply }: { reply: CopilotReply }) {
  if (!reply.observations?.length) return null;
  return <Collapsible className="my-3 rounded-xl border bg-muted/20">
    <CollapsibleTrigger render={<Button variant="ghost" className="group h-auto w-full justify-start px-3 py-2" />}>
      <ShieldCheck className="text-primary" />
      <span>{reply.observations.length} checked {reply.observations.length === 1 ? "field" : "fields"}</span>
      <CaretRight className="ml-auto group-data-panel-open:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent className="px-3 pb-3">
      <dl className="divide-y">
        {reply.observations.map((observation) => <div key={`${observation.evidence_id}:${observation.path}`} className="py-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <dt>{observation.label}</dt>
            <dd className="break-all font-medium tabular-nums">{observation.value}{observation.unit ? ` ${observation.unit}` : ""}</dd>
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">{observation.evidence_id} · {observation.path}</p>
        </div>)}
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">These fields match retrieved evidence. The answer’s interpretation still needs review.</p>
    </CollapsibleContent>
  </Collapsible>;
}

export function SourceSnapshot({ citation }: { citation: CopilotReply["citations"][number] }) {
  if (!citation.source) return null;
  return <Collapsible className="mt-2">
    <CollapsibleTrigger render={<Button variant="outline" size="sm" className="group" />}>
      <Fingerprint /> Source snapshot
      <CaretRight className="group-data-panel-open:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2 space-y-2">
      <p className="text-xs leading-relaxed text-muted-foreground">The bounded evidence retrieved for this answer. Omitted examples and observation limits remain part of the source.</p>
      <pre tabIndex={0} aria-label={`Source snapshot ${citation.label ?? "evidence"}`} className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">{JSON.stringify(citation.source, null, 2)}</pre>
      {citation.payload_sha256 && <p className="break-all text-xs text-muted-foreground">Source SHA-256: {citation.payload_sha256}</p>}
      {citation.evidence_version && <p className="break-all text-xs text-muted-foreground">Evidence version: {citation.evidence_version}</p>}
    </CollapsibleContent>
  </Collapsible>;
}

import type { CopilotReply } from "./api";

/** Explicit public export contract: no conversation capability or memory state. */
export function evidencePacket(reply: CopilotReply, createdAt = new Date().toISOString()) {
  return {
    schema_version: 1,
    created_at: createdAt,
    review_status: "unreviewed",
    mode: reply.mode,
    answer: reply.answer,
    citations: reply.citations.map(({ label, gid, text, kind, evidence_version, payload_sha256, source, source_json }) =>
      ({ label, gid, text, kind, evidence_version, payload_sha256, source, source_json })),
    observations: reply.observations ?? [],
    grounding: reply.grounding ?? null,
    limitations: reply.limitations,
    checks: reply.trace,
    execution: reply.execution,
    local_workflow: reply.local_workflow,
    source_hash_format: "SHA-256 of exact UTF-8 source_json string bytes. This canonical source preserves integer/float formatting across browser exports; do not reserialize source or hash the formatted packet bytes.",
  };
}

export function downloadEvidencePacket(reply: CopilotReply) {
  const content = JSON.stringify(evidencePacket(reply), null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aqsha-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  // Keep the object URL alive while the browser starts the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

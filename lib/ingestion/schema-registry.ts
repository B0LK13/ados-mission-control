import type { ParseWarning } from "@/lib/broker/io";

/**
 * Allowlisted ADOS input families validated during live ingest.
 * Records always pass through; failures become INVALID_RECORD warnings only.
 * Schema validation never upgrades authority and never fabricates fields.
 */
export type InputRecordKind =
  | "ledger-event"
  | "approval-disposition"
  | "approval-consumption"
  | "approval-file"
  | "orchestrator-lease"
  | "agent-sessions"
  | "project-state"
  | "worktree-registry"
  | "dispatch-state"
  | "task-contract"
  | "campaign"
  | "owner-gate";

export type InputValidationWarning = ParseWarning;

/** Documented allowlist — keep in sync with schemas/input/v2/*.schema.json */
export const INPUT_SCHEMA_FAMILIES: ReadonlyArray<{
  kind: InputRecordKind;
  schemaFile: string;
  typicalSources: string[];
}> = [
  { kind: "ledger-event", schemaFile: "schemas/input/v2/ledger-event.schema.json", typicalSources: ["state/event-ledger.jsonl"] },
  { kind: "approval-disposition", schemaFile: "schemas/input/v2/approval-disposition.schema.json", typicalSources: ["state/approvals.jsonl"] },
  { kind: "approval-consumption", schemaFile: "schemas/input/v2/approval-consumption.schema.json", typicalSources: ["state/approval-consumptions.jsonl"] },
  { kind: "approval-file", schemaFile: "schemas/input/v2/approval-file.schema.json", typicalSources: ["handoffs/owner/approvals/*.json"] },
  { kind: "orchestrator-lease", schemaFile: "schemas/input/v2/orchestrator-lease.schema.json", typicalSources: ["state/orchestrator-lease.json"] },
  { kind: "agent-sessions", schemaFile: "schemas/input/v2/agent-sessions.schema.json", typicalSources: ["state/agent-sessions.json"] },
  { kind: "project-state", schemaFile: "schemas/input/v2/project-state.schema.json", typicalSources: ["state/project-state.json"] },
  { kind: "worktree-registry", schemaFile: "schemas/input/v2/worktree-registry.schema.json", typicalSources: ["state/worktree-registry.json"] },
  { kind: "dispatch-state", schemaFile: "schemas/input/v2/dispatch-state.schema.json", typicalSources: ["state/wave-0-dispatch-state.json"] },
  { kind: "task-contract", schemaFile: "schemas/input/v2/task-contract.schema.json", typicalSources: ["handoffs/*/inbox/*.json"] },
  { kind: "campaign", schemaFile: "schemas/input/v2/campaign.schema.json", typicalSources: ["state/campaigns/**", "state/campaigns.jsonl"] },
  { kind: "owner-gate", schemaFile: "schemas/input/v2/owner-gate.schema.json", typicalSources: ["state/owner-gates.jsonl", "handoffs/owner/inbox/*.json"] },
];

const supportedVersions = new Set(["legacy-v1", "1", "1.0", "1.0.0", "1.1", "1.1.0", "2", "2.0", "2.0.0"]);

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function detectedVersion(record: Record<string, unknown>): string {
  const value = record.schemaVersion ?? record.version;
  return typeof value === "string" || typeof value === "number" ? String(value) : "legacy-v1";
}

function warn(
  warnings: InputValidationWarning[],
  source: string,
  line: number,
  message: string,
): void {
  warnings.push({ code: "INVALID_RECORD", source, line, message });
}

function validateKindShape(
  kind: InputRecordKind,
  record: Record<string, unknown>,
  source: string,
  line: number,
  warnings: InputValidationWarning[],
): void {
  switch (kind) {
    case "ledger-event": {
      const version = detectedVersion(record);
      const legacyEventId = version.startsWith("1.") && nonEmptyString(record.eventId);
      if (typeof record.sequence !== "number" && !legacyEventId) {
        warn(warnings, source, line, "Ledger event is missing a numeric sequence or legacy event identifier.");
      }
      if (!nonEmptyString(record.eventType) && !nonEmptyString(record.type)) {
        warn(warnings, source, line, "Ledger event is missing an event type.");
      }
      return;
    }
    case "approval-disposition":
    case "approval-consumption":
    case "approval-file": {
      if (!nonEmptyString(record.approvalId) && !nonEmptyString(record.id)) {
        warn(warnings, source, line, `${kind} is missing an approval identifier.`);
      }
      return;
    }
    case "orchestrator-lease": {
      if (!nonEmptyString(record.leaseId) && !nonEmptyString(record.id)) {
        warn(warnings, source, line, "Orchestrator lease is missing leaseId.");
      }
      if (!nonEmptyString(record.orchestrator) && !nonEmptyString(record.provider)) {
        warn(warnings, source, line, "Orchestrator lease is missing orchestrator/provider.");
      }
      return;
    }
    case "agent-sessions": {
      if (record.sessions == null || typeof record.sessions !== "object" || Array.isArray(record.sessions)) {
        warn(warnings, source, line, "Agent sessions document is missing a sessions object.");
      }
      return;
    }
    case "project-state": {
      // Soft document: any object is accepted; empty objects warn for operator attention.
      if (!Object.keys(record).length) {
        warn(warnings, source, line, "Project state document is empty.");
      }
      return;
    }
    case "worktree-registry": {
      if (record.worktrees != null && !Array.isArray(record.worktrees)) {
        warn(warnings, source, line, "Worktree registry worktrees field must be an array when present.");
      }
      return;
    }
    case "dispatch-state": {
      // Soft document — presence of unexpected productionDispatch flags is a detector concern, not schema.
      if (Array.isArray(record)) {
        warn(warnings, source, line, "Dispatch state must be an object, not an array.");
      }
      return;
    }
    case "task-contract": {
      if (!nonEmptyString(record.taskId) && !nonEmptyString(record.id)) {
        warn(warnings, source, line, "Task contract is missing taskId.");
      }
      return;
    }
    case "campaign": {
      if (!nonEmptyString(record.campaignId) && !nonEmptyString(record.id)) {
        warn(warnings, source, line, "Campaign record is missing campaignId.");
      }
      return;
    }
    case "owner-gate": {
      if (!nonEmptyString(record.gateId) && !nonEmptyString(record.id)) {
        warn(warnings, source, line, "Owner-gate record is missing gateId.");
      }
      return;
    }
    default: {
      const _exhaustive: never = kind;
      warn(warnings, source, line, `Unknown input kind ${_exhaustive}.`);
    }
  }
}

/**
 * Validate allowlisted input records. Always returns the original records
 * (malformed shapes are isolated as warnings — never dropped, never rewritten).
 */
export function validateInputRecords(
  kind: InputRecordKind,
  records: Record<string, unknown>[],
  source: string,
): { records: Record<string, unknown>[]; warnings: InputValidationWarning[] } {
  const warnings: InputValidationWarning[] = [];
  records.forEach((record, index) => {
    const line = index + 1;
    const version = detectedVersion(record);
    if (!supportedVersions.has(version)) {
      warn(warnings, source, line, `Unsupported ${kind} schema version '${version}'.`);
    }
    validateKindShape(kind, record, source, line, warnings);
  });
  return { records, warnings };
}

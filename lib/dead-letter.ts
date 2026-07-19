import type {
  FreshnessLabel,
  HandoffItem,
  MissionSnapshot,
  RoutingIncident,
  TaskNode,
  VerificationLabel,
} from "@/lib/contracts";

export type DeadLetterKind =
  | "REPEATED_FAILURE"
  | "TERMINAL_FAILURE"
  | "BLOCKED"
  | "WORKER_UNAVAILABLE"
  | "ROUTING_CONTAINMENT";

export interface DeadLetterItem {
  id: string;
  kind: DeadLetterKind;
  title: string;
  summary: string;
  taskId?: string | null;
  project?: string | null;
  status?: string | null;
  launchCount?: number | null;
  evidencePaths: string[];
  replayHint?: { campaignId?: string | null; runId?: string | null } | null;
  ownerActionRequired: boolean;
  verification: VerificationLabel;
  nextPermittedAction: string;
  source: "task" | "handoff" | "routing-incident";
}

export interface DeadLetterProjection {
  freshness: FreshnessLabel;
  items: DeadLetterItem[];
  summary: {
    repeatedFailures: number;
    terminalFailures: number;
    blocked: number;
    workerUnavailable: number;
    routingContainment: number;
  };
  warnings: string[];
}

function isFailureStatus(status: string): boolean {
  return status === "FAILED" || /FAIL|ERROR/.test(status.toUpperCase());
}

function isBlockedStatus(status: string): boolean {
  return status === "BLOCKED" || status.toUpperCase().includes("BLOCK");
}

function fromTask(task: TaskNode): DeadLetterItem | null {
  const failed = isFailureStatus(task.status);
  const blocked = isBlockedStatus(task.status);
  if (!failed && !blocked) return null;

  const repeated = (task.launchCount ?? 0) >= 2;
  const kind: DeadLetterKind = blocked
    ? "BLOCKED"
    : repeated
      ? "REPEATED_FAILURE"
      : "TERMINAL_FAILURE";

  return {
    id: `task:${task.taskId}`,
    kind,
    title: task.taskId,
    summary: task.objective || task.exitResult || task.nextPermittedAction || "Failure derived from task projection.",
    taskId: task.taskId,
    project: task.project,
    status: task.status,
    launchCount: task.launchCount,
    evidencePaths: task.evidencePaths || [],
    replayHint: null,
    ownerActionRequired: blocked || repeated,
    verification: task.verification,
    nextPermittedAction: task.nextPermittedAction,
    source: "task",
  };
}

function fromHandoff(handoff: HandoffItem): DeadLetterItem | null {
  if (handoff.lifecycleStage !== "WORKER_UNAVAILABLE" && !isBlockedStatus(handoff.status) && !isFailureStatus(handoff.status)) {
    return null;
  }
  // Prefer task-derived rows when the same taskId already appears.
  if (handoff.lifecycleStage !== "WORKER_UNAVAILABLE") return null;
  return {
    id: `handoff:${handoff.handoffId}`,
    kind: "WORKER_UNAVAILABLE",
    title: handoff.title || handoff.handoffId,
    summary: `${handoff.fromAgent} → ${handoff.toAgent} · lifecycle WORKER_UNAVAILABLE`,
    taskId: handoff.taskId,
    project: null,
    status: handoff.status,
    launchCount: null,
    evidencePaths: handoff.path ? [handoff.path] : [],
    replayHint: null,
    ownerActionRequired: true,
    verification: handoff.authority === "AUTHORITATIVE" ? "AUTHORITATIVE" : "DIAGNOSTIC_ONLY",
    nextPermittedAction: "Investigate worker availability under owner-approved scope.",
    source: "handoff",
  };
}

function fromRouting(incident: RoutingIncident): DeadLetterItem {
  return {
    id: `routing:${incident.incidentId}`,
    kind: "ROUTING_CONTAINMENT",
    title: incident.incidentId,
    summary: incident.resolution || `${incident.intendedProject} → ${incident.incorrectRepository}`,
    taskId: null,
    project: incident.intendedProject,
    status: incident.containmentStatus,
    launchCount: null,
    evidencePaths: [],
    replayHint: null,
    ownerActionRequired: incident.ownerDispositionRequired,
    verification: incident.verification,
    nextPermittedAction: incident.ownerDispositionRequired
      ? "Owner disposition required for contained routing incident."
      : "Review containment record; no current owner disposition flagged.",
    source: "routing-incident",
  };
}

/**
 * Derive a dead-letter / chronic-failure surface from an existing snapshot.
 * Never invents tasks — only projects failures already present in the read model.
 */
export function buildDeadLetterProjection(snapshot: MissionSnapshot): DeadLetterProjection {
  const warnings: string[] = [];
  const items: DeadLetterItem[] = [];
  const seenTaskIds = new Set<string>();

  for (const task of snapshot.tasks) {
    const item = fromTask(task);
    if (!item) continue;
    items.push(item);
    if (item.taskId) seenTaskIds.add(item.taskId);
  }

  for (const handoff of snapshot.handoffs) {
    if (handoff.taskId && seenTaskIds.has(handoff.taskId)) continue;
    const item = fromHandoff(handoff);
    if (item) items.push(item);
  }

  // Routing incidents that still need owner disposition surface here as containment backlog.
  for (const incident of snapshot.routingIncidents) {
    if (!incident.ownerDispositionRequired) continue;
    items.push(fromRouting(incident));
  }

  if (!items.length) {
    warnings.push("No dead-letter or repeated-failure records were derived from the current snapshot.");
  }

  const summary = {
    repeatedFailures: items.filter((item) => item.kind === "REPEATED_FAILURE").length,
    terminalFailures: items.filter((item) => item.kind === "TERMINAL_FAILURE").length,
    blocked: items.filter((item) => item.kind === "BLOCKED").length,
    workerUnavailable: items.filter((item) => item.kind === "WORKER_UNAVAILABLE").length,
    routingContainment: items.filter((item) => item.kind === "ROUTING_CONTAINMENT").length,
  };

  return {
    freshness: snapshot.freshness,
    items,
    summary,
    warnings,
  };
}

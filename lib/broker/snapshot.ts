import path from "node:path";
import { getMissionControlConfig } from "@/lib/config";
import type {
  AgentCard,
  ApprovalCard,
  AuditEntry,
  CampaignBudgetSnapshot,
  CampaignCard,
  EventItem,
  EvidenceItem,
  HandoffItem,
  MissionSnapshot,
  NormalizedState,
  OwnerGateCard,
  ProjectCard,
  ProjectClassification,
  RoutingIncident,
  SafetyAlert,
  Severity,
  TaskNode,
  VerificationLabel,
  WorktreeNode,
} from "@/lib/contracts";
import { freshnessFromSnapshot } from "@/lib/data-quality";
import { validateInputRecords } from "@/lib/ingestion/schema-registry";
import { logMissionEvent } from "@/lib/logging";
import { getReadModelStore } from "@/lib/read-model/sqlite-store";
import { disabledReadModelStatus, type IngestWatermark } from "@/lib/read-model/store";
import { isPhase2CommandsEnabled } from "@/lib/commands/ados-bridge";
import { redactValue, safeSummary } from "@/lib/redaction";
import {
  exists,
  listFileMetadata,
  listJsonFiles,
  readJson,
  readJsonLines,
  resolveWithinRoot,
  type ParseWarning,
} from "./io";
import { computeHeartbeatAge } from "./heartbeat";

function snapshotCapabilities(): MissionSnapshot["capabilities"] {
  const phase2Commands = isPhase2CommandsEnabled();
  const ownerSigningConfigured = Boolean(process.env.MISSION_CONTROL_OWNER_PUBKEY_PATH?.trim());
  return {
    phase2Commands,
    ownerSigningConfigured,
    mutationsEnabled: phase2Commands,
  };
}

export { computeHeartbeatAge } from "./heartbeat";

const AGENTS = ["cursor", "kimi", "claude", "codex"] as const;
const BLOCKING_TOKENS = ["BLOCKED", "FROZEN", "UNAVAILABLE", "AWAITING"];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function strings(value: unknown): string[] {
  return array(value)
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => safeSummary(item, ""));
}

function text(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return safeSummary(value, key);
    if (typeof value === "number") return String(value);
  }
  return "";
}

function flag(source: Record<string, unknown>, key: string, fallback = false): boolean {
  return typeof source[key] === "boolean" ? source[key] : fallback;
}

function numeric(source: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function pathName(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).at(-1) || value;
}

function isExpired(expiresAt: string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry <= now.getTime();
}

export function normalizeState(value: unknown): NormalizedState {
  const state = typeof value === "string" ? value.toUpperCase() : "";
  if (state.includes("REVOK")) return "REVOKED";
  if (state.includes("DENIED") || state.includes("REJECT")) return "DENIED";
  if (state.includes("SUPERSEDE")) return "SUPERSEDED";
  if (state.includes("CONSUM")) return "CONSUMED";
  if (state.includes("EXPIRE")) return "EXPIRED";
  if (state.includes("FAIL") || state.includes("ERROR")) return "FAILED";
  if (state.includes("BLOCK") || state.includes("UNAVAILABLE")) return "BLOCKED";
  if (state.includes("COMPLETE") || state.includes("SUCCESS") || state.includes("VALIDATED") || state.includes("ARCHIVED")) return "COMPLETED";
  if (state.includes("RUNNING") || state.includes("IN_PROGRESS") || state === "ACTIVE" || state.includes("DISPATCHED")) return "RUNNING";
  if (state.includes("APPROV") || state.includes("AUTHORIZ")) return "APPROVED";
  if (state.includes("PENDING") || state.includes("READY") || state.includes("DRAFT") || state.includes("NOT_STARTED")) return "PENDING";
  return "UNKNOWN";
}

function normalizeSeverity(value: unknown): Severity {
  const severity = typeof value === "string" ? value.toUpperCase() : "";
  if (severity.includes("CRITICAL") || severity.includes("FATAL")) return "CRITICAL";
  if (severity.includes("BLOCK")) return "BLOCKED";
  if (severity.includes("WARN") || severity.includes("ATTENTION") || severity.includes("NOTICE")) return "WARNING";
  if (severity.includes("SUCCESS") || severity.includes("PASS") || severity.includes("NOMINAL")) return "SUCCESS";
  return "INFO";
}

function processIsAlive(processId: string, sourceRoot: string): boolean | null {
  if (process.platform !== "win32" || sourceRoot.startsWith("/data/")) return null;
  const numericId = Number(processId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  try {
    process.kill(numericId, 0);
    return true;
  } catch {
    return false;
  }
}

function detectDispatch(value: unknown, depth = 0): boolean | null {
  if (depth > 6 || !value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (["productiondispatch", "productiondispatchenabled", "dispatchenabled"].includes(key.toLowerCase())) {
      if (typeof child === "boolean") return child;
      if (typeof child === "string") {
        if (["ENABLED", "ACTIVE", "ON", "TRUE"].includes(child.toUpperCase())) return true;
        if (["DISABLED", "FROZEN", "OFF", "FALSE"].includes(child.toUpperCase())) return false;
      }
    }
    const nested = detectDispatch(child, depth + 1);
    if (nested !== null) return nested;
  }
  return null;
}

function detectRemote(project: Record<string, unknown>): boolean {
  const remote = project.remote;
  if (typeof remote === "boolean") return remote;
  if (typeof remote === "string") return !["", "NONE", "UNCONFIGURED", "NOT_CONFIGURED", "FALSE"].includes(remote.toUpperCase());
  if (remote && typeof remote === "object") {
    const remoteRecord = record(remote);
    if (typeof remoteRecord.configured === "boolean") return remoteRecord.configured;
    return ["url", "name", "origin"].some((key) => typeof remoteRecord[key] === "string" && remoteRecord[key]);
  }
  return false;
}

function countStates(items: Array<{ status: string }>): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
}

function targetSummary(target: Record<string, unknown>): string {
  const values = Object.entries(target).flatMap(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [`${key}: ${value}`];
    if (Array.isArray(value)) return [`${key}: ${value.filter((item) => typeof item === "string").join(", ")}`];
    return [];
  });
  return safeSummary(values.join(" · "), "Target not specified.", 320);
}

export function normalizeApprovalRecords(
  fileRecords: Record<string, unknown>[],
  ledgerRecords: Record<string, unknown>[],
  consumptionRecords: Record<string, unknown>[],
  now = new Date(),
): ApprovalCard[] {
  const files = new Map<string, Record<string, unknown>>();
  const dispositions = new Map<string, Record<string, unknown>>();
  const consumptions = new Map<string, number>();

  fileRecords.forEach((item) => {
    const approvalId = text(item, "approvalId", "id");
    if (approvalId) files.set(approvalId, item);
  });
  ledgerRecords.forEach((item) => {
    const approvalId = text(item, "approvalId", "id");
    if (approvalId) dispositions.set(approvalId, item);
  });
  consumptionRecords.forEach((item) => {
    const approvalId = text(item, "approvalId", "id");
    if (approvalId) consumptions.set(approvalId, (consumptions.get(approvalId) || 0) + 1);
  });

  const ids = new Set([...files.keys(), ...dispositions.keys(), ...consumptions.keys()]);
  return [...ids].map((approvalId) => {
    const filed = files.get(approvalId) || {};
    const disposition = dispositions.get(approvalId) || {};
    const merged = { ...filed, ...disposition };
    const filedStatus = text(filed, "status") || "NOT_FILED";
    const authoritativeDisposition = text(disposition, "status", "disposition") || "UNVERIFIED";
    const expiresAt = text(merged, "expiresAt") || null;
    const consumedCount = consumptions.get(approvalId) || 0;
    const dispositionState = normalizeState(authoritativeDisposition);
    let status: NormalizedState;

    if (["REVOKED", "DENIED", "SUPERSEDED"].includes(dispositionState)) status = dispositionState;
    else if (consumedCount > 0) status = "CONSUMED";
    else if (isExpired(expiresAt, now)) status = "EXPIRED";
    else if (dispositionState !== "UNKNOWN") status = dispositionState;
    else status = normalizeState(filedStatus);

    const target = redactValue(record(merged.target)) as Record<string, unknown>;
    const affectedPaths = strings(merged.affectedPaths).length
      ? strings(merged.affectedPaths)
      : strings(target.paths).length
        ? strings(target.paths)
        : strings(target.path);
    const singleUse = flag(merged, "singleUse");
    const explicitLimit = numeric(merged, "executionCountLimit", "maxExecutions");
    const scope = targetSummary(target);

    return {
      approvalId,
      action: text(merged, "action") || "UNSPECIFIED_ACTION",
      status,
      fileStatus: filedStatus,
      authoritativeDisposition,
      issuedAt: text(merged, "issuedAt", "createdAt") || null,
      expiresAt,
      issuedBy: text(merged, "issuedBy") || null,
      requestingAgent: text(merged, "requestingAgent", "requestedBy") || null,
      justification: safeSummary(merged.justification, "No justification supplied."),
      target,
      targetSummary: scope,
      scopeSummary: affectedPaths.length ? safeSummary(affectedPaths.join(", "), scope, 320) : scope,
      affectedPaths,
      willDo: strings(merged.willDo),
      willNotDo: strings(merged.willNotDo),
      preconditions: strings(merged.preconditions),
      riskLevel: text(merged, "riskLevel") || null,
      evidenceRefs: strings(merged.evidenceRefs),
      consumed: consumedCount > 0,
      consumptionCount: consumedCount,
      executionLimit: explicitLimit || (singleUse ? 1 : null),
      ownerActionRequired: status === "PENDING",
      authority: "AUTHORITATIVE" as const,
    };
  }).sort((left, right) => (right.issuedAt || "").localeCompare(left.issuedAt || ""));
}

export function normalizeEvents(items: Record<string, unknown>[]): EventItem[] {
  return items.map((item, index) => {
    const eventType = text(item, "eventType", "type") || "UNCLASSIFIED_EVENT";
    const normalizedType = eventType.toUpperCase();
    const category = normalizedType.includes("GOVERN") || normalizedType.includes("CORRECT")
      ? "GOVERNANCE"
      : normalizedType.includes("ROUT") || normalizedType.includes("REPOSITORY")
        ? "ROUTING"
        : normalizedType.includes("MILESTONE") || normalizedType.includes("COMPLETE")
          ? "MILESTONE"
          : "LEDGER";
    return {
      sequence: Number(item.sequence) || index + 1,
      timestamp: text(item, "timestamp", "occurredAt", "createdAt") || new Date(0).toISOString(),
      eventType,
      severity: normalizeSeverity(item.severity),
      summary: safeSummary(item.summary ?? item.content ?? item.justification, "Operational event recorded."),
      category,
      verification: "AUTHORITATIVE" as const,
      evidencePath: text(item, "evidencePath", "evidenceRoot") || null,
      taskId: text(item, "taskId") || null,
      sessionId: text(item, "sessionId") || null,
      orchestratorLeaseId: text(item, "orchestratorLeaseId", "leaseId") || null,
      actor: text(item, "actor", "source") || null,
      provider: text(item, "provider") || null,
      authority: "AUTHORITATIVE" as const,
    };
  }).reverse();
}

function taskNextAction(status: NormalizedState): string {
  if (status === "BLOCKED") return "Resolve blocker under owner-approved scope.";
  if (status === "FAILED") return "Review evidence; issue a new bounded task if authorized.";
  if (status === "COMPLETED") return "Independent verification or owner integration review.";
  if (status === "RUNNING") return "Observe only; wait for authoritative completion.";
  if (status === "EXPIRED") return "Create a new approval and task contract.";
  return "Await authoritative dispatch or owner decision.";
}

export function normalizeTaskRecord(
  contractValue: Record<string, unknown>,
  resultValue: Record<string, unknown>,
  agent: string,
  primaryAgent: string,
  now = new Date(),
): TaskNode {
  const contract = record(contractValue);
  const result = record(resultValue);
  const taskId = text(contract, "taskId") || text(result, "taskId") || "UNKNOWN_TASK";
  const rawStatus = text(result, "status", "result", "verdict") || text(contract, "status", "launchState") || "UNKNOWN";
  let status = normalizeState(rawStatus);
  const diagnosticOnly = flag(result, "diagnostic") || /DIAGNOSTIC/.test(text(result, "evidenceType", "verification", "resultType").toUpperCase());
  if (diagnosticOnly && status === "COMPLETED") status = "UNKNOWN";
  const expiresAt = text(contract, "expiresAt");
  if (["PENDING", "APPROVED", "UNKNOWN"].includes(status) && isExpired(expiresAt, now)) status = "EXPIRED";
  const workspace = text(contract, "workspace", "targetCandidate");
  const projectRecord = record(contract.project);
  const evidencePaths = [text(result, "evidenceRoot", "evidencePath"), text(contract, "evidencePath")].filter(Boolean);
  const startedAt = text(result, "startedAt", "dispatchTime", "dispatchedAt") || text(contract, "startedAt", "dispatchTime", "dispatchedAt") || null;
  const completedAt = text(result, "completedAt", "completionReceivedAtUtc", "resultReceivedAt") || text(contract, "completedAt", "completionReceivedAtUtc") || null;

  return {
    taskId,
    project: text(projectRecord, "name", "id") || text(contract, "projectId") || (workspace ? pathName(workspace) : "UNVERIFIED"),
    objective: safeSummary(contract.mission ?? contract.contractDescription ?? contract.objective, `${text(contract, "role") || "Task"} ${taskId}`),
    status,
    owner: text(contract, "assignedAgent", "agent") || agent,
    reviewer: agent === primaryAgent.toLowerCase() ? "owner" : primaryAgent.toLowerCase(),
    approvalRef: text(contract, "ownerApprovalRef", "approvalRef", "approval") || null,
    launchCount: numeric(result, "launchCount", "attemptCount") || numeric(contract, "launchCount", "attemptCount") || (flag(contract, "dispatchAttempted") ? 1 : 0),
    startedAt,
    completedAt,
    protocolStatus: text(result, "protocolStatus", "completionProtocolStatus") || text(contract, "dispatchStatus", "launchState") || "NOT_REPORTED",
    exitResult: text(result, "exitResult", "exitCode", "verdict") || (Object.keys(result).length ? rawStatus : null),
    nextPermittedAction: taskNextAction(status),
    verification: diagnosticOnly ? "DIAGNOSTIC_ONLY" : Object.keys(result).length ? "VERIFIED_DIRECTLY" : "AUTHORITATIVE",
    dependencies: strings(contract.dependencies),
    allowedPaths: strings(contract.allowedPaths).length ? strings(contract.allowedPaths) : [workspace].filter(Boolean),
    prohibitedPaths: strings(contract.prohibitedPaths).length ? strings(contract.prohibitedPaths) : strings(contract.prohibitedActions),
    worktree: workspace || null,
    branch: text(result, "branch") || text(contract, "branch") || null,
    commit: text(result, "head", "candidateHead") || text(contract, "expectedHead", "expectedHEAD") || null,
    leaseId: text(contract, "leaseId", "orchestratorLeaseId") || null,
    requiredGates: strings(contract.requiredOutputs).length ? strings(contract.requiredOutputs) : strings(contract.unblockGates),
    evidencePaths,
    blockerClass: status === "BLOCKED" ? "TASK_BLOCKED" : null,
    authority: "AUTHORITATIVE",
    role: text(contract, "assignedRole", "role", "mode"),
    dispatchMode: text(contract, "dispatchMode", "mode"),
  };
}

async function collectTasks(
  orchestratorRoot: string,
  primaryAgent: string,
  waveDocument: Record<string, unknown>,
  now: Date,
): Promise<{ tasks: TaskNode[]; handoffs: HandoffItem[]; warnings: string[] }> {
  const tasks = new Map<string, TaskNode>();
  const handoffs: HandoffItem[] = [];
  const warnings: string[] = [];

  for (const agent of AGENTS) {
    const inbox = resolveWithinRoot(orchestratorRoot, "handoffs", agent, "inbox");
    for (const file of await listJsonFiles(inbox)) {
      const contract = record(await readJson(file));
      if (!Object.keys(contract).length) {
        warnings.push(`Unreadable task contract skipped: ${path.basename(file)}`);
        continue;
      }
      const taskId = text(contract, "taskId") || path.basename(file, ".json");
      const completedPath = resolveWithinRoot(orchestratorRoot, "handoffs", agent, "completed", `${taskId}.json`);
      const result = record(await readJson(completedPath));
      const task = normalizeTaskRecord({ ...contract, taskId }, result, agent, primaryAgent, now);
      tasks.set(task.taskId, task);
      const dispatchStatus = text(contract, "dispatchStatus").toUpperCase();
      let lifecycleStage: HandoffItem["lifecycleStage"] = "REQUEST_PUBLISHED";
      if (Object.keys(result).length > 0) lifecycleStage = "RESULT_RECEIVED";
      else if (task.status === "BLOCKED") lifecycleStage = "WORKER_UNAVAILABLE";
      else if (dispatchStatus.includes("ACK")) lifecycleStage = "ACKNOWLEDGED";
      else if (task.status === "RUNNING") lifecycleStage = "IN_PROGRESS";

      handoffs.push({
        handoffId: `${agent}-${taskId}`,
        fromAgent: primaryAgent.toLowerCase(),
        toAgent: agent,
        title: `${text(contract, "role") || "TASK"} · ${taskId}`,
        status: task.status,
        path: path.relative(orchestratorRoot, file),
        sha256: null,
        expiresAt: text(contract, "expiresAt") || null,
        taskId,
        lifecycleStage,
        authority: "AUTHORITATIVE",
        dispatchModel: "SYNCHRONOUS_ADAPTER",
        acknowledgmentProtocol: text(contract, "acknowledgmentProtocol") || "CURSOR_TASK_ACKNOWLEDGED",
        completionProtocol: text(contract, "completionProtocol") || "CURSOR_TASK_COMPLETED",
      });
    }
  }

  Object.entries(waveDocument).forEach(([key, value]) => {
    if (!/^task[A-Z0-9]+$/i.test(key)) return;
    const contract = record(value);
    if (!text(contract, "taskId")) return;
    const waveTask = normalizeTaskRecord(contract, {}, text(contract, "agent") || "unassigned", primaryAgent, now);
    const existing = tasks.get(waveTask.taskId);
    tasks.set(waveTask.taskId, existing ? {
      ...waveTask,
      ...existing,
      approvalRef: existing.approvalRef || waveTask.approvalRef,
      launchCount: Math.max(existing.launchCount, waveTask.launchCount),
      startedAt: existing.startedAt || waveTask.startedAt,
      completedAt: existing.completedAt || waveTask.completedAt,
    } : waveTask);
  });

  return { tasks: [...tasks.values()], handoffs, warnings };
}

function normalizeAgents(
  sessionsDocument: Record<string, unknown>,
  primaryLease: MissionSnapshot["primaryLease"],
  tasks: TaskNode[],
): AgentCard[] {
  const sessions = record(sessionsDocument.sessions);
  const primaryName = primaryLease.orchestrator.toLowerCase();
  const names = new Set([...Object.keys(sessions), primaryName]);

  return [...names].map((name) => {
    const session = record(sessions[name]);
    const sessionRecord = record(session.sessionRecord);
    const status = text(session, "status") || (name === primaryName ? primaryLease.state : "UNKNOWN");
    const frozen = flag(session, "frozen", status.toUpperCase().includes("FROZEN"));
    const isPrimary = name === primaryName;
    const isCursor = name === "cursor";
    const note = text(session, "note");
    const task = tasks.find((item) => item.owner.toLowerCase() === name);
    const finalHead = text(sessionRecord, "finalHead");

    return {
      agentId: name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      role: isPrimary ? "PRIMARY" : isCursor ? "REVIEW / SUPPORT" : name === "kimi" ? "CERTIFICATION" : "BOUNDED WORKER",
      authority: isPrimary ? "AUTHORITATIVE" : isCursor ? "NON_AUTHORITATIVE" : "OBSERVED",
      availabilityState: frozen ? "FROZEN" : BLOCKING_TOKENS.some((token) => status.toUpperCase().includes(token)) ? "BLOCKED" : "AVAILABLE",
      verificationState: finalHead || isPrimary ? "VERIFIED_DIRECTLY" : "REPORTED_NOT_REVERIFIED",
      lastExecution: text(sessionRecord, "resultReceivedAt", "lastCommitAt") || null,
      executionResult: finalHead ? `Completed at ${finalHead.slice(0, 12)}` : null,
      evidenceReference: task?.evidencePaths[0] || null,
      runtimePromotionPending: status.toUpperCase().includes("PROMOTION") || status.toUpperCase().includes("CERTIFICATION"),
      sessionIdentity: text(sessionRecord, "sessionId", "id") || (isPrimary ? primaryLease.sessionId : null) || null,
      status,
      frozen,
      currentTask: text(session, "lastTask", "currentTask") || task?.taskId || null,
      worktree: text(session, "lastWorktree", "worktree") || task?.worktree || null,
      branch: text(session, "lastBranch", "branch") || task?.branch || null,
      registration: text(sessionRecord, "registrationId", "leaseId") || (isPrimary ? primaryLease.leaseId : null) || null,
      heartbeatLabel: isPrimary ? "authoritative lease" : isCursor ? "overlay only" : "observed session record",
      permittedActions: isPrimary
        ? ["primary_orchestration", "dispatch_authority", "integration_authority"]
        : isCursor
          ? ["review_support", "planning_support", "implementation_when_authorized"]
          : name === "kimi"
            ? ["independent_certification_when_authorized"]
            : ["bounded_implementation_when_authorized"],
      prohibitedActions: isPrimary ? [] : ["acquire_orchestrator_lease", "become_primary", "enable_dispatch", ...(isCursor ? ["self_approve"] : [])],
      blockers: BLOCKING_TOKENS.some((token) => status.toUpperCase().includes(token)) ? [note || status] : [],
      recentActions: [text(session, "lastTask")].filter(Boolean),
      cannotAcquireOrchestratorLease: !isPrimary,
    };
  });
}

function normalizeWorktrees(document: Record<string, unknown>): WorktreeNode[] {
  return array(document.worktrees).map(record).map((item, index) => ({
    repoId: text(item, "purpose", "repoId", "name") || `worktree-${index + 1}`,
    pathWindows: text(item, "path", "pathWindows"),
    pathWsl: text(item, "pathWsl", "wslPath") || null,
    role: text(item, "access", "role", "purpose") || "REGISTERED_WORKTREE",
    branch: text(item, "branch") || null,
    head: text(item, "candidateHead", "expectedHead", "head") || null,
    tree: text(item, "candidateTree", "expectedTree", "tree") || null,
    untracked: [],
    ownerAgent: text(item, "ownerAgent") || null,
    prunable: null,
    remote: null,
    signatureStatus: null,
    authority: "OBSERVED" as const,
    observationStatus: text(document, "verificationStatus") || "REGISTRY_ONLY",
  })).filter((item) => Boolean(item.pathWindows));
}

export function classifyProject(
  candidatePath: string,
  role: string,
  controlPlaneRoot: string,
  canonicalProjectRoot: string,
): ProjectClassification {
  const normalized = candidatePath.toLowerCase();
  if (path.resolve(candidatePath).toLowerCase() === path.resolve(controlPlaneRoot).toLowerCase()) return "ADOS_CONTROL_PLANE";
  if (canonicalProjectRoot && path.resolve(candidatePath).toLowerCase() === path.resolve(canonicalProjectRoot).toLowerCase()) return "ADOS_COMPONENT_REPOSITORY";
  const signal = `${normalized} ${role.toLowerCase()}`;
  if (signal.includes("quarantin") || signal.includes("unexpected")) return "QUARANTINED_ROUTING_INCIDENT";
  if (signal.includes("certification") || signal.includes("test")) return "TEST_WORKTREE";
  if (signal.includes("worktree") || signal.includes("candidate") || signal.includes("remediation") || signal.includes("cursor")) return "INTEGRATION_WORKTREE";
  if (signal.includes("related")) return "RELATED_SEPARATE_PROJECT";
  return "UNRELATED_PROJECT";
}

function normalizeProjects(
  config: ReturnType<typeof getMissionControlConfig>,
  projectDocument: Record<string, unknown>,
  worktreeDocument: Record<string, unknown>,
  tasks: TaskNode[],
  checkedAt: string,
): ProjectCard[] {
  const project = record(projectDocument.project);
  const verification = record(projectDocument.verification);
  const canonicalRoot = text(project, "canonicalRepository");
  const entries: Array<{ path: string; name: string; role: string; branch?: string; head?: string; status?: string; verified?: string }> = [
    { path: config.orchestratorRoot, name: "ADOS control plane", role: "CONTROL_PLANE", status: "READ_ONLY_SOURCE", verified: checkedAt },
  ];
  if (canonicalRoot) entries.push({
    path: canonicalRoot,
    name: text(project, "name") || "ADOS component repository",
    role: "CANONICAL_COMPONENT",
    branch: text(project, "canonicalBranch"),
    head: text(project, "canonicalHead"),
    status: text(record(project.activeWorkPackage), "status") || text(record(projectDocument.activeWorkPackageState), "status"),
    verified: text(verification, "verifiedAt") || text(projectDocument, "lastUpdated"),
  });
  if (config.sourceRoot && config.sourceRoot.toLowerCase() !== canonicalRoot.toLowerCase()) entries.push({
    path: config.sourceRoot,
    name: "ADOS orchestrator source",
    role: "RELATED_SOURCE_REPOSITORY",
    branch: "main",
    status: "OBSERVED",
    verified: checkedAt,
  });

  array(worktreeDocument.worktrees).map(record).forEach((item) => entries.push({
    path: text(item, "path", "pathWindows"),
    name: text(item, "purpose", "name") || "Registered worktree",
    role: `${text(item, "access", "role", "purpose")} ${text(item, "priorClassification")}`,
    branch: text(item, "branch"),
    head: text(item, "candidateHead", "expectedHead", "head"),
    status: text(item, "access", "status") || "REGISTERED",
    verified: text(item, "frozenAt", "createdAt") || text(worktreeDocument, "verifiedAt"),
  }));

  const seen = new Set<string>();
  return entries.filter((entry) => entry.path && !seen.has(entry.path.toLowerCase()) && seen.add(entry.path.toLowerCase())).map((entry, index) => {
    const classification = classifyProject(entry.path, entry.role, config.orchestratorRoot, canonicalRoot);
    const blocking = BLOCKING_TOKENS.some((token) => (entry.status || "").toUpperCase().includes(token));
    const task = tasks.find((item) => item.worktree?.toLowerCase() === entry.path.toLowerCase());
    return {
      projectId: `project-${index + 1}-${pathName(entry.path).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: entry.name,
      classification,
      canonicalPath: entry.path,
      repositoryType: classification === "ADOS_CONTROL_PLANE" ? "NON_GIT" : entry.branch || entry.head ? "GIT" : "UNVERIFIED",
      branch: entry.branch || null,
      head: entry.head || null,
      currentTask: task?.taskId || null,
      status: entry.status || "UNVERIFIED",
      lastVerifiedAt: entry.verified || null,
      blocker: blocking ? entry.status || "BLOCKED" : null,
      nextPermittedAction: classification === "ADOS_CONTROL_PLANE"
        ? "Read-only observation only."
        : blocking
          ? "Owner-approved review or a new bounded task only."
          : "Operate only within an authoritative task contract.",
      authority: classification === "ADOS_CONTROL_PLANE" || classification === "ADOS_COMPONENT_REPOSITORY" ? "AUTHORITATIVE" : "OBSERVED",
    };
  });
}

function normalizeRoutingIncidents(
  worktreeDocument: Record<string, unknown>,
  events: EventItem[],
): RoutingIncident[] {
  const incidents: RoutingIncident[] = [];
  array(worktreeDocument.worktrees).map(record).forEach((item, index) => {
    const prior = text(item, "priorClassification");
    const access = text(item, "access");
    if (!prior.toUpperCase().includes("UNEXPECTED") && !access.toUpperCase().includes("QUARANTIN")) return;
    incidents.push({
      incidentId: `routing-worktree-${index + 1}`,
      timestamp: text(item, "reclassifiedAt", "createdAt") || null,
      intendedProject: "ADOS control-plane source",
      incorrectRepository: text(item, "path") || "UNAVAILABLE",
      branch: text(item, "branch") || null,
      commit: text(item, "baseCommit", "candidateHead") || null,
      containmentStatus: access || "OBSERVED",
      ownerDispositionRequired: access.toUpperCase().includes("UNEXPECTED") || access.toUpperCase().includes("QUARANTIN"),
      resolution: safeSummary(item.note, "No final resolution recorded."),
      verification: "VERIFIED_DIRECTLY",
    });
  });
  events.filter((event) => /ROUT|WRONG_REPOSITORY|CROSS_PROJECT/i.test(`${event.eventType} ${event.summary}`)).forEach((event) => {
    incidents.push({
      incidentId: `routing-event-${event.sequence}`,
      timestamp: event.timestamp,
      intendedProject: event.taskId || "UNVERIFIED",
      incorrectRepository: "Reported in authoritative ledger",
      branch: null,
      commit: null,
      containmentStatus: "LEDGER_RECORDED",
      ownerDispositionRequired: event.severity === "CRITICAL" || event.severity === "BLOCKED",
      resolution: event.summary,
      verification: event.verification,
    });
  });
  return incidents;
}

export function evidenceVerification(item: Pick<EvidenceItem, "trustFlags" | "sha256">): VerificationLabel {
  if (item.trustFlags.includes("CONTRADICTED")) return "CONTRADICTED";
  if (item.sha256 && item.trustFlags.includes("HASH_VERIFIED")) return "VERIFIED_DIRECTLY";
  return "DIAGNOSTIC_ONLY";
}

async function collectEvidence(orchestratorRoot: string): Promise<EvidenceItem[]> {
  const evidenceRoot = resolveWithinRoot(orchestratorRoot, "evidence");
  return (await listFileMetadata(evidenceRoot)).map((item) => {
    const relativePath = path.relative(orchestratorRoot, item.path);
    const evidence: EvidenceItem = {
      evidenceId: `evidence:${relativePath.replaceAll("\\", "/")}`,
      path: relativePath,
      sha256: null,
      creator: null,
      createdAt: item.modifiedAt,
      relatedTaskId: null,
      relatedLeaseId: null,
      trackedState: "unknown",
      redactionStatus: "CONTENT_NOT_INGESTED",
      trustFlags: ["METADATA_ONLY", "HASH_NOT_COMPUTED"],
      verification: "DIAGNOSTIC_ONLY",
      authority: "OBSERVED",
      sizeBytes: item.size,
    };
    evidence.verification = evidenceVerification(evidence);
    return evidence;
  });
}

function referenceMatches(reference: string, evidencePath: string): boolean {
  const normalizedReference = reference.replaceAll("\\", "/").toLowerCase();
  const normalizedPath = evidencePath.replaceAll("\\", "/").toLowerCase();
  return normalizedReference === normalizedPath || normalizedPath.endsWith(`/${normalizedReference}`);
}

export function correlateEvidence(
  evidenceItems: EvidenceItem[],
  tasks: TaskNode[],
  approvals: ApprovalCard[],
): EvidenceItem[] {
  return evidenceItems.map((evidence) => {
    const normalizedPath = evidence.path.replaceAll("\\", "/").toLowerCase();
    const taskByReference = tasks.find((task) => task.evidencePaths.some((reference) => referenceMatches(reference, evidence.path)));
    const task = taskByReference || tasks.find((candidate) => normalizedPath.includes(candidate.taskId.toLowerCase()));
    const approvalByReference = approvals.find((approval) => approval.evidenceRefs.some((reference) => referenceMatches(reference, evidence.path)));
    const approval = approvalByReference || approvals.find((candidate) => normalizedPath.includes(candidate.approvalId.toLowerCase()));
    if (!task && !approval) return { ...evidence, confidence: "LOW" };

    const declaredReference = Boolean(taskByReference || approvalByReference);
    return {
      ...evidence,
      relatedTaskId: task?.taskId || null,
      relatedApprovalId: approval?.approvalId || null,
      trustFlags: [...new Set([...evidence.trustFlags, declaredReference ? "CORRELATED_BY_DECLARED_REFERENCE" : "CORRELATED_BY_IDENTIFIER"])],
      verification: "REPORTED_NOT_REVERIFIED",
      confidence: declaredReference ? "MEDIUM" : "LOW",
    };
  });
}

function budgetPair(source: Record<string, unknown>, usedKey: string, limitKey: string): { used: number; limit: number } {
  const nested = record(source);
  return {
    used: numeric(nested, usedKey, "used", "consumed"),
    limit: numeric(nested, limitKey, "limit", "max", "budget"),
  };
}

function normalizeBudgets(raw: Record<string, unknown>): CampaignBudgetSnapshot {
  const budgets = record(raw.budgets);
  const cursor = record(budgets.cursorLaunches ?? budgets.cursor ?? budgets.CursorLaunches);
  const claude = record(budgets.claudeReviews ?? budgets.claude ?? budgets.ClaudeReviews);
  const remediation = record(budgets.remediations ?? budgets.remediation ?? budgets.Remediations);
  const cursorPair = budgetPair(cursor, "used", "limit");
  const claudePair = budgetPair(claude, "used", "limit");
  const remediationPair = budgetPair(remediation, "used", "limit");
  return {
    cursorLaunches: {
      used: cursorPair.used,
      limit: cursorPair.limit || numeric(budgets, "maximumCursorLaunches"),
    },
    claudeReviews: {
      used: claudePair.used,
      limit: claudePair.limit || numeric(budgets, "maximumClaudeReviews"),
    },
    remediations: {
      used: remediationPair.used,
      limit: remediationPair.limit || numeric(budgets, "maximumRemediationCycles"),
    },
  };
}

export function normalizeCampaign(raw: Record<string, unknown>): CampaignCard | null {
  const campaignId = text(raw, "campaignId", "id");
  if (!campaignId) return null;
  const policies = record(raw.policies);
  const pushMergeDeploy = text(policies, "pushMergeDeploy", "push_merge_deploy")
    || text(raw, "pushMergeDeployPolicy")
    || "OWNER_APPROVAL_REQUIRED";
  const status = text(raw, "status") || "UNKNOWN";
  return {
    campaignId,
    status,
    primaryRuntime: text(raw, "primaryRuntime") || "UNAVAILABLE",
    reviewRuntime: text(raw, "reviewRuntime") || "UNAVAILABLE",
    projectIds: strings(raw.projectIds),
    issuedAt: text(raw, "issuedAt") || null,
    expiresAt: text(raw, "expiresAt") || null,
    ownerApprovalRef: text(raw, "ownerApprovalRef") || null,
    budgets: normalizeBudgets(raw),
    ownerOnlyGates: strings(raw.ownerOnlyGates),
    pushMergeDeployPolicy: pushMergeDeploy,
    nextAction: status.toUpperCase() === "APPROVED"
      ? "Observe supervisor queue; no Mission Control mutation path"
      : "Await owner campaign approval outside Mission Control",
    verification: "REPORTED_NOT_REVERIFIED",
    authority: "OBSERVED",
  };
}

export function normalizeOwnerGate(raw: Record<string, unknown>): OwnerGateCard | null {
  const gateId = text(raw, "gateId", "id");
  if (!gateId) return null;
  const status = (text(raw, "status") || "OPEN").toUpperCase();
  return {
    gateId,
    campaignId: text(raw, "campaignId") || "UNAVAILABLE",
    missionId: text(raw, "missionId") || "UNAVAILABLE",
    decisionType: text(raw, "decisionType", "type") || "UNAVAILABLE",
    summary: text(raw, "summary", "message") || "Owner gate recorded without summary.",
    status,
    options: strings(raw.options),
    recommendedOption: text(raw, "recommendedOption") || null,
    createdAt: text(raw, "createdAt", "issuedAt") || null,
    expiresAt: text(raw, "expiresAt") || null,
    ownerActionRequired: status === "OPEN",
    verification: "REPORTED_NOT_REVERIFIED",
    authority: "OBSERVED",
  };
}

async function loadSupervisorProjections(orchestratorRoot: string): Promise<{
  campaigns: CampaignCard[];
  ownerGates: OwnerGateCard[];
  warnings: ParseWarning[];
}> {
  const warnings: ParseWarning[] = [];
  const campaignRecords: Record<string, unknown>[] = [];
  const gateRecords: Record<string, unknown>[] = [];

  const campaignFiles = [
    ...(await listJsonFiles(resolveWithinRoot(orchestratorRoot, "state", "campaigns"))),
  ];
  const singleCampaign = resolveWithinRoot(orchestratorRoot, "state", "campaign.json");
  if (await exists(singleCampaign)) campaignFiles.push(singleCampaign);

  for (const file of campaignFiles) {
    const payload = await readJson(file);
    if (!payload) {
      warnings.push({ code: "MALFORMED_JSON", source: path.basename(file), message: "Campaign JSON could not be parsed." });
      continue;
    }
    if (Array.isArray(payload)) campaignRecords.push(...payload.map(record));
    else campaignRecords.push(record(payload));
  }

  const campaignLedger = resolveWithinRoot(orchestratorRoot, "state", "campaigns.jsonl");
  if (await exists(campaignLedger)) {
    const result = await readJsonLines(campaignLedger, 100);
    campaignRecords.push(...result.records);
    warnings.push(...result.warnings);
  }

  const gateLedger = resolveWithinRoot(orchestratorRoot, "state", "owner-gates.jsonl");
  if (await exists(gateLedger)) {
    const result = await readJsonLines(gateLedger, 100);
    gateRecords.push(...result.records);
    warnings.push(...result.warnings);
  }

  for (const file of await listJsonFiles(resolveWithinRoot(orchestratorRoot, "handoffs", "owner", "inbox"))) {
    const payload = await readJson(file);
    if (!payload) {
      warnings.push({ code: "MALFORMED_JSON", source: path.basename(file), message: "Owner-gate JSON could not be parsed." });
      continue;
    }
    gateRecords.push(record(payload));
  }

  const campaigns = campaignRecords
    .map(normalizeCampaign)
    .filter((item): item is CampaignCard => item !== null);
  const ownerGates = gateRecords
    .map(normalizeOwnerGate)
    .filter((item): item is OwnerGateCard => item !== null);

  return { campaigns, ownerGates, warnings };
}

function withFreshness(snapshot: Omit<MissionSnapshot, "freshness">): MissionSnapshot {
  const complete = {
    ...snapshot,
    campaigns: snapshot.campaigns ?? [],
    ownerGates: snapshot.ownerGates ?? [],
    freshness: "UNAVAILABLE" as const,
  };
  return {
    ...complete,
    freshness: freshnessFromSnapshot(complete),
  };
}

function buildAuditTimeline(
  events: EventItem[],
  approvals: ApprovalCard[],
  tasks: TaskNode[],
  evidence: EvidenceItem[],
  incidents: RoutingIncident[],
): AuditEntry[] {
  const entries: AuditEntry[] = events.map((event) => ({
    id: `ledger-${event.sequence}-${event.eventType}`,
    timestamp: event.timestamp,
    category: event.category as AuditEntry["category"],
    title: event.eventType,
    summary: event.summary,
    severity: event.severity,
    verification: event.verification,
    evidenceReference: event.evidencePath,
  }));
  approvals.forEach((approval) => entries.push({
    id: `approval-${approval.approvalId}`,
    timestamp: approval.issuedAt || approval.expiresAt || new Date(0).toISOString(),
    category: "APPROVAL",
    title: `${approval.status}: ${approval.action}`,
    summary: `${approval.authoritativeDisposition} · ${approval.scopeSummary}`,
    severity: ["REVOKED", "DENIED", "EXPIRED"].includes(approval.status) ? "WARNING" : approval.status === "PENDING" ? "BLOCKED" : "INFO",
    verification: "AUTHORITATIVE",
    evidenceReference: approval.evidenceRefs[0] || null,
  }));
  tasks.forEach((task) => entries.push({
    id: `task-${task.taskId}`,
    timestamp: task.completedAt || task.startedAt || new Date(0).toISOString(),
    category: task.protocolStatus !== "NOT_REPORTED" ? "PROTOCOL" : "EXECUTION",
    title: `${task.status}: ${task.taskId}`,
    summary: task.objective,
    severity: task.status === "FAILED" ? "CRITICAL" : task.status === "BLOCKED" ? "BLOCKED" : task.status === "COMPLETED" ? "SUCCESS" : "INFO",
    verification: task.verification,
    evidenceReference: task.evidencePaths[0] || null,
  }));
  evidence.forEach((item) => entries.push({
    id: item.evidenceId,
    timestamp: item.createdAt || new Date(0).toISOString(),
    category: "EVIDENCE",
    title: pathName(item.path),
    summary: "Evidence metadata observed; content was not treated as an authoritative result.",
    severity: "INFO",
    verification: item.verification,
    evidenceReference: item.path,
  }));
  incidents.forEach((incident) => entries.push({
    id: incident.incidentId,
    timestamp: incident.timestamp || new Date(0).toISOString(),
    category: "ROUTING",
    title: "Repository routing incident",
    summary: incident.resolution,
    severity: incident.ownerDispositionRequired ? "BLOCKED" : "WARNING",
    verification: incident.verification,
    evidenceReference: incident.incorrectRepository,
  }));
  return entries.sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 160);
}

function fixtureCollections(orchestratorRoot: string) {
  const task = normalizeTaskRecord({
    taskId: "MC-P1-FIXTURE-001",
    mission: "Demonstrate the read-only Mission Control fixture mode.",
    status: "PENDING",
    agent: "codex",
    workspace: "D:\\ADOS Mission Control",
    prohibitedPaths: [`${orchestratorRoot}\\state\\**`],
  }, {}, "codex", "claude");
  return { tasks: [task], handoffs: [] as HandoffItem[], worktrees: [] as WorktreeNode[], evidence: [] as EvidenceItem[] };
}

async function loadFixture(): Promise<MissionSnapshot> {
  const config = getMissionControlConfig();
  const fixturePath = path.join(process.cwd(), "examples", "sample-home-snapshot.json");
  const raw = record(await readJson(fixturePath));
  const checkedAt = new Date().toISOString();
  const primaryLease = record(raw.primaryLease) as unknown as MissionSnapshot["primaryLease"];
  const collections = fixtureCollections(config.orchestratorRoot);
  const events = normalizeEvents(array(raw.recentEvents).map(record));
  const agents = array(raw.agents).map(record).map((agent) => ({
    ...agent,
    availabilityState: flag(agent, "frozen") ? "FROZEN" : "AVAILABLE",
    verificationState: "UNVERIFIED" as const,
    lastExecution: null,
    executionResult: null,
    evidenceReference: null,
    runtimePromotionPending: false,
  })) as unknown as AgentCard[];
  const timeline = buildAuditTimeline(events, [], collections.tasks, [], []);
  return withFreshness({
    schemaVersion: "2.0.0",
    snapshotAt: checkedAt,
    productName: "ADOS Mission Control",
    uiTitle: "The Black Agency Command Deck",
    systemHealth: {
      severity: "WARNING",
      dispatchEnabled: false,
      remoteConfigured: false,
      riskLevel: "UNVERIFIED",
      primaryAgent: primaryLease.orchestrator || "UNVERIFIED",
      primaryLeaseId: primaryLease.leaseId || "UNVERIFIED",
      activeAgentCount: agents.filter((agent) => !agent.frozen).length,
      pendingApprovalCount: 0,
      blockerCount: 0,
      latestLedgerSequence: events[0]?.sequence || null,
      readiness: "UNAVAILABLE",
      taskCounts: countStates(collections.tasks),
      approvalCounts: {},
    },
    primaryLease: { ...primaryLease, authority: "OBSERVED" },
    agents,
    approvals: [],
    pendingApprovals: [],
    recentEvents: events,
    auditTimeline: timeline,
    alerts: [{ alertId: "fixture-mode", severity: "WARNING", code: "FIXTURE_MODE", message: "Fixture data is non-authoritative and is clearly isolated from the live staging mode." }],
    tasks: collections.tasks,
    handoffs: collections.handoffs,
    projects: [],
    worktrees: collections.worktrees,
    evidence: collections.evidence,
    routingIncidents: [],
    campaigns: [],
    ownerGates: [],
    readModel: disabledReadModelStatus,
    ownerActions: [],
    workflowSummary: { nodes: ["Fixture", "Read-only UI", "No ADOS mutation"], activeEdge: "Fixture mode explicitly selected" },
    source: {
      mode: "FIXTURE",
      configured: false,
      reachable: true,
      sourceLabel: "Packaged non-authoritative fixture",
      lastIngestAt: checkedAt,
      lastSuccessfulRefresh: null,
      parsingWarningCount: 0,
      warnings: ["Fixture mode does not report live ADOS state."],
      stale: false,
    },
    protocol: {
      dispatchModel: "SYNCHRONOUS_ADAPTER",
      cursorInbox: "NOT_CONFIGURED",
      cursorCompleted: "NOT_CONFIGURED",
      acknowledgmentSentinel: "CURSOR_TASK_ACKNOWLEDGED",
      completionSentinel: "CURSOR_TASK_COMPLETED",
      outboxProtocolCreated: false,
    },
    capabilities: snapshotCapabilities(),
  });
}

function persistenceErrorStatus(config: ReturnType<typeof getMissionControlConfig>): MissionSnapshot["readModel"] {
  return config.persistenceMode === "disabled"
    ? disabledReadModelStatus
    : { backend: "SQLITE", status: "ERROR", schemaVersion: null, lastPersistedAt: null, watermarkCount: 0, recoveredFromCache: false };
}

function unavailableSnapshot(
  config: ReturnType<typeof getMissionControlConfig>,
  warning: string,
  readModel = persistenceErrorStatus(config),
): MissionSnapshot {
  const checkedAt = new Date().toISOString();
  return withFreshness({
    schemaVersion: "2.0.0",
    snapshotAt: checkedAt,
    productName: "ADOS Mission Control",
    uiTitle: "The Black Agency Command Deck",
    systemHealth: {
      severity: "CRITICAL",
      dispatchEnabled: false,
      remoteConfigured: false,
      riskLevel: "UNAVAILABLE",
      primaryAgent: "UNAVAILABLE",
      primaryLeaseId: "UNAVAILABLE",
      activeAgentCount: 0,
      pendingApprovalCount: 0,
      blockerCount: 1,
      latestLedgerSequence: null,
      readiness: "UNAVAILABLE",
      taskCounts: {},
      approvalCounts: {},
    },
    primaryLease: { leaseId: "UNAVAILABLE", orchestrator: "UNAVAILABLE", state: "UNAVAILABLE", authority: "OBSERVED" },
    agents: [], approvals: [], pendingApprovals: [], recentEvents: [], auditTimeline: [], tasks: [], handoffs: [], projects: [], worktrees: [], evidence: [], routingIncidents: [],
    campaigns: [],
    ownerGates: [],
    alerts: [{ alertId: "source-unavailable", severity: "CRITICAL", code: "ADOS_SOURCE_UNAVAILABLE", message: warning }],
    readModel,
    ownerActions: ["Restore the configured read-only ADOS data source."],
    workflowSummary: { nodes: ["ADOS source", "UNAVAILABLE", "Mission Control blocked"], activeEdge: "No authoritative state refresh available" },
    source: {
      mode: "UNAVAILABLE",
      configured: true,
      reachable: false,
      sourceLabel: "Configured ADOS control-plane source",
      lastIngestAt: null,
      lastSuccessfulRefresh: null,
      parsingWarningCount: 1,
      warnings: [warning],
      stale: true,
    },
    protocol: {
      dispatchModel: "SYNCHRONOUS_ADAPTER",
      cursorInbox: "UNAVAILABLE",
      cursorCompleted: "UNAVAILABLE",
      acknowledgmentSentinel: "CURSOR_TASK_ACKNOWLEDGED",
      completionSentinel: "CURSOR_TASK_COMPLETED",
      outboxProtocolCreated: false,
    },
    capabilities: snapshotCapabilities(),
  });
}

async function cachedOrUnavailable(
  config: ReturnType<typeof getMissionControlConfig>,
  warning: string,
): Promise<MissionSnapshot> {
  if (config.persistenceMode === "disabled") return unavailableSnapshot(config, warning, disabledReadModelStatus);
  try {
    const store = getReadModelStore(config);
    const cached = store.loadLatest();
    if (!cached) return unavailableSnapshot(config, warning, store.getStatus());
    const checkedAt = new Date().toISOString();
    return withFreshness({
      ...cached.snapshot,
      schemaVersion: "2.0.0",
      snapshotAt: checkedAt,
      campaigns: cached.snapshot.campaigns ?? [],
      ownerGates: cached.snapshot.ownerGates ?? [],
      systemHealth: {
        ...cached.snapshot.systemHealth,
        severity: "WARNING",
        riskLevel: "STALE_SOURCE",
        readiness: "BLOCKED",
        blockerCount: Math.max(1, cached.snapshot.systemHealth.blockerCount),
      },
      alerts: [
        { alertId: "stale-cache", severity: "WARNING", code: "STALE_CACHE_RECOVERY", message: "The live ADOS source is unavailable; the last persisted read-only snapshot is displayed." },
        ...cached.snapshot.alerts.filter((alert) => alert.alertId !== "stale-cache"),
      ],
      readModel: {
        ...store.getStatus(),
        status: "STALE",
        lastPersistedAt: cached.persistedAt,
        recoveredFromCache: true,
      },
      source: {
        ...cached.snapshot.source,
        mode: "UNAVAILABLE",
        configured: true,
        reachable: false,
        sourceLabel: "Persisted ADOS read-model snapshot",
        lastIngestAt: null,
        parsingWarningCount: cached.snapshot.source.parsingWarningCount + 1,
        warnings: [warning, ...cached.snapshot.source.warnings.filter((item) => item !== warning)],
        stale: true,
      },
      capabilities: snapshotCapabilities(),
    });
  } catch {
    logMissionEvent("error", "read_model_failure", { operation: "cache_recovery" });
    return unavailableSnapshot(config, warning);
  }
}

export async function getMissionSnapshot(): Promise<MissionSnapshot> {
  const config = getMissionControlConfig();
  if (config.mode === "fixture") return loadFixture();
  if (!(await exists(config.orchestratorRoot))) {
    logMissionEvent("warn", "source_unavailable", { mode: config.mode });
    return cachedOrUnavailable(config, "The configured ADOS control-plane source is unavailable.");
  }

  const stateRoot = resolveWithinRoot(config.orchestratorRoot, "state");
  const [leaseDocument, sessionsDocument, projectDocument, worktreeDocument, dispatchDocument, eventResult, approvalResult, consumptionResult] = await Promise.all([
    readJson<Record<string, unknown>>(resolveWithinRoot(stateRoot, "orchestrator-lease.json")),
    readJson<Record<string, unknown>>(resolveWithinRoot(stateRoot, "agent-sessions.json")),
    readJson<Record<string, unknown>>(resolveWithinRoot(stateRoot, "project-state.json")),
    readJson<Record<string, unknown>>(resolveWithinRoot(stateRoot, "worktree-registry.json")),
    readJson<Record<string, unknown>>(resolveWithinRoot(stateRoot, "wave-0-dispatch-state.json")),
    readJsonLines(resolveWithinRoot(stateRoot, "event-ledger.jsonl"), 160),
    readJsonLines(resolveWithinRoot(stateRoot, "approvals.jsonl"), 500),
    readJsonLines(resolveWithinRoot(stateRoot, "approval-consumptions.jsonl"), 500),
  ]);
  if (!leaseDocument) {
    logMissionEvent("error", "source_unavailable", { reason: "lease_missing" });
    return cachedOrUnavailable(config, "The authoritative orchestrator lease is missing or unreadable.");
  }

  const eventValidation = validateInputRecords("ledger-event", eventResult.records, "event-ledger.jsonl");
  const approvalValidation = validateInputRecords("approval-disposition", approvalResult.records, "approvals.jsonl");
  const consumptionValidation = validateInputRecords("approval-consumption", consumptionResult.records, "approval-consumptions.jsonl");
  const parseWarnings: ParseWarning[] = [
    ...eventResult.warnings,
    ...approvalResult.warnings,
    ...consumptionResult.warnings,
    ...eventValidation.warnings,
    ...approvalValidation.warnings,
    ...consumptionValidation.warnings,
  ];
  const approvalFiles: Record<string, unknown>[] = [];
  const approvalDirectory = resolveWithinRoot(config.orchestratorRoot, "handoffs", "owner", "approvals");
  for (const file of await listJsonFiles(approvalDirectory)) {
    const parsed = record(await readJson(file));
    const validation = validateInputRecords("approval-file", [parsed], path.basename(file));
    approvalFiles.push(...validation.records);
    parseWarnings.push(...validation.warnings);
  }

  const checkedAt = new Date().toISOString();
  const now = new Date(checkedAt);
  const processId = text(leaseDocument, "processId");
  const processAlive = processIsAlive(processId, config.orchestratorRoot);
  const heartbeatAt = text(leaseDocument, "heartbeatAt") || undefined;
  const heartbeat = computeHeartbeatAge(heartbeatAt, now);
  const primaryLease: MissionSnapshot["primaryLease"] = {
    leaseId: text(leaseDocument, "leaseId") || "UNKNOWN_LEASE",
    sessionId: text(leaseDocument, "sessionId") || undefined,
    orchestrator: text(leaseDocument, "orchestrator", "provider") || "UNKNOWN",
    provider: text(leaseDocument, "provider") || undefined,
    mode: text(leaseDocument, "mode") || undefined,
    state: text(leaseDocument, "state") || "UNKNOWN",
    processId: processId || undefined,
    hostIdentity: text(leaseDocument, "hostIdentity") || undefined,
    heartbeatAt,
    heartbeatAgeSeconds: heartbeat.heartbeatAgeSeconds,
    heartbeatFreshness: heartbeat.heartbeatFreshness,
    expiresAt: text(leaseDocument, "expiresAt") || undefined,
    authority: "AUTHORITATIVE",
    processLiveness: { alive: processAlive, checkedAt, clockSource: processAlive === null ? "not_observable_from_runtime" : "windows_process", authority: "OBSERVED" },
  };

  const project = projectDocument || {};
  const wave = dispatchDocument || {};
  const dispatchEnabled = detectDispatch(wave) ?? detectDispatch(project) ?? false;
  const taskCollections = await collectTasks(config.orchestratorRoot, primaryLease.orchestrator, wave, now);
  const tasks = taskCollections.tasks;
  const handoffs = taskCollections.handoffs;
  const approvals = normalizeApprovalRecords(approvalFiles, approvalValidation.records, consumptionValidation.records, now);
  const pendingApprovals = approvals.filter((approval) => approval.ownerActionRequired);
  const recentEvents = normalizeEvents(eventValidation.records);
  const agents = normalizeAgents(sessionsDocument || {}, primaryLease, tasks);
  const worktrees = normalizeWorktrees(worktreeDocument || {});
  const projects = normalizeProjects(config, project, worktreeDocument || {}, tasks, checkedAt);
  const evidence = correlateEvidence(await collectEvidence(config.orchestratorRoot), tasks, approvals);
  const routingIncidents = normalizeRoutingIncidents(worktreeDocument || {}, recentEvents);
  const supervisor = await loadSupervisorProjections(config.orchestratorRoot);
  const warnings = [...parseWarnings.map((warning) => `${warning.source}: ${warning.message}`), ...taskCollections.warnings, ...supervisor.warnings.map((warning) => `${warning.source}: ${warning.message}`)];
  const alerts: SafetyAlert[] = [];

  if (processAlive === false) alerts.push({ alertId: "primary-process-dead", severity: "WARNING", code: "PROCESS_NOT_OBSERVED", message: "The lease process was not observed alive; Mission Control does not supersede the authoritative lease." });
  if (heartbeat.heartbeatFreshness === "stale") {
    alerts.push({
      alertId: "lease-heartbeat-stale",
      severity: "WARNING",
      code: "HEARTBEAT_STALE",
      message: `Authoritative lease heartbeat is stale (${heartbeat.heartbeatAgeSeconds ?? "?"}s). Age is measured from heartbeatAt — not assumed healthy.`,
    });
  } else if (heartbeat.heartbeatFreshness === "missing" || heartbeat.heartbeatFreshness === "malformed" || heartbeat.heartbeatFreshness === "error") {
    alerts.push({
      alertId: "lease-heartbeat-unavailable",
      severity: "WARNING",
      code: "HEARTBEAT_UNAVAILABLE",
      message: `Lease heartbeat state is ${heartbeat.heartbeatFreshness}; Mission Control will not invent a healthy age of 0.`,
    });
  }
  if (dispatchEnabled) alerts.push({ alertId: "dispatch-enabled", severity: "CRITICAL", code: "DISPATCH_UNEXPECTED", message: "Production dispatch appears enabled. Verify the matching owner approval context immediately." });
  if (agents.some((agent) => agent.agentId === "cursor" && agent.role === "PRIMARY")) alerts.push({ alertId: "cursor-primary", severity: "CRITICAL", code: "CURSOR_CLAIMS_LEASE", message: "Cursor cannot become the authoritative orchestrator through Mission Control." });
  if (pendingApprovals.length) alerts.push({ alertId: "owner-approvals", severity: "WARNING", code: "OWNER_ATTENTION_REQUIRED", message: `${pendingApprovals.length} current approval request${pendingApprovals.length === 1 ? "" : "s"} require owner action.` });
  if (warnings.length) alerts.push({ alertId: "parsing-warnings", severity: "WARNING", code: "PARSING_WARNINGS", message: `${warnings.length} source record warning${warnings.length === 1 ? "" : "s"} were isolated without stopping the dashboard.` });

  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED");
  const blockerCount = agents.reduce((total, agent) => total + agent.blockers.length, 0) + blockedTasks.length;
  const readiness: MissionSnapshot["systemHealth"]["readiness"] = dispatchEnabled || alerts.some((alert) => alert.severity === "CRITICAL") || blockerCount > 0
    ? "BLOCKED"
    : pendingApprovals.length > 0
      ? "AWAITING_APPROVAL"
      : warnings.length === 0 && (processAlive === true || processAlive === null)
        ? "READY"
        : "BLOCKED";
  const severity: Severity = alerts.some((alert) => alert.severity === "CRITICAL") ? "CRITICAL" : blockerCount > 0 ? "BLOCKED" : alerts.length ? "WARNING" : "SUCCESS";
  const latestLedgerSequence = recentEvents.reduce<number | null>((latest, event) => latest === null || event.sequence > latest ? event.sequence : latest, null);
  const ownerActions = [
    ...pendingApprovals.slice(0, 5).map((approval) => `Review ${approval.approvalId}: ${approval.action}`),
    ...blockedTasks.slice(0, 5).map((task) => `Resolve ${task.taskId}: ${task.nextPermittedAction}`),
    ...alerts.filter((alert) => alert.severity === "CRITICAL").map((alert) => alert.message),
  ];
  const auditTimeline = buildAuditTimeline(recentEvents, approvals, tasks, evidence, routingIncidents);

  if (warnings.length) logMissionEvent("warn", "parsing_failure", { warningCount: warnings.length });
  logMissionEvent("info", "state_refresh", { sourceReachable: true, warningCount: warnings.length, taskCount: tasks.length, approvalCount: approvals.length });

  const snapshot: MissionSnapshot = withFreshness({
    schemaVersion: "2.0.0",
    snapshotAt: checkedAt,
    productName: "ADOS Mission Control",
    uiTitle: "The Black Agency Command Deck",
    systemHealth: {
      severity,
      dispatchEnabled,
      remoteConfigured: detectRemote(project),
      riskLevel: severity === "SUCCESS" ? "LOW" : severity,
      primaryAgent: primaryLease.orchestrator.toUpperCase(),
      primaryLeaseId: primaryLease.leaseId,
      activeAgentCount: agents.filter((agent) => !agent.frozen && agent.availabilityState === "AVAILABLE").length,
      pendingApprovalCount: pendingApprovals.length,
      blockerCount,
      latestLedgerSequence,
      readiness,
      taskCounts: countStates(tasks),
      approvalCounts: countStates(approvals),
    },
    primaryLease,
    agents,
    approvals,
    pendingApprovals,
    recentEvents,
    auditTimeline,
    alerts,
    tasks,
    handoffs,
    projects,
    worktrees,
    evidence,
    routingIncidents,
    campaigns: supervisor.campaigns,
    ownerGates: supervisor.ownerGates,
    readModel: config.persistenceMode === "disabled" ? disabledReadModelStatus : persistenceErrorStatus(config),
    ownerActions,
    workflowSummary: {
      nodes: ["Owner", `${primaryLease.orchestrator} PRIMARY`, "Task Contract", "Synchronous Adapter", "Worker Result", "Independent Validation", "Owner Integration Approval"],
      activeEdge: handoffs.find((handoff) => !["VALIDATED", "ARCHIVED"].includes(handoff.lifecycleStage))?.title || "No active handoff observed",
    },
    source: {
      mode: "LIVE",
      configured: true,
      reachable: true,
      sourceLabel: "Configured ADOS control-plane snapshot",
      lastIngestAt: checkedAt,
      lastSuccessfulRefresh: checkedAt,
      parsingWarningCount: warnings.length,
      warnings,
      stale: false,
    },
    protocol: {
      dispatchModel: "SYNCHRONOUS_ADAPTER",
      cursorInbox: "handoffs/cursor/inbox",
      cursorCompleted: "handoffs/cursor/completed",
      acknowledgmentSentinel: "CURSOR_TASK_ACKNOWLEDGED",
      completionSentinel: "CURSOR_TASK_COMPLETED",
      outboxProtocolCreated: false,
    },
    capabilities: snapshotCapabilities(),
  });

  if (config.persistenceMode === "sqlite") {
    try {
      const store = getReadModelStore(config);
      snapshot.readModel = store.getStatus();
      const watermarks: IngestWatermark[] = [
        { source: "orchestrator-lease.json", cursor: primaryLease.heartbeatAt || primaryLease.leaseId, recordCount: 1, warningCount: 0, observedAt: checkedAt },
        { source: "event-ledger.jsonl", cursor: String(latestLedgerSequence ?? eventValidation.records.length), recordCount: eventValidation.records.length, warningCount: eventResult.warnings.length + eventValidation.warnings.length, observedAt: checkedAt },
        { source: "approvals.jsonl", cursor: String(approvalValidation.records.length), recordCount: approvalValidation.records.length, warningCount: approvalResult.warnings.length + approvalValidation.warnings.length, observedAt: checkedAt },
        { source: "approval-consumptions.jsonl", cursor: String(consumptionValidation.records.length), recordCount: consumptionValidation.records.length, warningCount: consumptionResult.warnings.length + consumptionValidation.warnings.length, observedAt: checkedAt },
        { source: "approval-files", cursor: String(approvalFiles.length), recordCount: approvalFiles.length, warningCount: parseWarnings.filter((item) => item.source.toLowerCase().startsWith("approval-")).length, observedAt: checkedAt },
      ];
      snapshot.readModel = store.saveSnapshot(snapshot, watermarks);
    } catch {
      snapshot.readModel = persistenceErrorStatus(config);
      snapshot.alerts.push({ alertId: "read-model-error", severity: "WARNING", code: "READ_MODEL_PERSISTENCE_ERROR", message: "The live snapshot is available, but its local read-model cache could not be updated." });
      logMissionEvent("error", "read_model_failure", { operation: "snapshot_persist" });
    }
  }

  return snapshot;
}

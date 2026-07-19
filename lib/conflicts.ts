import type {
  AgentCard,
  ConflictKind,
  ConflictSignal,
  ConflictSummary,
  PrimaryLease,
  ProjectCard,
  RoutingIncident,
  Severity,
  WorktreeNode,
} from "@/lib/contracts";

export interface ConflictProjection {
  conflicts: ConflictSignal[];
  summary: Omit<ConflictSummary, "overviewAnswer">;
  overviewAnswer: string;
}

export interface ConflictInput {
  primaryLease: PrimaryLease;
  agents: AgentCard[];
  worktrees: WorktreeNode[];
  projects: ProjectCard[];
  routingIncidents: RoutingIncident[];
  now?: Date;
}

function signal(input: {
  conflictId: string;
  kind: ConflictKind;
  severity: Severity;
  title: string;
  detail: string;
  evidenceRefs: string[];
  freshness?: ConflictSignal["freshness"];
  ownerAttentionRequired?: boolean;
}): ConflictSignal {
  return {
    conflictId: input.conflictId,
    kind: input.kind,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    evidenceRefs: input.evidenceRefs,
    freshness: input.freshness || "INFERRED",
    ownerAttentionRequired:
      input.ownerAttentionRequired ?? (input.severity === "CRITICAL" || input.severity === "BLOCKED"),
  };
}

function leaseUnavailable(lease: PrimaryLease): boolean {
  const id = (lease.leaseId || "").toUpperCase();
  const orch = (lease.orchestrator || "").toUpperCase();
  return !lease.leaseId || id === "UNAVAILABLE" || id === "UNKNOWN_LEASE" || orch === "UNAVAILABLE";
}

function isPrimaryRole(role: string): boolean {
  return role === "PRIMARY" || /^PRIMARY\b/i.test(role);
}

function summarize(conflicts: ConflictSignal[]): ConflictProjection["summary"] & { overviewAnswer: string } {
  const dualPrimary = conflicts.filter((item) => item.kind === "DUAL_PRIMARY" || item.kind === "CURSOR_PRIMARY").length;
  const staleLease = conflicts.filter((item) => item.kind === "STALE_LEASE" || item.kind === "EXPIRED_LEASE").length;
  const pathConflict = conflicts.filter((item) => item.kind === "PATH_CONFLICT").length;
  const worktreeDrift = conflicts.filter(
    (item) => item.kind === "CROSS_WORKTREE_DRIFT" || item.kind === "DIRTY_WORKTREE",
  ).length;
  const critical = conflicts.filter((item) => item.severity === "CRITICAL" || item.severity === "BLOCKED").length;
  const warning = conflicts.filter((item) => item.severity === "WARNING").length;
  const actionable = conflicts.filter((item) => item.freshness !== "UNAVAILABLE");
  let overviewAnswer = "NONE OBSERVED";
  if (actionable.length) {
    overviewAnswer = `${actionable.length} conflict signal(s) · ${dualPrimary} dual-primary · ${staleLease} lease · ${pathConflict} path · ${worktreeDrift} drift`;
  } else if (conflicts.some((item) => item.freshness === "UNAVAILABLE")) {
    overviewAnswer = "UNAVAILABLE — insufficient lease/agent evidence";
  }
  return {
    total: conflicts.length,
    critical,
    warning,
    dualPrimary,
    staleLease,
    pathConflict,
    worktreeDrift,
    overviewAnswer,
  };
}

/**
 * Derive structural conflict signals from snapshot fields.
 * Never invents dual-primary or path conflicts when evidence is missing —
 * emits UNAVAILABLE markers instead.
 */
export function buildConflictProjection(input: ConflictInput): ConflictProjection {
  const now = input.now || new Date();
  const conflicts: ConflictSignal[] = [];

  if (leaseUnavailable(input.primaryLease)) {
    conflicts.push(
      signal({
        conflictId: "lease-unavailable",
        kind: "STALE_LEASE",
        severity: "WARNING",
        title: "Lease identity unavailable",
        detail: "Primary lease id/orchestrator is UNAVAILABLE. Conflict detectors that need a lease will not invent a healthy PRIMARY.",
        evidenceRefs: [`leaseId:${input.primaryLease.leaseId || "MISSING"}`, `orchestrator:${input.primaryLease.orchestrator || "MISSING"}`],
        freshness: "UNAVAILABLE",
        ownerAttentionRequired: true,
      }),
    );
  } else {
    if (input.primaryLease.heartbeatFreshness === "stale") {
      conflicts.push(
        signal({
          conflictId: "lease-heartbeat-stale",
          kind: "STALE_LEASE",
          severity: "WARNING",
          title: "Lease heartbeat stale",
          detail: `Authoritative lease heartbeat is stale (${input.primaryLease.heartbeatAgeSeconds ?? "?"}s).`,
          evidenceRefs: [
            `lease:${input.primaryLease.leaseId}`,
            `heartbeatFreshness:${input.primaryLease.heartbeatFreshness}`,
          ],
        }),
      );
    } else if (
      input.primaryLease.heartbeatFreshness === "missing" ||
      input.primaryLease.heartbeatFreshness === "malformed" ||
      input.primaryLease.heartbeatFreshness === "error"
    ) {
      conflicts.push(
        signal({
          conflictId: "lease-heartbeat-unavailable",
          kind: "STALE_LEASE",
          severity: "WARNING",
          title: "Lease heartbeat unavailable",
          detail: `Lease heartbeat state is ${input.primaryLease.heartbeatFreshness}; Mission Control will not invent age 0.`,
          evidenceRefs: [`lease:${input.primaryLease.leaseId}`, `heartbeatFreshness:${input.primaryLease.heartbeatFreshness}`],
        }),
      );
    }

    if (input.primaryLease.processLiveness?.alive === false) {
      conflicts.push(
        signal({
          conflictId: "lease-process-not-observed",
          kind: "STALE_LEASE",
          severity: "WARNING",
          title: "Lease process not observed",
          detail: "The lease process was not observed alive; Mission Control does not supersede the authoritative lease.",
          evidenceRefs: [`lease:${input.primaryLease.leaseId}`, `processId:${input.primaryLease.processId || "MISSING"}`],
        }),
      );
    }

    if (input.primaryLease.expiresAt) {
      const expires = new Date(input.primaryLease.expiresAt);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() < now.getTime()) {
        conflicts.push(
          signal({
            conflictId: "lease-expired",
            kind: "EXPIRED_LEASE",
            severity: "BLOCKED",
            title: "Lease expiry in the past",
            detail: `expiresAt ${input.primaryLease.expiresAt} is before the snapshot clock.`,
            evidenceRefs: [`lease:${input.primaryLease.leaseId}`, `expiresAt:${input.primaryLease.expiresAt}`],
            ownerAttentionRequired: true,
          }),
        );
      }
    }
  }

  // Dual-primary only when agent registry is present — never invent from an empty list.
  if (input.agents.length > 0) {
    const primaries = input.agents.filter((agent) => isPrimaryRole(agent.role));
    if (primaries.length > 1) {
      conflicts.push(
        signal({
          conflictId: "dual-primary",
          kind: "DUAL_PRIMARY",
          severity: "CRITICAL",
          title: "Multiple PRIMARY role claims",
          detail: `${primaries.length} agents report PRIMARY (${primaries.map((agent) => agent.agentId).join(", ")}). Mission Control does not elect a winner.`,
          evidenceRefs: primaries.map((agent) => `agent:${agent.agentId}:role=${agent.role}`),
          ownerAttentionRequired: true,
        }),
      );
    }
    const cursorPrimary = input.agents.find((agent) => agent.agentId === "cursor" && isPrimaryRole(agent.role));
    if (cursorPrimary) {
      conflicts.push(
        signal({
          conflictId: "cursor-primary",
          kind: "CURSOR_PRIMARY",
          severity: "CRITICAL",
          title: "Cursor claims PRIMARY",
          detail: "Cursor reported PRIMARY. Cursor cannot acquire the authoritative orchestrator lease through Mission Control.",
          evidenceRefs: [`agent:cursor:role=${cursorPrimary.role}`],
          ownerAttentionRequired: true,
        }),
      );
    }
  }

  for (const incident of input.routingIncidents) {
    if (!incident.ownerDispositionRequired && !/QUARANTINE|CONTAIN/i.test(incident.containmentStatus)) continue;
    conflicts.push(
      signal({
        conflictId: `path-${incident.incidentId}`,
        kind: "PATH_CONFLICT",
        severity: incident.ownerDispositionRequired ? "BLOCKED" : "WARNING",
        title: `Routing containment · ${incident.incidentId}`,
        detail: incident.resolution || `${incident.intendedProject} → ${incident.incorrectRepository}`,
        evidenceRefs: [
          `routing:${incident.incidentId}`,
          `intended:${incident.intendedProject}`,
          `incorrect:${incident.incorrectRepository}`,
        ],
        ownerAttentionRequired: incident.ownerDispositionRequired,
      }),
    );
  }

  for (const tree of input.worktrees) {
    const quarantined =
      /QUARANTINE|UNEXPECTED|CROSS.?PROJECT/i.test(tree.role || "") ||
      /QUARANTINE/i.test(tree.observationStatus || "");
    if (quarantined) {
      conflicts.push(
        signal({
          conflictId: `quarantine-${tree.repoId}`,
          kind: "PATH_CONFLICT",
          severity: "WARNING",
          title: `Quarantined worktree · ${tree.repoId}`,
          detail: `Worktree role/observation indicates containment at ${tree.pathWindows}.`,
          evidenceRefs: [`worktree:${tree.repoId}`, `path:${tree.pathWindows}`, `role:${tree.role}`],
        }),
      );
    }
    if (tree.dirty || (tree.untracked?.length ?? 0) > 0 || tree.prunable) {
      conflicts.push(
        signal({
          conflictId: `dirty-${tree.repoId}`,
          kind: "DIRTY_WORKTREE",
          severity: "WARNING",
          title: `Dirty worktree · ${tree.repoId}`,
          detail: "Worktree reports dirty, untracked, or prunable state. File contents are not invented.",
          evidenceRefs: [
            `worktree:${tree.repoId}`,
            tree.dirty ? "dirty:true" : "dirty:false",
            `untracked:${tree.untracked?.length ?? 0}`,
          ],
        }),
      );
    }
  }

  // Cross-worktree drift: same repoId, differing branch/head.
  const byRepo = new Map<string, WorktreeNode[]>();
  for (const tree of input.worktrees) {
    const list = byRepo.get(tree.repoId) || [];
    list.push(tree);
    byRepo.set(tree.repoId, list);
  }
  for (const [repoId, trees] of byRepo) {
    if (trees.length < 2) continue;
    const heads = new Set(trees.map((tree) => tree.head || "").filter(Boolean));
    const branches = new Set(trees.map((tree) => tree.branch || "").filter(Boolean));
    if (heads.size > 1 || branches.size > 1) {
      conflicts.push(
        signal({
          conflictId: `drift-${repoId}`,
          kind: "CROSS_WORKTREE_DRIFT",
          severity: "WARNING",
          title: `Cross-worktree drift · ${repoId}`,
          detail: `${trees.length} worktrees share repoId ${repoId} with differing branch/HEAD. Mission Control does not reconcile them.`,
          evidenceRefs: trees.map(
            (tree) => `worktree:${tree.pathWindows}:branch=${tree.branch || "?"}:head=${tree.head?.slice(0, 12) || "?"}`,
          ),
        }),
      );
    }
  }

  // Projects with explicit blockers contribute path/attention context (derived only).
  for (const project of input.projects) {
    if (!project.blocker) continue;
    if (!/PATH|WORKTREE|CONFLICT|QUARANTINE|CROSS/i.test(project.blocker)) continue;
    conflicts.push(
      signal({
        conflictId: `project-blocker-${project.projectId}`,
        kind: "PATH_CONFLICT",
        severity: "WARNING",
        title: `Project blocker · ${project.name}`,
        detail: project.blocker,
        evidenceRefs: [`project:${project.projectId}`, `path:${project.canonicalPath}`],
      }),
    );
  }

  const summary = summarize(conflicts);
  return {
    conflicts,
    summary: {
      total: summary.total,
      critical: summary.critical,
      warning: summary.warning,
      dualPrimary: summary.dualPrimary,
      staleLease: summary.staleLease,
      pathConflict: summary.pathConflict,
      worktreeDrift: summary.worktreeDrift,
    },
    overviewAnswer: summary.overviewAnswer,
  };
}

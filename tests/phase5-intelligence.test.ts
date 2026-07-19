import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { summarizeApproval } from "../lib/approval-summary";
import { buildConflictProjection } from "../lib/conflicts";
import type { AgentCard, ApprovalCard, PrimaryLease, WorktreeNode } from "../lib/contracts";
import { verifyEvidenceHash } from "../lib/evidence-hash";
import { scoreApprovalRisk, scoreTaskRisk } from "../lib/risk-scoring";

function lease(overrides: Partial<PrimaryLease> = {}): PrimaryLease {
  return {
    leaseId: "lease-1",
    orchestrator: "CLAUDE",
    state: "ACTIVE",
    authority: "AUTHORITATIVE",
    heartbeatAt: new Date().toISOString(),
    heartbeatAgeSeconds: 5,
    heartbeatFreshness: "fresh",
    expiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function agent(id: string, role: string): AgentCard {
  return {
    agentId: id,
    displayName: id,
    role,
    authority: role === "PRIMARY" ? "AUTHORITATIVE" : "NON_AUTHORITATIVE",
    availabilityState: "AVAILABLE",
    verificationState: "UNVERIFIED",
    runtimePromotionPending: false,
    status: "ACTIVE",
    frozen: false,
    permittedActions: [],
    prohibitedActions: [],
    blockers: [],
    recentActions: [],
    cannotAcquireOrchestratorLease: id === "cursor",
  };
}

test("conflict projection detects dual-primary and never invents when lease unavailable", () => {
  const dual = buildConflictProjection({
    primaryLease: lease(),
    agents: [agent("claude", "PRIMARY"), agent("codex", "PRIMARY")],
    worktrees: [],
    projects: [],
    routingIncidents: [],
  });
  assert.ok(dual.conflicts.some((item) => item.kind === "DUAL_PRIMARY"));
  assert.ok(dual.conflicts.every((item) => item.freshness === "INFERRED" || item.freshness === "UNAVAILABLE"));
  assert.match(dual.overviewAnswer, /conflict/i);

  const unavailable = buildConflictProjection({
    primaryLease: lease({ leaseId: "UNAVAILABLE", orchestrator: "UNAVAILABLE" }),
    agents: [],
    worktrees: [],
    projects: [],
    routingIncidents: [],
  });
  assert.ok(unavailable.conflicts.some((item) => item.conflictId === "lease-unavailable"));
  assert.equal(unavailable.conflicts.some((item) => item.kind === "DUAL_PRIMARY"), false);
});

test("conflict projection surfaces stale lease and path/routing conflicts", () => {
  const projection = buildConflictProjection({
    primaryLease: lease({
      heartbeatFreshness: "stale",
      heartbeatAgeSeconds: 999,
      heartbeatAt: "2020-01-01T00:00:00.000Z",
    }),
    agents: [agent("claude", "PRIMARY")],
    worktrees: [],
    projects: [],
    routingIncidents: [
      {
        incidentId: "ri-1",
        intendedProject: "good",
        incorrectRepository: "D:\\wrong",
        containmentStatus: "CONTAINED",
        ownerDispositionRequired: true,
        resolution: "pending",
        verification: "UNVERIFIED",
      },
    ],
  });
  assert.ok(projection.summary.staleLease >= 1);
  assert.ok(projection.summary.pathConflict >= 1);
  assert.ok(projection.conflicts.every((item) => item.freshness !== ("AUTHORITATIVE" as typeof item.freshness)));
});

test("conflict projection detects cross-worktree drift", () => {
  const trees: WorktreeNode[] = [
    {
      repoId: "ados-mc",
      pathWindows: "D:\\a",
      role: "canonical",
      branch: "main",
      head: "aaaaaaaaaaaaaaaa",
      authority: "OBSERVED",
    },
    {
      repoId: "ados-mc",
      pathWindows: "D:\\b",
      role: "integration",
      branch: "feature/x",
      head: "bbbbbbbbbbbbbbbb",
      authority: "OBSERVED",
    },
  ];
  const projection = buildConflictProjection({
    primaryLease: lease(),
    agents: [agent("claude", "PRIMARY")],
    worktrees: trees,
    projects: [],
    routingIncidents: [],
  });
  assert.ok(projection.conflicts.some((item) => item.kind === "CROSS_WORKTREE_DRIFT"));
});

test("risk scoring is deterministic and labels INFERRED", () => {
  const approval: ApprovalCard = {
    approvalId: "a1",
    action: "DEPLOY_PRODUCTION",
    status: "PENDING",
    fileStatus: "FILED",
    authoritativeDisposition: "PENDING",
    targetSummary: "prod",
    scopeSummary: "deploy",
    affectedPaths: ["a", "b", "c", "d", "e"],
    willDo: ["ship"],
    willNotDo: ["rollback"],
    preconditions: [],
    evidenceRefs: [],
    consumed: false,
    consumptionCount: 0,
    executionLimit: 1,
    ownerActionRequired: true,
    authority: "OBSERVED",
  };
  const first = scoreApprovalRisk(approval);
  const second = scoreApprovalRisk(approval);
  assert.deepEqual(first, second);
  assert.equal(first.freshness, "INFERRED");
  assert.ok(first.band === "HIGH" || first.band === "CRITICAL");

  const taskScore = scoreTaskRisk({
    taskId: "t1",
    project: "p",
    objective: "fix",
    status: "BLOCKED",
    owner: "codex",
    reviewer: "claude",
    launchCount: 3,
    protocolStatus: "BLOCKED",
    nextPermittedAction: "wait",
    verification: "UNVERIFIED",
    dependencies: [],
    allowedPaths: [],
    prohibitedPaths: [],
    requiredGates: [],
    evidencePaths: [],
    authority: "OBSERVED",
  });
  assert.equal(taskScore.freshness, "INFERRED");
  assert.ok(["HIGH", "CRITICAL", "MEDIUM"].includes(taskScore.band));
});

test("approval summary never invents willDo entries", () => {
  const empty: ApprovalCard = {
    approvalId: "empty",
    action: "UNKNOWN",
    status: "PENDING",
    fileStatus: "FILED",
    authoritativeDisposition: "PENDING",
    targetSummary: "",
    scopeSummary: "",
    affectedPaths: [],
    willDo: [],
    willNotDo: [],
    preconditions: [],
    evidenceRefs: [],
    consumed: false,
    consumptionCount: 0,
    executionLimit: null,
    ownerActionRequired: true,
    authority: "OBSERVED",
  };
  const summary = summarizeApproval(empty);
  assert.equal(summary.freshness, "UNAVAILABLE");
  assert.match(summary.bullets.join(" "), /will not invent/i);

  const rich = summarizeApproval({
    ...empty,
    approvalId: "rich",
    action: "APPROVE_MERGE",
    willDo: ["merge PR"],
    willNotDo: ["force push"],
    affectedPaths: ["src/app.ts"],
    scopeSummary: "merge only",
  });
  assert.match(rich.headline, /APPROVE_MERGE/);
  assert.ok(rich.bullets.some((item) => /Will do/i.test(item)));
  assert.doesNotMatch(rich.bullets.join("\n"), /force rebase|invented/i);
});

test("evidence hash verify MATCH MISMATCH UNAVAILABLE without returning body", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-hash-"));
  const rel = path.join("evidence", "sample.txt");
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = "phase5-hash-fixture";
  fs.writeFileSync(abs, body);
  const digest = crypto.createHash("sha256").update(body).digest("hex");

  const match = verifyEvidenceHash({ controlPlaneRoot: root, relativePath: rel, expectedSha256: digest });
  assert.equal(match.status, "MATCH");
  assert.equal(match.contentIngested, false);
  assert.equal(match.observedSha256, digest);

  const mismatch = verifyEvidenceHash({
    controlPlaneRoot: root,
    relativePath: rel,
    expectedSha256: "0".repeat(64),
  });
  assert.equal(mismatch.status, "MISMATCH");

  const missing = verifyEvidenceHash({
    controlPlaneRoot: root,
    relativePath: "evidence/missing.txt",
    expectedSha256: digest,
  });
  assert.equal(missing.status, "UNAVAILABLE");

  const traversal = verifyEvidenceHash({
    controlPlaneRoot: root,
    relativePath: "../outside.txt",
    expectedSha256: digest,
  });
  assert.equal(traversal.status, "UNAVAILABLE");
  assert.match(traversal.detail, /traversal/i);
});

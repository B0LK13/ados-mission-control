import assert from "node:assert/strict";
import test from "node:test";
import { classifyProject, correlateEvidence, normalizeApprovalRecords, normalizeTaskRecord } from "../lib/broker/snapshot";
import type { ApprovalCard, EvidenceItem, TaskNode } from "../lib/contracts";

const now = new Date("2026-07-17T12:00:00.000Z");

test("approval request and authoritative disposition remain distinct", () => {
  const [approval] = normalizeApprovalRecords(
    [{ approvalId: "approval-1", action: "DEPLOY", status: "PENDING", expiresAt: "2026-07-18T12:00:00.000Z", target: { path: "D:\\app" } }],
    [{ approvalId: "approval-1", disposition: "APPROVED" }],
    [],
    now,
  );
  assert.equal(approval.fileStatus, "PENDING");
  assert.equal(approval.authoritativeDisposition, "APPROVED");
  assert.equal(approval.status, "APPROVED");
});

test("approval precedence handles expired, consumed, and revoked states", () => {
  const approvals = normalizeApprovalRecords(
    [
      { approvalId: "expired", status: "APPROVED", expiresAt: "2026-07-16T00:00:00.000Z" },
      { approvalId: "consumed", status: "APPROVED", expiresAt: "2026-07-18T00:00:00.000Z", singleUse: true },
      { approvalId: "revoked", status: "APPROVED", expiresAt: "2026-07-18T00:00:00.000Z" },
    ],
    [{ approvalId: "revoked", disposition: "REVOKED" }],
    [{ approvalId: "consumed", taskId: "TASK-1" }],
    now,
  );
  assert.equal(approvals.find((item) => item.approvalId === "expired")?.status, "EXPIRED");
  assert.equal(approvals.find((item) => item.approvalId === "consumed")?.status, "CONSUMED");
  assert.equal(approvals.find((item) => item.approvalId === "consumed")?.executionLimit, 1);
  assert.equal(approvals.find((item) => item.approvalId === "revoked")?.status, "REVOKED");
});

test("diagnostic evidence never becomes an authoritative success", () => {
  const task = normalizeTaskRecord(
    { taskId: "TASK-DIAGNOSTIC", status: "RUNNING", objective: "Probe runtime" },
    { status: "COMPLETED", diagnostic: true, evidenceType: "DIAGNOSTIC_ONLY" },
    "codex",
    "claude",
    now,
  );
  assert.equal(task.verification, "DIAGNOSTIC_ONLY");
  assert.equal(task.status, "UNKNOWN");
});

test("missing task fields degrade safely", () => {
  const task = normalizeTaskRecord({}, {}, "unknown", "claude", now);
  assert.equal(task.taskId, "UNKNOWN_TASK");
  assert.equal(task.project, "UNVERIFIED");
  assert.equal(task.status, "UNKNOWN");
});

test("unknown project classification is explicit", () => {
  assert.equal(classifyProject("D:\\random-dashboard", "misc", "D:\\control", "D:\\canonical"), "UNRELATED_PROJECT");
});

test("evidence metadata correlates declared task and approval references without claiming verification", () => {
  const evidence = [{ evidenceId: "e1", path: "evidence/TASK-1/report.json", trackedState: "unknown", trustFlags: ["METADATA_ONLY"], verification: "DIAGNOSTIC_ONLY", authority: "OBSERVED" }] as EvidenceItem[];
  const tasks = [{ taskId: "TASK-1", evidencePaths: ["evidence/TASK-1/report.json"] }] as TaskNode[];
  const approvals = [{ approvalId: "approval-1", evidenceRefs: ["evidence/TASK-1/report.json"] }] as ApprovalCard[];
  const [correlated] = correlateEvidence(evidence, tasks, approvals);
  assert.equal(correlated.relatedTaskId, "TASK-1");
  assert.equal(correlated.relatedApprovalId, "approval-1");
  assert.equal(correlated.confidence, "MEDIUM");
  assert.equal(correlated.verification, "REPORTED_NOT_REVERIFIED");
});

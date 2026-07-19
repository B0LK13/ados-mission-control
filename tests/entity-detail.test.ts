import assert from "node:assert/strict";
import test from "node:test";
import {
  findAgent,
  findApproval,
  findEvidence,
  findHandoff,
  findProject,
  findTask,
  findWorktree,
  notFoundResponse,
} from "../lib/api/entity-lookup";
import type { MissionSnapshot } from "../lib/contracts";
import { formatRemaining } from "../lib/lease-expiry";
import { isLoopbackHost, mutationHostAllowed } from "../lib/security/loopback";

function snapshotFixture(): MissionSnapshot {
  return {
    agents: [{ agentId: "claude" }],
    tasks: [{ taskId: "task-1" }],
    approvals: [{ approvalId: "approval-1" }],
    projects: [],
    handoffs: [{ handoffId: "handoff-1" }],
    worktrees: [{ repoId: "repo-1" }],
    evidence: [{ evidenceId: "ev-1" }],
  } as unknown as MissionSnapshot;
}

test("entity finders return matches without inventing ids", () => {
  const snapshot = snapshotFixture();
  assert.equal(findAgent(snapshot, "claude")?.agentId, "claude");
  assert.equal(findAgent(snapshot, "missing"), null);
  assert.equal(findTask(snapshot, "task-1")?.taskId, "task-1");
  assert.equal(findApproval(snapshot, "approval-1")?.approvalId, "approval-1");
  assert.equal(findProject(snapshot, "missing"), null);
  assert.equal(findHandoff(snapshot, "handoff-1")?.handoffId, "handoff-1");
  assert.equal(findWorktree(snapshot, "repo-1")?.repoId, "repo-1");
  assert.equal(findEvidence(snapshot, "ev-1")?.evidenceId, "ev-1");
});

test("notFoundResponse is a 404 Response with NOT_FOUND", async () => {
  const response = notFoundResponse("Agent", "ghost");
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.code, "NOT_FOUND");
  assert.match(body.error.message, /ghost/);
});

test("formatRemaining never invents values for bad timestamps", () => {
  assert.equal(formatRemaining("not-a-date", Date.now()), null);
  const now = Date.parse("2026-07-19T12:00:00.000Z");
  const remaining = formatRemaining("2026-07-19T12:00:30.000Z", now);
  assert.ok(remaining);
  assert.equal(remaining.overdue, false);
  assert.match(remaining.text, /30s remaining/);
  const overdue = formatRemaining("2026-07-19T11:59:00.000Z", now);
  assert.ok(overdue);
  assert.equal(overdue.overdue, true);
});

test("loopback host policy defaults deny non-loopback", () => {
  const previous = process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS;
  try {
    delete process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS;
    assert.equal(isLoopbackHost("localhost:3000"), true);
    assert.equal(isLoopbackHost("127.0.0.1"), true);
    assert.equal(isLoopbackHost("[::1]:3000"), true);
    assert.equal(isLoopbackHost("::1"), true);
    assert.equal(isLoopbackHost("evil.example"), false);
    assert.equal(isLoopbackHost(null), false);
    assert.equal(mutationHostAllowed("evil.example"), false);
    process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS = "enabled";
    assert.equal(mutationHostAllowed("evil.example"), true);
  } finally {
    if (previous === undefined) delete process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS;
    else process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS = previous;
  }
});

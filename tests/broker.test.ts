import assert from "node:assert/strict";
import test from "node:test";

test("fixture broker preserves authority and synchronous dispatch invariants", async () => {
  process.env.MISSION_CONTROL_MODE = "fixture";
  const { getMissionSnapshot } = await import("../lib/broker/snapshot");
  const snapshot = await getMissionSnapshot();
  const cursor = snapshot.agents.find((agent) => agent.agentId === "cursor");

  assert.equal(snapshot.source.mode, "FIXTURE");
  assert.equal(snapshot.primaryLease.authority, "OBSERVED");
  assert.equal(cursor?.authority, "NON_AUTHORITATIVE");
  assert.equal(cursor?.cannotAcquireOrchestratorLease, true);
  assert.equal(snapshot.protocol.dispatchModel, "SYNCHRONOUS_ADAPTER");
  assert.equal(snapshot.protocol.outboxProtocolCreated, false);
  assert.equal(snapshot.protocol.acknowledgmentSentinel, "CURSOR_TASK_ACKNOWLEDGED");
  assert.equal(snapshot.protocol.completionSentinel, "CURSOR_TASK_COMPLETED");
});

test("fixture broker exposes all home-screen operational counters", async () => {
  process.env.MISSION_CONTROL_MODE = "fixture";
  const { getMissionSnapshot } = await import("../lib/broker/snapshot");
  const snapshot = await getMissionSnapshot();

  assert.ok(snapshot.systemHealth.primaryAgent);
  assert.ok(Number.isInteger(snapshot.systemHealth.activeAgentCount));
  assert.ok(Number.isInteger(snapshot.systemHealth.pendingApprovalCount));
  assert.ok(Number.isInteger(snapshot.systemHealth.blockerCount));
  assert.ok(snapshot.tasks.length > 0);
  assert.ok(Array.isArray(snapshot.handoffs));
  assert.equal(snapshot.source.warnings[0], "Fixture mode does not report live ADOS state.");
});

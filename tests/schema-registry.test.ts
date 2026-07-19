import assert from "node:assert/strict";
import test from "node:test";
import { INPUT_SCHEMA_FAMILIES, validateInputRecords } from "../lib/ingestion/schema-registry";

test("versioned ingestion accepts legacy and V2 records", () => {
  const result = validateInputRecords("ledger-event", [
    { sequence: 1, eventType: "LEGACY_EVENT" },
    { schemaVersion: "2.0.0", sequence: 2, type: "V2_EVENT" },
    { schemaVersion: "1.0.0", eventId: "legacy-id", eventType: "LEGACY_ID_EVENT" },
  ], "events.jsonl");
  assert.equal(result.records.length, 3);
  assert.equal(result.warnings.length, 0);
});

test("unsupported versions and malformed records are isolated as warnings", () => {
  const result = validateInputRecords("approval-disposition", [
    { schemaVersion: "9.0", status: "APPROVED" },
  ], "approvals.jsonl");
  assert.equal(result.records.length, 1);
  assert.equal(result.warnings.length, 2);
  assert.ok(result.warnings.every((warning) => warning.code === "INVALID_RECORD"));
});

test("expanded families cover lease sessions tasks campaigns and gates", () => {
  const kinds = new Set(INPUT_SCHEMA_FAMILIES.map((item) => item.kind));
  for (const kind of [
    "orchestrator-lease",
    "agent-sessions",
    "project-state",
    "worktree-registry",
    "dispatch-state",
    "task-contract",
    "campaign",
    "owner-gate",
    "approval-file",
  ] as const) {
    assert.ok(kinds.has(kind), `missing family ${kind}`);
  }

  const leaseOk = validateInputRecords("orchestrator-lease", [{ leaseId: "l1", orchestrator: "claude" }], "lease.json");
  assert.equal(leaseOk.warnings.length, 0);

  const leaseBad = validateInputRecords("orchestrator-lease", [{ state: "ACTIVE" }], "lease.json");
  assert.equal(leaseBad.records.length, 1);
  assert.ok(leaseBad.warnings.some((warning) => /leaseId/i.test(warning.message)));

  const sessionsBad = validateInputRecords("agent-sessions", [{ schemaVersion: "1.0.0" }], "sessions.json");
  assert.ok(sessionsBad.warnings.some((warning) => /sessions object/i.test(warning.message)));

  const taskOk = validateInputRecords("task-contract", [{ taskId: "TASK-1", status: "RUNNING" }], "task.json");
  assert.equal(taskOk.warnings.length, 0);

  const campaignBad = validateInputRecords("campaign", [{ status: "APPROVED" }], "campaign.json");
  assert.ok(campaignBad.warnings.some((warning) => /campaignId/i.test(warning.message)));

  const gateOk = validateInputRecords("owner-gate", [{ gateId: "gate-1", status: "OPEN" }], "gate.json");
  assert.equal(gateOk.warnings.length, 0);
});

test("validation never drops records or invents authority fields", () => {
  const input = [{ schemaVersion: "9.0.0", weird: true }];
  const result = validateInputRecords("dispatch-state", input, "dispatch.json");
  assert.equal(result.records, input);
  assert.equal(result.records[0].weird, true);
  assert.equal("authority" in result.records[0], false);
  assert.ok(result.warnings.some((warning) => /Unsupported/i.test(warning.message)));
});

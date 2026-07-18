import assert from "node:assert/strict";
import test from "node:test";
import { validateInputRecords } from "../lib/ingestion/schema-registry";

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

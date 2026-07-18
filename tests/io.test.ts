import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { parseJsonLines, readJsonLines, resolveWithinRoot } from "../lib/broker/io";

test("parses valid JSONL in append order", () => {
  const result = parseJsonLines('{"sequence":1,"type":"START"}\n{"sequence":2,"type":"DONE"}\n', "ledger.jsonl");
  assert.deepEqual(result.records.map((record) => record.sequence), [1, 2]);
  assert.equal(result.warnings.length, 0);
});

test("isolates malformed and non-object JSONL records", () => {
  const result = parseJsonLines('{"sequence":1}\nnot-json\n[]\n', "ledger.jsonl");
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["MALFORMED_JSON", "INVALID_RECORD"]);
});

test("retains records with missing fields and reports duplicate sequences", () => {
  const result = parseJsonLines('{"sequence":7}\n{"sequence":7}\n{"eventType":"NO_SEQUENCE"}', "ledger.jsonl");
  assert.equal(result.records.length, 3);
  assert.equal(result.warnings[0]?.code, "DUPLICATE_SEQUENCE");
});

test("rejects path traversal outside the configured root", () => {
  assert.throws(() => resolveWithinRoot("D:\\safe-root", "..", "secret.txt"), /PATH_OUTSIDE_CONFIGURED_ROOT/);
  assert.equal(resolveWithinRoot("D:\\safe-root", "state", "event-ledger.jsonl"), path.resolve("D:\\safe-root", "state", "event-ledger.jsonl"));
});

test("missing evidence or ledger source returns a safe warning", async () => {
  const result = await readJsonLines(path.join(process.cwd(), "tests", "fixtures", "missing", "evidence.jsonl"), 10);
  assert.equal(result.records.length, 0);
  assert.equal(result.warnings[0]?.code, "SOURCE_UNAVAILABLE");
  assert.equal(result.warnings[0]?.message, "Configured source file is unavailable.");
});

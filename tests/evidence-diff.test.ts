import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadEvidenceDiff } from "../lib/evidence-diff";

const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "ados");

test("evidence-diff returns UNAVAILABLE without fabricating entries when a run is missing", async () => {
  const projection = await loadEvidenceDiff(
    fixtureRoot,
    "campaign-replay-001",
    "run-replay-001",
    "missing-run",
  );
  assert.equal(projection.freshness, "STALE");
  assert.equal(projection.left.freshness, "CACHED");
  assert.equal(projection.right.freshness, "UNAVAILABLE");
  assert.equal(projection.entries.length, 0);
  assert.equal(projection.summary.added, 0);
  assert.match(projection.warnings.join("\n"), /no fabricated diff/i);
});

test("evidence-diff compares two runs with redacted summaries", async () => {
  const projection = await loadEvidenceDiff(
    fixtureRoot,
    "campaign-replay-001",
    "run-replay-001",
    "run-replay-002",
  );
  assert.equal(projection.freshness, "CACHED");
  assert.ok(projection.summary.added >= 1);
  assert.ok(projection.summary.removed >= 1);
  assert.ok(projection.summary.changed >= 1);
  assert.ok(projection.entries.some((entry) => entry.kind === "added"));
  assert.ok(projection.entries.some((entry) => entry.kind === "removed"));
  assert.ok(projection.entries.some((entry) => entry.kind === "changed"));

  const joined = JSON.stringify(projection);
  assert.match(joined, /REDACTED/);
  assert.doesNotMatch(joined, /sk-abcdefghijklmnopqrstuvwxyz/);
});

test("evidence-diff requires identifiers", async () => {
  const projection = await loadEvidenceDiff(fixtureRoot, "", "", "");
  assert.equal(projection.freshness, "UNAVAILABLE");
  assert.equal(projection.entries.length, 0);
});

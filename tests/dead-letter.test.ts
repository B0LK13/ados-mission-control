import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { getMissionSnapshot } from "../lib/broker/snapshot";
import { buildDeadLetterProjection } from "../lib/dead-letter";
import type { MissionSnapshot } from "../lib/contracts";

async function withFixtureRoot<T>(run: () => Promise<T>): Promise<T> {
  const previous = {
    mode: process.env.MISSION_CONTROL_MODE,
    source: process.env.ADOS_CONTROL_PLANE_ROOT,
    persistence: process.env.MISSION_CONTROL_PERSISTENCE,
  };
  process.env.MISSION_CONTROL_MODE = "live";
  process.env.ADOS_CONTROL_PLANE_ROOT = path.join(process.cwd(), "tests", "fixtures", "ados");
  process.env.MISSION_CONTROL_PERSISTENCE = "disabled";
  try {
    return await run();
  } finally {
    if (previous.mode === undefined) delete process.env.MISSION_CONTROL_MODE;
    else process.env.MISSION_CONTROL_MODE = previous.mode;
    if (previous.source === undefined) delete process.env.ADOS_CONTROL_PLANE_ROOT;
    else process.env.ADOS_CONTROL_PLANE_ROOT = previous.source;
    if (previous.persistence === undefined) delete process.env.MISSION_CONTROL_PERSISTENCE;
    else process.env.MISSION_CONTROL_PERSISTENCE = previous.persistence;
  }
}

test("dead-letter projection surfaces repeated failures from fixture tasks", async () => {
  await withFixtureRoot(async () => {
    const snapshot = await getMissionSnapshot();
    const projection = buildDeadLetterProjection(snapshot);
    const repeated = projection.items.find((item) => item.taskId === "TASK-E2E-DEAD-001");
    assert.ok(repeated);
    assert.equal(repeated?.kind, "REPEATED_FAILURE");
    assert.equal(repeated?.launchCount, 3);
    assert.ok(projection.summary.repeatedFailures >= 1);
    assert.ok(repeated?.evidencePaths.length);
  });
});

test("dead-letter projection is empty when snapshot has no failure signals", () => {
  const empty = {
    freshness: "MOCK",
    tasks: [],
    handoffs: [],
    routingIncidents: [],
  } as unknown as MissionSnapshot;
  const projection = buildDeadLetterProjection(empty);
  assert.equal(projection.items.length, 0);
  assert.equal(projection.summary.repeatedFailures, 0);
  assert.match(projection.warnings.join("\n"), /No dead-letter/);
});

test("dead-letter never invents repeated failure for single-launch completed tasks", async () => {
  await withFixtureRoot(async () => {
    const snapshot = await getMissionSnapshot();
    const projection = buildDeadLetterProjection(snapshot);
    assert.equal(
      projection.items.some((item) => item.taskId === "TASK-E2E-001" && item.kind === "REPEATED_FAILURE"),
      false,
    );
  });
});

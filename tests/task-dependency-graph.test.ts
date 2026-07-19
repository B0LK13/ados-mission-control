import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { getMissionSnapshot } from "../lib/broker/snapshot";
import { buildTaskDependencyGraph } from "../lib/task-dependency-graph";
import type { TaskNode } from "../lib/contracts";

test("dependency graph uses only declared edges and marks unresolved ids", () => {
  const tasks = [
    { taskId: "A", status: "COMPLETED", dependencies: [] },
    { taskId: "B", status: "RUNNING", dependencies: ["A", "MISSING"] },
  ] as unknown as TaskNode[];
  const graph = buildTaskDependencyGraph(tasks);
  assert.equal(graph.edges.length, 2);
  assert.equal(graph.edges.filter((edge) => edge.resolved).length, 1);
  assert.deepEqual(graph.unresolvedDependencyIds, ["MISSING"]);
  assert.ok(graph.warnings.some((warning) => /unresolved|dependency/i.test(warning)));
});

test("dependency graph empty when no dependencies present", () => {
  const graph = buildTaskDependencyGraph([
    { taskId: "SOLO", status: "PENDING", dependencies: [] },
  ] as unknown as TaskNode[]);
  assert.equal(graph.edges.length, 0);
  assert.match(graph.warnings.join("\n"), /No task dependency edges/);
});

test("fixture tasks expose ROOT → TASK-E2E-001 edge", async () => {
  const previous = {
    mode: process.env.MISSION_CONTROL_MODE,
    source: process.env.ADOS_CONTROL_PLANE_ROOT,
    persistence: process.env.MISSION_CONTROL_PERSISTENCE,
  };
  process.env.MISSION_CONTROL_MODE = "live";
  process.env.ADOS_CONTROL_PLANE_ROOT = path.join(process.cwd(), "tests", "fixtures", "ados");
  process.env.MISSION_CONTROL_PERSISTENCE = "disabled";
  try {
    const snapshot = await getMissionSnapshot();
    const graph = buildTaskDependencyGraph(snapshot.tasks);
    const edge = graph.edges.find((item) => item.fromTaskId === "TASK-E2E-ROOT" && item.toTaskId === "TASK-E2E-001");
    assert.ok(edge);
    assert.equal(edge?.resolved, true);
  } finally {
    if (previous.mode === undefined) delete process.env.MISSION_CONTROL_MODE;
    else process.env.MISSION_CONTROL_MODE = previous.mode;
    if (previous.source === undefined) delete process.env.ADOS_CONTROL_PLANE_ROOT;
    else process.env.ADOS_CONTROL_PLANE_ROOT = previous.source;
    if (previous.persistence === undefined) delete process.env.MISSION_CONTROL_PERSISTENCE;
    else process.env.MISSION_CONTROL_PERSISTENCE = previous.persistence;
  }
});

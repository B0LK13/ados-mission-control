import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getMissionSnapshot } from "../lib/broker/snapshot";
import { closeReadModelStore, SqliteReadModelStore } from "../lib/read-model/sqlite-store";

test("SQLite read model persists redacted snapshots and watermarks", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mission-control-store-"));
  const previousMode = process.env.MISSION_CONTROL_MODE;
  try {
    process.env.MISSION_CONTROL_MODE = "fixture";
    const snapshot = await getMissionSnapshot();
    snapshot.source.warnings = ["Authorization: Bearer test-secret-value"];
    const store = new SqliteReadModelStore(temporaryRoot);
    try {
      const status = store.saveSnapshot(snapshot, [{ source: "fixture", cursor: "1", recordCount: 1, warningCount: 0, observedAt: snapshot.snapshotAt }]);
      const cached = store.loadLatest();
      assert.equal(status.backend, "SQLITE");
      assert.equal(status.watermarkCount, 1);
      assert.ok(cached);
      assert.doesNotMatch(JSON.stringify(cached?.snapshot), /test-secret-value/);
      assert.match(JSON.stringify(cached?.snapshot), /\[REDACTED\]/);
    } finally {
      store.close();
    }
  } finally {
    if (previousMode === undefined) delete process.env.MISSION_CONTROL_MODE;
    else process.env.MISSION_CONTROL_MODE = previousMode;
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("broker recovers a blocked stale snapshot when the ADOS source disappears", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mission-control-recovery-"));
  const previous = {
    mode: process.env.MISSION_CONTROL_MODE,
    source: process.env.ADOS_CONTROL_PLANE_ROOT,
    persistence: process.env.MISSION_CONTROL_PERSISTENCE,
    data: process.env.MISSION_CONTROL_DATA_ROOT,
  };
  try {
    process.env.MISSION_CONTROL_MODE = "live";
    process.env.ADOS_CONTROL_PLANE_ROOT = path.join(process.cwd(), "tests", "fixtures", "ados");
    process.env.MISSION_CONTROL_PERSISTENCE = "sqlite";
    process.env.MISSION_CONTROL_DATA_ROOT = temporaryRoot;
    const live = await getMissionSnapshot();
    assert.equal(live.source.stale, false);
    assert.equal(live.readModel.status, "READY");

    process.env.ADOS_CONTROL_PLANE_ROOT = path.join(temporaryRoot, "missing-source");
    const recovered = await getMissionSnapshot();
    assert.equal(recovered.source.stale, true);
    assert.equal(recovered.source.reachable, false);
    assert.equal(recovered.systemHealth.readiness, "BLOCKED");
    assert.equal(recovered.readModel.status, "STALE");
    assert.equal(recovered.readModel.recoveredFromCache, true);
  } finally {
    closeReadModelStore();
    for (const [key, value] of Object.entries(previous)) {
      const environmentKey = key === "source" ? "ADOS_CONTROL_PLANE_ROOT" : key === "persistence" ? "MISSION_CONTROL_PERSISTENCE" : key === "data" ? "MISSION_CONTROL_DATA_ROOT" : "MISSION_CONTROL_MODE";
      if (value === undefined) delete process.env[environmentKey];
      else process.env[environmentKey] = value;
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

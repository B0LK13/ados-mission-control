import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  getSharedMissionSnapshot,
  resetSharedSnapshotCache,
} from "../lib/broker/snapshot-cache";

describe("getSharedMissionSnapshot (FBL-PERF-002)", () => {
  afterEach(() => {
    resetSharedSnapshotCache();
    mock.restoreAll();
  });

  it("reuses one snapshot within the TTL window", async () => {
    process.env.MISSION_CONTROL_MODE = "fixture";
    resetSharedSnapshotCache();

    const first = await getSharedMissionSnapshot(60_000);
    const second = await getSharedMissionSnapshot(60_000);

    assert.equal(second.shared, true);
    assert.equal(second.sequence, first.sequence);
    assert.equal(second.snapshot.snapshotAt, first.snapshot.snapshotAt);
  });

  it("increments sequence after TTL expiry", async () => {
    process.env.MISSION_CONTROL_MODE = "fixture";
    resetSharedSnapshotCache();

    const first = await getSharedMissionSnapshot(1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await getSharedMissionSnapshot(1);

    assert.equal(first.shared, false);
    assert.equal(second.shared, false);
    assert.equal(second.sequence, first.sequence + 1);
  });
});

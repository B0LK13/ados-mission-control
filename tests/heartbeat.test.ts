import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeHeartbeatAge } from "../lib/broker/heartbeat";

describe("computeHeartbeatAge (FBL-MCLIVE-REL-001)", () => {
  const now = new Date("2026-07-18T16:00:00.000Z");

  it("returns missing when heartbeat absent", () => {
    assert.deepEqual(computeHeartbeatAge(undefined, now), {
      heartbeatAgeSeconds: null,
      heartbeatFreshness: "missing",
    });
  });

  it("returns malformed for non-dates", () => {
    assert.equal(computeHeartbeatAge("not-a-date", now).heartbeatFreshness, "malformed");
  });

  it("returns fresh with non-zero age when recent", () => {
    const result = computeHeartbeatAge("2026-07-18T15:59:30.000Z", now);
    assert.equal(result.heartbeatAgeSeconds, 30);
    assert.equal(result.heartbeatFreshness, "fresh");
  });

  it("returns stale when older than threshold", () => {
    const result = computeHeartbeatAge("2026-07-18T15:50:00.000Z", now, 120);
    assert.equal(result.heartbeatAgeSeconds, 600);
    assert.equal(result.heartbeatFreshness, "stale");
  });

  it("never invents age 0 for missing timestamps", () => {
    assert.equal(computeHeartbeatAge("", now).heartbeatAgeSeconds, null);
  });
});

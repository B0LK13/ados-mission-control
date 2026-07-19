import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { buildFleetProjection, isFleetModeEnabled } from "../lib/fleet";
import { resetMetricsForTests } from "../lib/metrics";
import { renderPrometheusText } from "../lib/prometheus";

function withEnv(overrides: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("fleet mode disabled by default", async () => {
  await withEnv({ MISSION_CONTROL_FLEET_MODE: undefined, MISSION_CONTROL_FLEET_CONFIG: undefined }, async () => {
    assert.equal(isFleetModeEnabled(), false);
    const projection = await buildFleetProjection();
    assert.equal(projection.enabled, false);
    assert.equal(projection.members.length, 0);
    assert.match(projection.warnings.join("\n"), /disabled/i);
  });
});

test("fleet projection probes configured members without claiming authority", async () => {
  const configPath = path.join(process.cwd(), "tests", "fixtures", "fleet", "fleet-members.json");
  await withEnv(
    {
      MISSION_CONTROL_FLEET_MODE: "enabled",
      MISSION_CONTROL_FLEET_CONFIG: configPath,
    },
    async () => {
      const projection = await buildFleetProjection();
      assert.equal(projection.enabled, true);
      assert.equal(projection.configured, true);
      assert.equal(projection.members.length, 2);
      const local = projection.members.find((member) => member.id === "fixture-local");
      const missing = projection.members.find((member) => member.id === "missing-root");
      assert.ok(local);
      assert.equal(local?.authority, "NON_AUTHORITATIVE");
      assert.equal(local?.reachable, true);
      assert.equal(missing?.reachable, false);
      assert.equal(missing?.freshness, "UNAVAILABLE");
    },
  );
});

test("prometheus exposition is counter-only and non-authoritative", () => {
  resetMetricsForTests();
  const text = renderPrometheusText({ health_requests_total: 3 });
  assert.match(text, /mission_control_info\{.*authority="observed".*\} 1/);
  assert.match(text, /mission_control_health_requests_total 3/);
  assert.doesNotMatch(text, /sk-|Bearer |PASSWORD|PRIMARY_LEASE|D:\\\\/i);
});

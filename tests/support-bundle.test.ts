import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMissionSnapshot } from "../lib/broker/snapshot";
import { buildSupportBundle } from "../lib/support-bundle";

describe("buildSupportBundle (FBL-OPS-003)", () => {
  it("emits a redacted read-only diagnostic package", async () => {
    process.env.MISSION_CONTROL_MODE = "fixture";
    process.env.MISSION_CONTROL_AUTH_MODE = "disabled";
    const snapshot = await getMissionSnapshot();
    const bundle = buildSupportBundle(snapshot, "2026-07-19T12:00:00.000Z");

    assert.equal(bundle.schemaVersion, "1.0.0");
    assert.equal(bundle.authority, "READ_ONLY");
    assert.equal(bundle.purpose, "diagnostics");
    assert.equal(bundle.application.name, "ados-mission-control");
    assert.ok(bundle.configuration.roots.length >= 4);
    assert.equal(typeof bundle.health.readiness, "string");
    assert.doesNotMatch(JSON.stringify(bundle), /MISSION_CONTROL_AUTH_SECRET|password|Bearer\s+[A-Za-z0-9]/i);
    assert.match(bundle.warnings.join(" "), /observational only/i);
  });
});

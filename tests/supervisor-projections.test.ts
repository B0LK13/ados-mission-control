import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { getMissionSnapshot } from "../lib/broker/snapshot";
import { normalizeCampaign, normalizeOwnerGate } from "../lib/broker/snapshot";
import { loadRunReplay } from "../lib/replay";

test("normalizeCampaign and normalizeOwnerGate require identifiers", () => {
  assert.equal(normalizeCampaign({ status: "APPROVED" }), null);
  assert.equal(normalizeOwnerGate({ status: "OPEN" }), null);
  const campaign = normalizeCampaign({
    campaignId: "campaign-test",
    status: "APPROVED",
    primaryRuntime: "cursor-windows",
    reviewRuntime: "claude",
    projectIds: ["ados-mission-control-v2"],
    budgets: {
      cursorLaunches: { used: 1, limit: 3 },
      claudeReviews: { used: 0, limit: 2 },
      remediations: { used: 0, limit: 2 },
    },
    policies: { pushMergeDeploy: "DENY" },
    ownerOnlyGates: ["Authorize local commit"],
  });
  assert.ok(campaign);
  assert.equal(campaign?.authority, "OBSERVED");
  assert.equal(campaign?.pushMergeDeployPolicy, "DENY");
  assert.equal(campaign?.budgets.cursorLaunches.limit, 3);

  const gate = normalizeOwnerGate({
    gateId: "gate-test",
    campaignId: "campaign-test",
    missionId: "mission-test",
    decisionType: "AUTHORIZE_LOCAL_COMMIT",
    summary: "OWNER_ACTION_REQUIRED: Authorize local commit",
    options: ["AUTHORIZE_LOCAL_COMMIT", "DENY"],
    status: "OPEN",
  });
  assert.ok(gate);
  assert.equal(gate?.ownerActionRequired, true);
});

test("live fixture root projects campaign and owner-gate cards", async () => {
  const previous = {
    mode: process.env.MISSION_CONTROL_MODE,
    source: process.env.ADOS_CONTROL_PLANE_ROOT,
    persistence: process.env.MISSION_CONTROL_PERSISTENCE,
  };
  try {
    process.env.MISSION_CONTROL_MODE = "live";
    process.env.ADOS_CONTROL_PLANE_ROOT = path.join(process.cwd(), "tests", "fixtures", "ados");
    process.env.MISSION_CONTROL_PERSISTENCE = "disabled";
    const snapshot = await getMissionSnapshot();
    assert.equal(snapshot.freshness, "LIVE");
    assert.equal(snapshot.campaigns.length, 1);
    assert.equal(snapshot.campaigns[0]?.campaignId, "campaign-e2e-pilot-001");
    assert.equal(snapshot.ownerGates.length, 1);
    assert.equal(snapshot.ownerGates[0]?.gateId, "gate-e2e-commit-001");
    assert.equal(snapshot.ownerGates[0]?.ownerActionRequired, true);
  } finally {
    if (previous.mode === undefined) delete process.env.MISSION_CONTROL_MODE;
    else process.env.MISSION_CONTROL_MODE = previous.mode;
    if (previous.source === undefined) delete process.env.ADOS_CONTROL_PLANE_ROOT;
    else process.env.ADOS_CONTROL_PLANE_ROOT = previous.source;
    if (previous.persistence === undefined) delete process.env.MISSION_CONTROL_PERSISTENCE;
    else process.env.MISSION_CONTROL_PERSISTENCE = previous.persistence;
  }
});

test("replay returns UNAVAILABLE for missing supervisor runs", async () => {
  const projection = await loadRunReplay(
    path.join(process.cwd(), "tests", "fixtures", "ados"),
    "missing-campaign",
    "missing-run",
  );
  assert.equal(projection.freshness, "UNAVAILABLE");
  assert.equal(projection.events.length, 0);
});

test("replay orders events and redacts secrets in summaries", async () => {
  const projection = await loadRunReplay(
    path.join(process.cwd(), "tests", "fixtures", "ados"),
    "campaign-replay-001",
    "run-replay-001",
  );
  assert.equal(projection.freshness, "CACHED");
  assert.equal(projection.events.length, 3);
  assert.deepEqual(
    projection.events.map((event) => event.sequence),
    [1, 2, 3],
  );
  assert.equal(projection.events[0]?.eventType, "START");
  const joined = projection.events.map((event) => event.summary).join("\n");
  assert.match(joined, /REDACTED/);
  assert.doesNotMatch(joined, /sk-abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(joined, /Bearer abcdefghijklmnop/i);
});

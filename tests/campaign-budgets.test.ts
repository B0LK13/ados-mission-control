import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCampaignBudgetPanel,
  burnPerDay,
  forecastExhaustionAt,
  remainingCapacity,
} from "../lib/campaign-budgets";
import type { CampaignCard } from "../lib/contracts";

const baseCampaign: CampaignCard = {
  campaignId: "campaign-budget-001",
  status: "APPROVED",
  primaryRuntime: "cursor-windows",
  reviewRuntime: "claude",
  projectIds: ["ados"],
  issuedAt: "2026-07-17T00:00:00.000Z",
  expiresAt: "2026-07-31T00:00:00.000Z",
  ownerApprovalRef: "approval-test",
  budgets: {
    cursorLaunches: { used: 2, limit: 6 },
    claudeReviews: { used: 0, limit: 4 },
    remediations: { used: 1, limit: 2 },
  },
  ownerOnlyGates: ["COMMIT"],
  pushMergeDeployPolicy: "DENY",
  nextAction: "Observe",
  verification: "VERIFIED_DIRECTLY",
  authority: "AUTHORITATIVE",
};

test("remainingCapacity and burn require trustworthy inputs", () => {
  assert.equal(remainingCapacity(2, 6), 4);
  assert.equal(remainingCapacity(2, 0), null);
  assert.equal(burnPerDay(2, null), null);
  assert.equal(burnPerDay(2, "not-a-date"), null);

  const now = Date.parse("2026-07-19T00:00:00.000Z");
  const burn = burnPerDay(2, "2026-07-17T00:00:00.000Z", now);
  assert.ok(burn != null);
  assert.equal(Number(burn.toFixed(2)), 1);

  const exhaustion = forecastExhaustionAt(2, 6, "2026-07-17T00:00:00.000Z", now);
  assert.equal(exhaustion, "2026-07-23T00:00:00.000Z");
});

test("budget panel reports UNAVAILABLE burn without invented rates", () => {
  const now = Date.parse("2026-07-19T12:00:00.000Z");
  const withIssue = buildCampaignBudgetPanel(baseCampaign, now);
  assert.equal(withIssue.lanes[0]?.remainingLabel, "4");
  // 2 uses over 2.5 elapsed days (issued 07-17 → now 07-19T12:00) ⇒ 0.80 / day
  assert.equal(withIssue.lanes[0]?.burnLabel, "0.80 / day");
  assert.equal(withIssue.anyForecast, true);

  const noIssue = buildCampaignBudgetPanel({ ...baseCampaign, issuedAt: null }, now);
  assert.equal(noIssue.lanes[0]?.remainingLabel, "4");
  assert.equal(noIssue.lanes[0]?.burnLabel, "UNAVAILABLE");
  assert.equal(noIssue.lanes[0]?.forecastLabel, "UNAVAILABLE");
  assert.equal(noIssue.anyForecast, false);
});

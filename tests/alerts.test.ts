import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildAlertDigest, buildAlertProjection } from "../lib/alerts/engine";
import { isAlertsEnabled } from "../lib/alerts/enabled";
import { resetAlertHistoryForTests } from "../lib/alerts/history-store";
import { evaluateAlertRules } from "../lib/alerts/rules";
import { buildAlertWebhookPayload, deliverAlertWebhook } from "../lib/alerts/webhook";
import type { MissionSnapshot } from "../lib/contracts";
import type { DeadLetterProjection } from "../lib/dead-letter";
import type { FleetProjection } from "../lib/fleet";

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

function healthySystem(overrides: Partial<MissionSnapshot["systemHealth"]> = {}): MissionSnapshot["systemHealth"] {
  return {
    severity: "SUCCESS",
    dispatchEnabled: false,
    remoteConfigured: false,
    riskLevel: "LOW",
    primaryAgent: "CLAUDE",
    primaryLeaseId: "lease-1",
    activeAgentCount: 1,
    pendingApprovalCount: 0,
    blockerCount: 0,
    latestLedgerSequence: 1,
    readiness: "READY",
    taskCounts: {},
    approvalCounts: {},
    ...overrides,
  };
}

function baseSnapshot(overrides: Partial<MissionSnapshot> = {}): MissionSnapshot {
  return {
    schemaVersion: "test",
    snapshotAt: new Date().toISOString(),
    productName: "ADOS",
    uiTitle: "test",
    systemHealth: healthySystem(),
    primaryLease: {
      leaseId: "lease-1",
      orchestrator: "CLAUDE",
      state: "ACTIVE",
      authority: "AUTHORITATIVE",
      heartbeatAt: new Date().toISOString(),
      heartbeatAgeSeconds: 3,
      heartbeatFreshness: "fresh",
    },
    agents: [],
    approvals: [],
    pendingApprovals: [],
    recentEvents: [],
    auditTimeline: [],
    alerts: [],
    conflicts: [],
    conflictSummary: {
      total: 0,
      critical: 0,
      warning: 0,
      dualPrimary: 0,
      staleLease: 0,
      pathConflict: 0,
      worktreeDrift: 0,
      overviewAnswer: "NONE",
    },
    tasks: [],
    handoffs: [],
    projects: [],
    worktrees: [],
    evidence: [],
    routingIncidents: [],
    campaigns: [],
    ownerGates: [],
    freshness: "LIVE",
    readModel: {
      backend: "DISABLED",
      status: "DISABLED",
      schemaVersion: null,
      lastPersistedAt: null,
      watermarkCount: 0,
      recoveredFromCache: false,
    },
    ownerActions: [],
    workflowSummary: { nodes: [], activeEdge: "" },
    source: {
      mode: "FIXTURE",
      configured: true,
      reachable: true,
      sourceLabel: "test",
      lastIngestAt: null,
      lastSuccessfulRefresh: null,
      parsingWarningCount: 0,
      warnings: [],
      stale: false,
    },
    protocol: {
      dispatchModel: "SYNCHRONOUS_ADAPTER",
      cursorInbox: "inbox",
      cursorCompleted: "completed",
      acknowledgmentSentinel: "CURSOR_TASK_ACKNOWLEDGED",
      completionSentinel: "CURSOR_TASK_COMPLETED",
      outboxProtocolCreated: false,
    },
    capabilities: {
      phase2Commands: false,
      phase3Commands: false,
      phase6Commands: false,
      fleetMode: false,
      alertsEnabled: true,
      ownerSigningConfigured: false,
      mutationsEnabled: false,
    },
    ...overrides,
  } as MissionSnapshot;
}

const emptyDeadLetter: DeadLetterProjection = {
  freshness: "LIVE",
  items: [],
  summary: {
    repeatedFailures: 0,
    terminalFailures: 0,
    blocked: 0,
    workerUnavailable: 0,
    routingContainment: 0,
  },
  warnings: [],
};

const emptyFleet: FleetProjection = {
  enabled: false,
  configured: false,
  members: [],
  warnings: [],
};

test("alerts flag is fail-closed by default", () => {
  delete process.env.MISSION_CONTROL_ALERTS;
  assert.equal(isAlertsEnabled(), false);
});

test("flag off returns empty/disabled projection", async () => {
  await withEnv({ MISSION_CONTROL_ALERTS: "disabled", MISSION_CONTROL_PERSISTENCE: "disabled" }, async () => {
    const projection = await buildAlertProjection({
      snapshot: baseSnapshot(),
      notify: false,
    });
    assert.equal(projection.enabled, false);
    assert.equal(projection.active.length, 0);
    assert.equal(projection.history.length, 0);
  });
});

test("rules evaluate readiness heartbeat dead-letter fleet and critical safety", () => {
  const hits = evaluateAlertRules({
    snapshot: baseSnapshot({
      systemHealth: healthySystem({
        severity: "BLOCKED",
        blockerCount: 2,
        readiness: "BLOCKED",
      }),
      primaryLease: {
        leaseId: "lease-1",
        orchestrator: "CLAUDE",
        state: "ACTIVE",
        authority: "AUTHORITATIVE",
        heartbeatFreshness: "stale",
        heartbeatAgeSeconds: 400,
        heartbeatAt: "2020-01-01T00:00:00.000Z",
      },
      alerts: [{ alertId: "dispatch-enabled", severity: "CRITICAL", code: "DISPATCH_UNEXPECTED", message: "dispatch on" }],
    }),
    deadLetter: {
      ...emptyDeadLetter,
      items: [
        {
          id: "task:x",
          kind: "REPEATED_FAILURE",
          title: "x",
          summary: "failed",
          evidencePaths: [],
          ownerActionRequired: true,
          verification: "UNVERIFIED",
          nextPermittedAction: "owner review",
          source: "task",
        },
      ],
    },
    fleet: {
      enabled: true,
      configured: true,
      members: [
        {
          id: "m1",
          label: "Member 1",
          role: "member",
          reachable: false,
          readiness: "UNAVAILABLE",
          primaryAgent: "UNAVAILABLE",
          freshness: "UNAVAILABLE",
          detail: "down",
          authority: "NON_AUTHORITATIVE",
        },
      ],
      warnings: [],
    },
  });

  const ids = new Set(hits.map((hit) => hit.ruleId));
  assert.ok(ids.has("readiness_blocked"));
  assert.ok(ids.has("heartbeat_stale"));
  assert.ok(ids.has("dead_letter_attention"));
  assert.ok(ids.has("fleet_unreachable"));
  assert.ok(ids.has("critical_safety"));
  assert.ok(hits.every((hit) => hit.authority === "NON_AUTHORITATIVE"));
  assert.ok(hits.every((hit) => hit.mutationActions.length === 0));
  assert.ok(hits.every((hit) => hit.freshness === "INFERRED"));
});

test("webhook payload is redacted and has no mutation actions", () => {
  const payload = buildAlertWebhookPayload(
    {
      ruleId: "critical_safety",
      severity: "CRITICAL",
      title: "Critical safety signal",
      detail: "Bearer sk-test-secret-value-123456 and path D:\\secret\\token",
      freshness: "INFERRED",
      fingerprint: "critical_safety:DISPATCH_UNEXPECTED",
      authority: "NON_AUTHORITATIVE",
      mutationActions: [],
    },
    "2026-07-19T12:00:00.000Z",
  );
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /sk-test-secret/);
  assert.equal(Array.isArray(payload.mutationActions), true);
  assert.equal((payload.mutationActions as unknown[]).length, 0);
  assert.equal(payload.authority, "NON_AUTHORITATIVE");
});

test("webhook delivery requires https and uses opt-in URL", async () => {
  await withEnv({ MISSION_CONTROL_ALERT_WEBHOOK_URL: undefined }, async () => {
    const local = await deliverAlertWebhook(
      {
        ruleId: "readiness_blocked",
        severity: "WARNING",
        title: "t",
        detail: "d",
        freshness: "INFERRED",
        fingerprint: "readiness_blocked:BLOCKED",
        authority: "NON_AUTHORITATIVE",
        mutationActions: [],
      },
      new Date().toISOString(),
    );
    assert.equal(local.status, "local_only");
  });

  await withEnv({ MISSION_CONTROL_ALERT_WEBHOOK_URL: "http://example.invalid/hook" }, async () => {
    const denied = await deliverAlertWebhook(
      {
        ruleId: "readiness_blocked",
        severity: "WARNING",
        title: "t",
        detail: "d",
        freshness: "INFERRED",
        fingerprint: "readiness_blocked:BLOCKED",
        authority: "NON_AUTHORITATIVE",
        mutationActions: [],
      },
      new Date().toISOString(),
    );
    assert.equal(denied.status, "failed");
    assert.match(denied.detail, /https/i);
  });

  await withEnv({ MISSION_CONTROL_ALERT_WEBHOOK_URL: "https://example.invalid/hook" }, async () => {
    const ok = await deliverAlertWebhook(
      {
        ruleId: "readiness_blocked",
        severity: "WARNING",
        title: "t",
        detail: "d",
        freshness: "INFERRED",
        fingerprint: "readiness_blocked:BLOCKED",
        authority: "NON_AUTHORITATIVE",
        mutationActions: [],
      },
      new Date().toISOString(),
      (async () => new Response(null, { status: 204 })) as typeof fetch,
    );
    assert.equal(ok.status, "delivered");
  });
});

test("enabled projection records local history without secrets and builds digest", async () => {
  const dataRoot = path.join(os.tmpdir(), `mc-alerts-${Date.now()}`);
  resetAlertHistoryForTests(dataRoot);

  await withEnv(
    {
      MISSION_CONTROL_ALERTS: "enabled",
      MISSION_CONTROL_PERSISTENCE: "disabled",
      MISSION_CONTROL_DATA_ROOT: dataRoot,
      MISSION_CONTROL_ALERT_WEBHOOK_URL: undefined,
    },
    async () => {
      const snapshot = baseSnapshot({
        systemHealth: healthySystem({
          severity: "CRITICAL",
          blockerCount: 1,
          readiness: "UNAVAILABLE",
        }),
        alerts: [
          {
            alertId: "cursor-primary",
            severity: "CRITICAL",
            code: "CURSOR_CLAIMS_LEASE",
            message: "Cursor claimed PRIMARY",
          },
        ],
      });

      const first = await buildAlertProjection({
        snapshot,
        notify: true,
        fetchImpl: (async () => new Response(null, { status: 204 })) as typeof fetch,
      });
      assert.equal(first.enabled, true);
      assert.ok(first.active.length >= 1);
      assert.ok(first.history.length >= 1);
      assert.ok(first.history.every((row) => row.deliveryStatus === "local_only"));
      assert.ok(first.active.every((hit) => hit.mutationActions.length === 0));
      assert.equal(first.authority, "NON_AUTHORITATIVE");
      assert.doesNotMatch(JSON.stringify(first), /sk-[a-z0-9]{10,}|Bearer\s+[A-Za-z0-9._-]{12,}/i);

      const second = await buildAlertProjection({ snapshot, notify: true });
      assert.equal(second.history.length, first.history.length, "dedupe should suppress repeat fires");

      const digest = buildAlertDigest(first);
      assert.equal(digest.enabled, true);
      assert.ok(digest.criticalCount >= 1);
      assert.ok(digest.top.length >= 1);
    },
  );
});

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { runApprovedDispatch, runCampaignControl } from "../lib/commands/phase3-actions";
import { middleware } from "../middleware";

function copyTree(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

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

test("phase3 dispatch stays READ_ONLY_V2 when disabled", async () => {
  await withEnv({ MISSION_CONTROL_PHASE3_COMMANDS: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled" }, async () => {
    const response = middleware(new NextRequest("http://localhost/api/v1/operations/dispatch", { method: "POST" }));
    assert.equal(response.status, 405);
    assert.equal((await response.json()).error.code, "READ_ONLY_V2");
  });
});

test("unapproved dispatch is denied", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase3-deny-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE3_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const denied = await runApprovedDispatch({
        approvalId: "approval-phase2-pending",
        taskId: "TASK-E2E-001",
        runtime: "codex",
        mode: "prepare",
      });
      assert.equal(denied.httpStatus, 403);
      assert.equal((denied.body as { error: { code: string } }).error.code, "APPROVAL_NOT_APPROVED");
    },
  );
});

test("approved dispatch prepare writes supervisor packet and ledger", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase3-ok-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE3_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const ok = await runApprovedDispatch({
        approvalId: "approval-e2e-deploy",
        taskId: "TASK-E2E-001",
        runtime: "codex",
        mode: "prepare",
        idempotencyKey: "phase3-prepare-1",
      });
      assert.equal(ok.httpStatus, 200);
      assert.equal((ok.body as { cursorPrimaryForbidden?: boolean }).cursorPrimaryForbidden, true);
      const operationId = (ok.body as { tool?: { operationId?: string } }).tool?.operationId;
      assert.ok(operationId);
      assert.ok(fs.existsSync(path.join(root, "handoffs", "supervisor", "inbox", `${operationId}.json`)));
      assert.match(fs.readFileSync(path.join(root, "state", "event-ledger.jsonl"), "utf8"), /OWNER_APPROVED_DISPATCH/);
      assert.match(fs.readFileSync(path.join(root, "state", "approval-consumptions.jsonl"), "utf8"), /approval-e2e-deploy/);
    },
  );
});

test("campaign control requires APPROVED campaign approval", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase3-camp-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);
  const approvalId = "approval-phase3-campaign-pause";
  fs.writeFileSync(
    path.join(root, "handoffs", "owner", "approvals", `${approvalId}.json`),
    JSON.stringify({
      approvalId,
      action: "PAUSE_CAMPAIGN",
      status: "PENDING",
      singleUse: false,
    }),
  );
  fs.appendFileSync(
    path.join(root, "state", "approvals.jsonl"),
    `${JSON.stringify({ approvalId, disposition: "APPROVED", status: "APPROVED" })}\n`,
  );

  await withEnv(
    {
      MISSION_CONTROL_PHASE3_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const denied = await runCampaignControl({
        approvalId: "approval-phase2-pending",
        campaignId: "campaign-e2e-pilot-001",
        control: "PAUSE",
      });
      assert.equal(denied.httpStatus, 403);

      const ok = await runCampaignControl({
        approvalId,
        campaignId: "campaign-e2e-pilot-001",
        control: "PAUSE",
      });
      assert.equal(ok.httpStatus, 200);
      assert.match(fs.readFileSync(path.join(root, "state", "campaign-controls.jsonl"), "utf8"), /PAUSE/);
    },
  );
});

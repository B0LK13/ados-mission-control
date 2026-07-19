import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import {
  runApprovedValidator,
  runIntegrationRequest,
  runReviewPickup,
} from "../lib/commands/phase6-actions";
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

test("phase6 validate stays READ_ONLY_V2 when disabled", async () => {
  await withEnv({ MISSION_CONTROL_PHASE6_COMMANDS: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled" }, async () => {
    for (const route of [
      "http://localhost/api/v1/operations/validate",
      "http://localhost/api/v1/operations/integration-request",
      "http://localhost/api/v1/operations/review-pickup",
    ]) {
      const response = middleware(new NextRequest(route, { method: "POST" }));
      assert.equal(response.status, 405);
      assert.equal((await response.json()).error.code, "READ_ONLY_V2");
    }
  });
});

test("unapproved validate is denied", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase6-deny-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE6_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const denied = await runApprovedValidator({
        approvalId: "approval-phase2-pending",
        taskId: "TASK-E2E-001",
      });
      assert.equal(denied.httpStatus, 403);
      assert.equal((denied.body as { error: { code: string } }).error.code, "APPROVAL_NOT_APPROVED");
    },
  );
});

test("action mismatch denies validate against deploy approval", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase6-mismatch-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE6_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const denied = await runApprovedValidator({
        approvalId: "approval-e2e-deploy",
        taskId: "TASK-E2E-001",
      });
      assert.equal(denied.httpStatus, 403);
      assert.equal((denied.body as { error: { code: string } }).error.code, "APPROVAL_ACTION_MISMATCH");
    },
  );
});

test("approved validate prepare writes supervisor packet and ledger", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase6-ok-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE6_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const ok = await runApprovedValidator({
        approvalId: "approval-phase6-validate",
        taskId: "TASK-E2E-001",
      });
      assert.equal(ok.httpStatus, 200);
      assert.equal((ok.body as { cursorPrimaryForbidden?: boolean }).cursorPrimaryForbidden, true);
      const operationId = (ok.body as { tool?: { operationId?: string } }).tool?.operationId;
      assert.ok(operationId);
      assert.ok(fs.existsSync(path.join(root, "handoffs", "supervisor", "inbox", `${operationId}.json`)));
      assert.match(fs.readFileSync(path.join(root, "state", "event-ledger.jsonl"), "utf8"), /OWNER_APPROVED_VALIDATOR_RUN/);
      assert.match(fs.readFileSync(path.join(root, "state", "approval-consumptions.jsonl"), "utf8"), /approval-phase6-validate/);
    },
  );
});

test("approved integration request files packets and consumes approval", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase6-int-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE6_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const ok = await runIntegrationRequest({
        approvalId: "approval-phase6-integration",
        projectId: "ados-mission-control-v2",
        summary: "Fixture integration packet",
      });
      assert.equal(ok.httpStatus, 200);
      const operationId = (ok.body as { tool?: { operationId?: string } }).tool?.operationId;
      assert.ok(operationId);
      assert.ok(fs.existsSync(path.join(root, "handoffs", "supervisor", "inbox", `${operationId}.json`)));
      assert.ok(fs.existsSync(path.join(root, "handoffs", "owner", "inbox", `${operationId}.json`)));
      assert.match(fs.readFileSync(path.join(root, "state", "event-ledger.jsonl"), "utf8"), /OWNER_APPROVED_INTEGRATION_REQUEST/);
    },
  );
});

test("approved review pickup prepares bounded packet without silent dispatch", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase6-pickup-"));
  copyTree(path.join(process.cwd(), "tests", "fixtures", "ados"), root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE6_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
      MISSION_CONTROL_PERSISTENCE: "disabled",
    },
    async () => {
      const ok = await runReviewPickup({
        approvalId: "approval-phase6-review-pickup",
        taskId: "TASK-E2E-001",
      });
      assert.equal(ok.httpStatus, 200);
      assert.equal((ok.body as { silentDispatchEnablement?: boolean }).silentDispatchEnablement, false);
      assert.equal((ok.body as { cursorPrimaryForbidden?: boolean }).cursorPrimaryForbidden, true);
      const operationId = (ok.body as { tool?: { operationId?: string } }).tool?.operationId;
      assert.ok(operationId);
      const packet = JSON.parse(
        fs.readFileSync(path.join(root, "handoffs", "supervisor", "inbox", `${operationId}.json`), "utf8"),
      ) as { silentDispatchEnablement?: boolean };
      assert.equal(packet.silentDispatchEnablement, false);
      assert.match(fs.readFileSync(path.join(root, "state", "event-ledger.jsonl"), "utf8"), /OWNER_APPROVED_REVIEW_PICKUP/);
    },
  );
});

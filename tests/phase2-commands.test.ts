import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { runApprovalDisposition } from "../lib/commands/approval-actions";
import { createOwnerGateChallenge, decideOwnerGate } from "../lib/commands/owner-gate-actions";
import { signOwnerDecision } from "../lib/commands/owner-signing";
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

function ensureFixtureKeypair(dir: string): { publicPem: string; privatePem: string; publicKeyPath: string } {
  fs.mkdirSync(dir, { recursive: true });
  const privateKeyPath = path.join(dir, "owner-ed25519-private.pem");
  const publicKeyPath = path.join(dir, "owner-ed25519-public.pem");
  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    const generated = spawnSync("openssl", ["genpkey", "-algorithm", "Ed25519", "-out", privateKeyPath], { encoding: "utf8" });
    assert.equal(generated.status, 0, generated.stderr);
    const pub = spawnSync("openssl", ["pkey", "-in", privateKeyPath, "-pubout", "-out", publicKeyPath], { encoding: "utf8" });
    assert.equal(pub.status, 0, pub.stderr);
  }
  return {
    publicPem: fs.readFileSync(publicKeyPath, "utf8"),
    privatePem: fs.readFileSync(privateKeyPath, "utf8"),
    publicKeyPath,
  };
}

test("phase2 approval routes stay READ_ONLY_V2 when commands disabled", async () => {
  await withEnv({ MISSION_CONTROL_PHASE2_COMMANDS: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled" }, async () => {
    const response = middleware(
      new NextRequest("http://localhost/api/v1/approvals/approval-phase2-pending/approve", { method: "POST" }),
    );
    assert.equal(response.status, 405);
    assert.equal((await response.json()).error.code, "READ_ONLY_V2");
  });
});

test("phase2 approval routes pass middleware when commands enabled", async () => {
  await withEnv({ MISSION_CONTROL_PHASE2_COMMANDS: "enabled", MISSION_CONTROL_AUTH_MODE: "disabled" }, () => {
    const response = middleware(
      new NextRequest("http://localhost/api/v1/approvals/approval-phase2-pending/approve", { method: "POST" }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-ados-authority"), "phase2-commands");
    assert.equal(response.headers.get("x-middleware-next"), "1");
  });
});

test("approval disposition tool appends ledger via owner actor only", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase2-approval-"));
  const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "ados");
  copyTree(fixtureRoot, root);

  await withEnv(
    {
      MISSION_CONTROL_PHASE2_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_MODE: "live",
    },
    async () => {
      const denied = await runApprovalDisposition({
        approvalId: "approval-phase2-pending",
        action: "approve",
        justification: "unit test",
        idempotencyKey: "test-1",
      });
      // actor is forced to owner inside runApprovalDisposition; tool should succeed
      assert.equal(denied.httpStatus, 200);
      assert.equal((denied.body as { ok?: boolean }).ok, true);

      const approvalsPath = path.join(root, "state", "approvals.jsonl");
      const ledgerPath = path.join(root, "state", "event-ledger.jsonl");
      assert.ok(fs.existsSync(approvalsPath));
      assert.match(fs.readFileSync(approvalsPath, "utf8"), /approval-phase2-pending/);
      assert.match(fs.readFileSync(ledgerPath, "utf8"), /OWNER_APPROVAL_DISPOSITION/);

      const agentSpawn = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts", "ados-tools", "set-owner-approval-disposition.mjs"),
          "--root",
          root,
          "--approval-id",
          "approval-phase2-pending",
          "--disposition",
          "DENIED",
          "--actor",
          "cursor",
        ],
        { encoding: "utf8" },
      );
      assert.notEqual(agentSpawn.status, 0);
      assert.match(`${agentSpawn.stdout}\n${agentSpawn.stderr}`, /NON_OWNER_ACTOR/);
    },
  );
});

test("owner-gate challenge+decide requires valid Ed25519 signature", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase2-gate-"));
  const keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-phase2-keys-"));
  const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "ados");
  copyTree(fixtureRoot, root);
  const { privatePem, publicKeyPath } = ensureFixtureKeypair(keyDir);

  // Keep gate OPEN for the tool (fresh expiry not required by tool).
  const gatePath = path.join(root, "handoffs", "owner", "inbox", "gate-e2e-commit.json");
  const gate = JSON.parse(fs.readFileSync(gatePath, "utf8"));
  gate.status = "OPEN";
  fs.writeFileSync(gatePath, `${JSON.stringify(gate, null, 2)}\n`);

  await withEnv(
    {
      MISSION_CONTROL_PHASE2_COMMANDS: "enabled",
      ADOS_CONTROL_PLANE_ROOT: root,
      MISSION_CONTROL_OWNER_PUBKEY_PATH: publicKeyPath,
      MISSION_CONTROL_MODE: "live",
    },
    async () => {
      const challengeResult = createOwnerGateChallenge({
        gateId: "gate-e2e-commit-001",
        status: "APPROVED",
        selectedOption: "AUTHORIZE_LOCAL_COMMIT",
      });
      assert.equal(challengeResult.httpStatus, 200);
      const challenge = (challengeResult.body as { challenge: Parameters<typeof signOwnerDecision>[0] }).challenge;
      assert.ok(challenge);

      const bad = await decideOwnerGate({
        gateId: "gate-e2e-commit-001",
        challenge,
        signature: Buffer.from("not-a-real-signature").toString("base64"),
      });
      assert.equal(bad.httpStatus, 403);
      assert.equal((bad.body as { error: { code: string } }).error.code, "INVALID_SIGNATURE");

      const signature = signOwnerDecision(challenge, privatePem);
      const ok = await decideOwnerGate({
        gateId: "gate-e2e-commit-001",
        challenge,
        signature,
      });
      assert.equal(ok.httpStatus, 200);
      assert.equal((ok.body as { ok?: boolean }).ok, true);

      const updated = JSON.parse(fs.readFileSync(gatePath, "utf8"));
      assert.equal(updated.status, "APPROVED");
      assert.equal(updated.decidedBy, "owner");
      assert.match(fs.readFileSync(path.join(root, "state", "event-ledger.jsonl"), "utf8"), /OWNER_GATE_DECISION/);
    },
  );
});

test("owner-gate challenge fails closed without pinned pubkey", async () => {
  await withEnv(
    {
      MISSION_CONTROL_PHASE2_COMMANDS: "enabled",
      MISSION_CONTROL_OWNER_PUBKEY_PATH: undefined,
    },
    () => {
      const result = createOwnerGateChallenge({ gateId: "gate-x", status: "DENIED" });
      assert.equal(result.httpStatus, 503);
      assert.equal((result.body as { error: { code: string } }).error.code, "OWNER_PUBKEY_REQUIRED");
    },
  );
});

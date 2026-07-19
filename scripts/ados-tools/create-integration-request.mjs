#!/usr/bin/env node
/**
 * Phase 6: create an APPROVED integration request packet (no lease/PRIMARY mutation).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  appendConsumptionAndLedger,
  arg,
  fail,
  requireApprovedOwnerOperation,
  resolveWithin,
  writeSupervisorPacket,
} from "./_lib/approval-gate.mjs";

const root = arg("root");
const approvalId = arg("approval-id");
const projectId = arg("project-id") || "";
const actor = arg("actor") || "";
const summary = arg("summary") || "";
const source = "mission-control-phase6";

const gate = requireApprovedOwnerOperation({
  root,
  approvalId,
  actor,
  source,
  actionMatchers: [/INTEGRATION/, /INTEGRATE/, /MERGE_REQUEST/],
});

if (!projectId) fail("VALIDATION_ERROR", "Required: --project-id");

const now = new Date().toISOString();
const operationId = `op-integration-${crypto.randomBytes(8).toString("hex")}`;
const packet = {
  schemaVersion: "1.0.0",
  operationId,
  operationType: "APPROVED_INTEGRATION_REQUEST",
  status: "FILED",
  approvalId,
  projectId,
  summary: summary || gate.request.justification || gate.request.action || "Integration request",
  actor: "owner",
  requestedAt: now,
  leaseMutation: false,
  cursorPrimaryForbidden: true,
  source,
};
const packetPath = writeSupervisorPacket(root, packet);

const ownerInbox = resolveWithin(root, "handoffs", "owner", "inbox");
fs.mkdirSync(ownerInbox, { recursive: true });
const ownerPacketPath = path.join(ownerInbox, `${operationId}.json`);
fs.writeFileSync(ownerPacketPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

const sequence = appendConsumptionAndLedger(root, {
  approvalId,
  operationId,
  operationType: "APPROVED_INTEGRATION_REQUEST",
  eventType: "OWNER_APPROVED_INTEGRATION_REQUEST",
  summary: `Owner filed approved integration request ${operationId} for ${projectId}.`,
  source,
  consumedAt: now,
  extra: { projectId },
  ledgerExtra: { projectId },
});

console.log(
  JSON.stringify({
    ok: true,
    operationId,
    approvalId,
    projectId,
    packetPath,
    ownerPacketPath,
    sequence,
    cursorPrimaryForbidden: true,
  }),
);

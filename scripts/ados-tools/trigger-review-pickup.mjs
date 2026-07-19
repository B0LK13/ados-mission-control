#!/usr/bin/env node
/**
 * Phase 6: bounded review pickup for already-APPROVED work (prepare only; no silent dispatch enablement).
 */
import crypto from "node:crypto";
import {
  appendConsumptionAndLedger,
  arg,
  fail,
  requireApprovedOwnerOperation,
  writeSupervisorPacket,
} from "./_lib/approval-gate.mjs";

const root = arg("root");
const approvalId = arg("approval-id");
const taskId = arg("task-id") || "";
const actor = arg("actor") || "";
const source = "mission-control-phase6";

const gate = requireApprovedOwnerOperation({
  root,
  approvalId,
  actor,
  source,
  actionMatchers: [/REVIEW_PICKUP/, /REVIEW/, /PICKUP/],
});

if (!taskId) fail("VALIDATION_ERROR", "Required: --task-id");

const now = new Date().toISOString();
const operationId = `op-review-pickup-${crypto.randomBytes(8).toString("hex")}`;
const packet = {
  schemaVersion: "1.0.0",
  operationId,
  operationType: "APPROVED_REVIEW_PICKUP",
  status: "PREPARED",
  approvalId,
  taskId,
  actor: "owner",
  requestedAt: now,
  leaseMutation: false,
  cursorPrimaryForbidden: true,
  silentDispatchEnablement: false,
  source,
};
const packetPath = writeSupervisorPacket(root, packet);
const sequence = appendConsumptionAndLedger(root, {
  approvalId,
  operationId,
  operationType: "APPROVED_REVIEW_PICKUP",
  eventType: "OWNER_APPROVED_REVIEW_PICKUP",
  summary: `Owner prepared bounded review pickup ${operationId} for ${taskId}.`,
  source,
  consumedAt: now,
  extra: { taskId },
  ledgerExtra: { taskId },
});

console.log(
  JSON.stringify({
    ok: true,
    operationId,
    approvalId,
    taskId,
    packetPath,
    sequence,
    cursorPrimaryForbidden: true,
    silentDispatchEnablement: false,
    action: gate.request.action,
  }),
);

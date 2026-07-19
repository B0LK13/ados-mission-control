#!/usr/bin/env node
/**
 * Phase 6: queue an APPROVED validator run (prepare packet only — no Cursor PRIMARY/lease).
 */
import crypto from "node:crypto";
import {
  appendConsumptionAndLedger,
  arg,
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
  actionMatchers: [/VALIDATE/, /VALIDATION/, /RUN_VALIDATOR/, /CERTIF/],
});

const now = new Date().toISOString();
const operationId = `op-validate-${crypto.randomBytes(8).toString("hex")}`;
const packet = {
  schemaVersion: "1.0.0",
  operationId,
  operationType: "APPROVED_VALIDATOR_RUN",
  status: "PREPARED",
  approvalId,
  taskId: taskId || null,
  actor: "owner",
  requestedAt: now,
  leaseMutation: false,
  cursorPrimaryForbidden: true,
  source,
};
const packetPath = writeSupervisorPacket(root, packet);
const sequence = appendConsumptionAndLedger(root, {
  approvalId,
  operationId,
  operationType: "APPROVED_VALIDATOR_RUN",
  eventType: "OWNER_APPROVED_VALIDATOR_RUN",
  summary: `Owner prepared approved validator run ${operationId}${taskId ? ` for ${taskId}` : ""}.`,
  source,
  consumedAt: now,
  extra: taskId ? { taskId } : {},
  ledgerExtra: taskId ? { taskId } : {},
});

console.log(
  JSON.stringify({
    ok: true,
    operationId,
    approvalId,
    taskId: taskId || null,
    packetPath,
    sequence,
    cursorPrimaryForbidden: true,
    action: gate.request.action,
  }),
);

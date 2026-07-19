#!/usr/bin/env node
/**
 * Phase 3: queue an already-APPROVED worker operation (prepare/queue only).
 * Fail-closed without APPROVED disposition. Never transfers orchestrator lease.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function fail(code, message) {
  console.error(JSON.stringify({ ok: false, code, message }));
  process.exit(2);
}

function resolveWithin(root, ...parts) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  const rel = path.relative(resolvedRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    fail("PATH_OUTSIDE_ROOT", `Path escapes control-plane root: ${parts.join("/")}`);
  }
  return target;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function latestDisposition(rows, approvalId) {
  let latest = null;
  for (const row of rows) {
    if (row.approvalId !== approvalId) continue;
    latest = row;
  }
  return latest;
}

const root = arg("root");
const approvalId = arg("approval-id");
const taskId = arg("task-id");
const runtime = (arg("runtime") || "cursor").toLowerCase();
const actor = (arg("actor") || "").toLowerCase();
const mode = (arg("mode") || "prepare").toLowerCase();
const idempotencyKey = arg("idempotency-key") || "";

if (!root || !approvalId || !taskId) {
  fail("VALIDATION_ERROR", "Required: --root --approval-id --task-id");
}
if (actor !== "owner") {
  fail("NON_OWNER_ACTOR", "Only actor=owner may request controlled dispatch.");
}
if (!["cursor", "codex", "kimi"].includes(runtime)) {
  fail("INVALID_RUNTIME", "runtime must be cursor|codex|kimi");
}
if (!["prepare", "queue"].includes(mode)) {
  fail("INVALID_MODE", "mode must be prepare|queue");
}

const requestPath = resolveWithin(root, "handoffs", "owner", "approvals", `${approvalId}.json`);
if (!fs.existsSync(requestPath)) {
  fail("APPROVAL_FILE_MISSING", `No approval request for ${approvalId}`);
}
const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));

const dispositions = readJsonl(resolveWithin(root, "state", "approvals.jsonl"));
const disposition = latestDisposition(dispositions, approvalId);
const dispositionStatus = String(disposition?.disposition || disposition?.status || "").toUpperCase();
if (dispositionStatus !== "APPROVED") {
  fail(
    "APPROVAL_NOT_APPROVED",
    `Dispatch denied: approval ${approvalId} disposition is ${dispositionStatus || "MISSING"} (require APPROVED).`,
  );
}

const expiresAt = request.expiresAt || disposition?.expiresAt;
if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
  fail("APPROVAL_EXPIRED", `Approval ${approvalId} is expired.`);
}

const action = String(request.action || "").toUpperCase();
const allowedOps = [
  ...(Array.isArray(request.allowedActions) ? request.allowedActions : []),
  ...(Array.isArray(request.allowedOperations) ? request.allowedOperations : []),
].map((item) => String(item).toUpperCase());
const dispatchAllowed =
  action.includes("DISPATCH") ||
  action.includes("DEPLOY") ||
  action.includes("REVIEW_PICKUP") ||
  allowedOps.includes("DISPATCH") ||
  allowedOps.includes("DISPATCH_WORKER") ||
  allowedOps.includes(runtime.toUpperCase());
if (!dispatchAllowed) {
  fail(
    "APPROVAL_ACTION_MISMATCH",
    `Approval action '${request.action}' does not authorize worker dispatch.`,
  );
}

const consumptions = readJsonl(resolveWithin(root, "state", "approval-consumptions.jsonl"));
const consumedCount = consumptions.filter((row) => row.approvalId === approvalId).length;
const singleUse = request.singleUse === true;
const limit =
  typeof request.executionCountLimit === "number"
    ? request.executionCountLimit
    : singleUse
      ? 1
      : null;
if (limit != null && consumedCount >= limit) {
  fail("APPROVAL_CONSUMED", `Approval ${approvalId} consumption limit reached (${consumedCount}/${limit}).`);
}

// Hard non-goal: Mission Control must never grant Cursor orchestrator PRIMARY/lease.
if (String(request.action || "").toUpperCase().includes("LEASE") || allowedOps.includes("LEASE_TRANSFER")) {
  fail("LEASE_MUTATION_DENIED", "Mission Control Phase 3 refuses lease transfer / PRIMARY mutations.");
}

const now = new Date().toISOString();
const operationId = `op-dispatch-${crypto.randomBytes(8).toString("hex")}`;
const packet = {
  schemaVersion: "1.0.0",
  operationId,
  operationType: "APPROVED_WORKER_DISPATCH",
  mode,
  status: mode === "queue" ? "QUEUED" : "PREPARED",
  taskId,
  runtime,
  approvalId,
  actor: "owner",
  requestedAt: now,
  idempotencyKey: idempotencyKey || null,
  leaseMutation: false,
  cursorPrimaryForbidden: true,
  source: "mission-control-phase3",
};

const outboxDir = resolveWithin(root, "handoffs", "supervisor", "inbox");
fs.mkdirSync(outboxDir, { recursive: true });
const packetPath = path.join(outboxDir, `${operationId}.json`);
fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

let queuedInboxPath = null;
if (mode === "queue") {
  const inboxDir = resolveWithin(root, "handoffs", runtime, "inbox");
  fs.mkdirSync(inboxDir, { recursive: true });
  const sourceCandidates = [
    resolveWithin(root, "handoffs", runtime, "inbox", `${taskId}.json`),
    resolveWithin(root, "handoffs", "codex", "inbox", `${taskId}.json`),
    resolveWithin(root, "handoffs", "cursor", "inbox", `${taskId}.json`),
  ];
  let source = null;
  for (const candidate of sourceCandidates) {
    if (fs.existsSync(candidate)) {
      source = candidate;
      break;
    }
  }
  if (!source) {
    fail("TASK_CONTRACT_MISSING", `No task contract found for ${taskId} to queue.`);
  }
  const contract = JSON.parse(fs.readFileSync(source, "utf8"));
  if (String(contract.ownerApprovalRef || contract.approvalRef || "") && String(contract.ownerApprovalRef || contract.approvalRef) !== approvalId) {
    // Allow when unset; when set must match
    if (contract.ownerApprovalRef || contract.approvalRef) {
      fail("TASK_APPROVAL_MISMATCH", "Task contract approval ref does not match dispatch approvalId.");
    }
  }
  contract.ownerApprovalRef = approvalId;
  contract.dispatchStatus = "QUEUED_BY_MISSION_CONTROL_PHASE3";
  contract.queuedAt = now;
  contract.queuedOperationId = operationId;
  queuedInboxPath = path.join(inboxDir, `${taskId}.json`);
  fs.writeFileSync(queuedInboxPath, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
}

const consumptionPath = resolveWithin(root, "state", "approval-consumptions.jsonl");
fs.mkdirSync(path.dirname(consumptionPath), { recursive: true });
fs.appendFileSync(
  consumptionPath,
  `${JSON.stringify({
    schemaVersion: "1.0.0",
    approvalId,
    operationId,
    taskId,
    runtime,
    consumedAt: now,
    actor: "owner",
    source: "mission-control-phase3",
  })}\n`,
  "utf8",
);

const ledgerPath = resolveWithin(root, "state", "event-ledger.jsonl");
let sequence = 1;
for (const row of readJsonl(ledgerPath)) {
  if (typeof row.sequence === "number" && row.sequence >= sequence) sequence = row.sequence + 1;
}
fs.appendFileSync(
  ledgerPath,
  `${JSON.stringify({
    sequence,
    timestamp: now,
    eventType: "OWNER_APPROVED_DISPATCH",
    severity: "INFO",
    summary: `Owner queued/prepared approved dispatch ${operationId} for ${taskId} via ${runtime}.`,
    approvalId,
    taskId,
    runtime,
    operationId,
    mode,
    actor: "owner",
    leaseMutation: false,
    source: "mission-control-phase3",
  })}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    ok: true,
    operationId,
    mode,
    approvalId,
    taskId,
    runtime,
    packetPath,
    queuedInboxPath,
    sequence,
    cursorPrimaryForbidden: true,
  }),
);

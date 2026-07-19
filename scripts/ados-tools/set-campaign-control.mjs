#!/usr/bin/env node
/**
 * Phase 3: pause/resume campaign control when backed by an APPROVED approval.
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

const root = arg("root");
const approvalId = arg("approval-id");
const campaignId = arg("campaign-id");
const control = (arg("control") || "").toUpperCase();
const actor = (arg("actor") || "").toLowerCase();

if (!root || !approvalId || !campaignId || !control) {
  fail("VALIDATION_ERROR", "Required: --root --approval-id --campaign-id --control");
}
if (actor !== "owner") fail("NON_OWNER_ACTOR", "Only actor=owner may pause/resume campaigns.");
if (!["PAUSE", "RESUME"].includes(control)) fail("INVALID_CONTROL", "control must be PAUSE|RESUME");

const requestPath = resolveWithin(root, "handoffs", "owner", "approvals", `${approvalId}.json`);
if (!fs.existsSync(requestPath)) fail("APPROVAL_FILE_MISSING", `No approval request for ${approvalId}`);
const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));
const dispositions = readJsonl(resolveWithin(root, "state", "approvals.jsonl"));
let latest = null;
for (const row of dispositions) {
  if (row.approvalId === approvalId) latest = row;
}
const status = String(latest?.disposition || latest?.status || "").toUpperCase();
if (status !== "APPROVED") {
  fail("APPROVAL_NOT_APPROVED", `Campaign control denied: disposition ${status || "MISSING"}`);
}
const action = String(request.action || "").toUpperCase();
if (!(action.includes(control) || action.includes("CAMPAIGN") || action.includes("WORKFLOW"))) {
  fail("APPROVAL_ACTION_MISMATCH", `Approval action '${request.action}' does not authorize ${control}.`);
}

const now = new Date().toISOString();
const operationId = `op-campaign-${crypto.randomBytes(8).toString("hex")}`;
const controlsPath = resolveWithin(root, "state", "campaign-controls.jsonl");
fs.mkdirSync(path.dirname(controlsPath), { recursive: true });
fs.appendFileSync(
  controlsPath,
  `${JSON.stringify({
    schemaVersion: "1.0.0",
    operationId,
    campaignId,
    control,
    approvalId,
    actor: "owner",
    decidedAt: now,
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
    eventType: "OWNER_CAMPAIGN_CONTROL",
    severity: "INFO",
    summary: `Owner ${control} campaign ${campaignId} under approval ${approvalId}.`,
    campaignId,
    control,
    approvalId,
    operationId,
    actor: "owner",
    source: "mission-control-phase3",
  })}\n`,
  "utf8",
);

console.log(JSON.stringify({ ok: true, operationId, campaignId, control, approvalId, sequence }));

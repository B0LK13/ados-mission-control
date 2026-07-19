#!/usr/bin/env node
/**
 * ADOS-aligned approval disposition tool (Node adapter for Mission Control Phase 2).
 * Appends to state/approvals.jsonl + state/event-ledger.jsonl. Never rewrites request files.
 * Does not edit arbitrary state/* beyond these two append-only ledgers.
 */
import fs from "node:fs";
import path from "node:path";

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

const root = arg("root");
const approvalId = arg("approval-id");
const disposition = (arg("disposition") || "").toUpperCase();
const actor = (arg("actor") || "").toLowerCase();
const justification = arg("justification") || "";
const idempotencyKey = arg("idempotency-key") || "";

if (!root || !approvalId || !disposition) {
  fail("VALIDATION_ERROR", "Required: --root --approval-id --disposition");
}
if (actor !== "owner") {
  fail("NON_OWNER_ACTOR", "Only actor=owner may set approval dispositions.");
}
if (!["APPROVED", "DENIED", "REVOKED"].includes(disposition)) {
  fail("INVALID_DISPOSITION", "disposition must be APPROVED|DENIED|REVOKED");
}

const requestPath = resolveWithin(root, "handoffs", "owner", "approvals", `${approvalId}.json`);
if (!fs.existsSync(requestPath)) {
  fail("APPROVAL_FILE_MISSING", `No approval request file for ${approvalId}`);
}

const approvalsPath = resolveWithin(root, "state", "approvals.jsonl");
const ledgerPath = resolveWithin(root, "state", "event-ledger.jsonl");
fs.mkdirSync(path.dirname(approvalsPath), { recursive: true });

if (fs.existsSync(approvalsPath)) {
  const prior = fs.readFileSync(approvalsPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of prior) {
    try {
      const row = JSON.parse(line);
      if (row.approvalId === approvalId && String(row.idempotencyKey || "") === idempotencyKey && idempotencyKey) {
        console.log(JSON.stringify({ ok: true, duplicate: true, approvalId, disposition: row.disposition || row.status }));
        process.exit(0);
      }
    } catch {
      /* ignore malformed historical lines */
    }
  }
}

const now = new Date().toISOString();
const dispositionRow = {
  schemaVersion: "1.0.0",
  approvalId,
  disposition,
  status: disposition,
  decidedBy: "owner",
  decidedAt: now,
  justification,
  idempotencyKey: idempotencyKey || null,
  source: "mission-control-phase2",
};

fs.appendFileSync(approvalsPath, `${JSON.stringify(dispositionRow)}\n`, "utf8");

let sequence = 1;
if (fs.existsSync(ledgerPath)) {
  const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (typeof row.sequence === "number" && row.sequence >= sequence) sequence = row.sequence + 1;
    } catch {
      /* skip malformed */
    }
  }
}

const ledgerRow = {
  sequence,
  timestamp: now,
  eventType: "OWNER_APPROVAL_DISPOSITION",
  severity: "INFO",
  summary: `Owner set ${approvalId} disposition to ${disposition}.`,
  approvalId,
  actor: "owner",
  disposition,
  idempotencyKey: idempotencyKey || null,
  source: "mission-control-phase2",
};
fs.appendFileSync(ledgerPath, `${JSON.stringify(ledgerRow)}\n`, "utf8");

console.log(JSON.stringify({ ok: true, approvalId, disposition, sequence, decidedAt: now }));

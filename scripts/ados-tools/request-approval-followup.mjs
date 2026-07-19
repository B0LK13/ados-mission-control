#!/usr/bin/env node
/**
 * ADOS-aligned approval follow-up tool (Mission Control Phase 2).
 * Records owner requests for more evidence or corrections.
 * Appends to state/approvals.jsonl + state/event-ledger.jsonl.
 * Does NOT approve, deny, revoke, or rewrite request files.
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

const KIND_TO_STATUS = {
  evidence: "EVIDENCE_REQUESTED",
  corrections: "CORRECTIONS_REQUESTED",
};

const root = arg("root");
const approvalId = arg("approval-id");
const kind = (arg("kind") || "").toLowerCase();
const actor = (arg("actor") || "").toLowerCase();
const justification = (arg("justification") || "").trim();
const idempotencyKey = arg("idempotency-key") || "";

if (!root || !approvalId || !kind) {
  fail("VALIDATION_ERROR", "Required: --root --approval-id --kind");
}
if (actor !== "owner") {
  fail("NON_OWNER_ACTOR", "Only actor=owner may request approval follow-up.");
}
if (!KIND_TO_STATUS[kind]) {
  fail("INVALID_KIND", "kind must be evidence|corrections");
}
if (justification.length < 3) {
  fail("VALIDATION_ERROR", "justification is required (min 3 chars) for follow-up requests.");
}

const status = KIND_TO_STATUS[kind];
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
        console.log(JSON.stringify({
          ok: true,
          duplicate: true,
          approvalId,
          kind,
          status: row.status || row.disposition,
        }));
        process.exit(0);
      }
    } catch {
      /* ignore malformed historical lines */
    }
  }
}

const now = new Date().toISOString();
const followupRow = {
  schemaVersion: "1.0.0",
  approvalId,
  disposition: status,
  status,
  kind,
  decidedBy: "owner",
  decidedAt: now,
  justification,
  idempotencyKey: idempotencyKey || null,
  source: "mission-control-phase2",
  followUp: true,
  terminal: false,
};

fs.appendFileSync(approvalsPath, `${JSON.stringify(followupRow)}\n`, "utf8");

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
  eventType: "OWNER_APPROVAL_FOLLOWUP",
  severity: "ATTENTION",
  summary: `Owner requested ${kind} for ${approvalId}.`,
  approvalId,
  actor: "owner",
  kind,
  disposition: status,
  justification,
  idempotencyKey: idempotencyKey || null,
  source: "mission-control-phase2",
};
fs.appendFileSync(ledgerPath, `${JSON.stringify(ledgerRow)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  approvalId,
  kind,
  status,
  sequence,
  decidedAt: now,
  terminal: false,
}));

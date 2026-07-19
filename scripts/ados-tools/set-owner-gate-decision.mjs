#!/usr/bin/env node
/**
 * Owner-gate decision writer aligned with AdosOwnerGate.psm1 semantics.
 * Agents cannot self-approve. Writes the gate file and appends owner-gates.jsonl + event-ledger.
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
const gateId = arg("gate-id");
const status = (arg("status") || "").toUpperCase();
const actor = (arg("actor") || "").toLowerCase();
const selectedOption = arg("selected-option") || "";
const signature = arg("signature") || "";
const nonce = arg("nonce") || "";
const publicKeyId = arg("public-key-id") || "";

if (!root || !gateId || !status) {
  fail("VALIDATION_ERROR", "Required: --root --gate-id --status");
}
if (["cursor", "claude", "supervisor", "system", "agent"].includes(actor)) {
  fail("AGENT_SELF_APPROVE_DENIED", "Agents cannot close owner gates.");
}
if (actor !== "owner") {
  fail("NON_OWNER_ACTOR", "Only actor=owner may close owner gates.");
}
if (!["APPROVED", "DENIED", "EXPIRED", "CANCELLED"].includes(status)) {
  fail("INVALID_STATUS", "status must be APPROVED|DENIED|EXPIRED|CANCELLED");
}
if (!signature || !nonce || !publicKeyId) {
  fail("SIGNATURE_REQUIRED", "Owner-gate decisions require signature, nonce, and public-key-id.");
}

const inboxDir = resolveWithin(root, "handoffs", "owner", "inbox");
const candidates = fs.existsSync(inboxDir)
  ? fs.readdirSync(inboxDir).filter((name) => name.endsWith(".json")).map((name) => path.join(inboxDir, name))
  : [];

let gatePath = null;
let gate = null;
for (const candidate of candidates) {
  try {
    const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
    if (parsed.gateId === gateId) {
      gatePath = candidate;
      gate = parsed;
      break;
    }
  } catch {
    /* skip */
  }
}
if (!gate || !gatePath) {
  fail("GATE_NOT_FOUND", `No open gate file for ${gateId}`);
}
if (gate.status !== "OPEN") {
  fail("GATE_NOT_OPEN", `Gate ${gateId} is ${gate.status}`);
}
const options = Array.isArray(gate.options) ? gate.options.map(String) : [];
if (selectedOption && !options.includes(selectedOption)) {
  fail("OPTION_NOT_IN_GATE", `Option not listed on gate: ${selectedOption}`);
}

const decidedAtUtc = new Date().toISOString();
const updated = {
  ...gate,
  status,
  decidedBy: "owner",
  selectedOption: selectedOption || null,
  decidedAtUtc,
  selfApproveBlocked: true,
  signature: {
    algorithm: "ed25519",
    publicKeyId,
    nonce,
    signature,
  },
};

fs.writeFileSync(gatePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

const gatesLedger = resolveWithin(root, "state", "owner-gates.jsonl");
fs.mkdirSync(path.dirname(gatesLedger), { recursive: true });
fs.appendFileSync(
  gatesLedger,
  `${JSON.stringify({
    schemaVersion: "1.0.0",
    gateId,
    status,
    selectedOption: selectedOption || null,
    decidedBy: "owner",
    decidedAtUtc,
    publicKeyId,
    nonce,
    source: "mission-control-phase2",
  })}\n`,
  "utf8",
);

const ledgerPath = resolveWithin(root, "state", "event-ledger.jsonl");
let sequence = 1;
if (fs.existsSync(ledgerPath)) {
  for (const line of fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    try {
      const row = JSON.parse(line);
      if (typeof row.sequence === "number" && row.sequence >= sequence) sequence = row.sequence + 1;
    } catch {
      /* skip */
    }
  }
}
fs.appendFileSync(
  ledgerPath,
  `${JSON.stringify({
    sequence,
    timestamp: decidedAtUtc,
    eventType: "OWNER_GATE_DECISION",
    severity: "INFO",
    summary: `Owner closed ${gateId} as ${status}.`,
    gateId,
    actor: "owner",
    status,
    selectedOption: selectedOption || null,
    source: "mission-control-phase2",
  })}\n`,
  "utf8",
);

console.log(JSON.stringify({ ok: true, gateId, status, selectedOption: selectedOption || null, sequence, decidedAtUtc }));

/**
 * Shared fail-closed APPROVED disposition checks for Phase 3/6 ADOS tools.
 */
import fs from "node:fs";
import path from "node:path";

export function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

export function fail(code, message) {
  console.error(JSON.stringify({ ok: false, code, message }));
  process.exit(2);
}

export function resolveWithin(root, ...parts) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  const rel = path.relative(resolvedRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    fail("PATH_OUTSIDE_ROOT", `Path escapes control-plane root: ${parts.join("/")}`);
  }
  return target;
}

export function readJsonl(filePath) {
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

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string} options.approvalId
 * @param {string} options.actor
 * @param {RegExp[]} options.actionMatchers - at least one must match request.action or allowedOperations
 * @param {string} [options.source]
 */
export function requireApprovedOwnerOperation(options) {
  const { root, approvalId, actor, actionMatchers, source = "mission-control" } = options;
  if (!root || !approvalId) fail("VALIDATION_ERROR", "Required: --root --approval-id");
  if (String(actor || "").toLowerCase() !== "owner") {
    fail("NON_OWNER_ACTOR", "Only actor=owner may request controlled operations.");
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
      `Denied: approval ${approvalId} disposition is ${dispositionStatus || "MISSING"} (require APPROVED).`,
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

  if (action.includes("LEASE") || allowedOps.includes("LEASE_TRANSFER") || allowedOps.includes("PRIMARY")) {
    fail("LEASE_MUTATION_DENIED", "Mission Control refuses lease transfer / PRIMARY mutations.");
  }

  const haystack = [action, ...allowedOps].join(" ");
  const matched = (actionMatchers || []).some((matcher) => matcher.test(haystack));
  if (!matched) {
    fail(
      "APPROVAL_ACTION_MISMATCH",
      `Approval action '${request.action}' does not authorize this operation.`,
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

  return { request, disposition, consumedCount, limit, source };
}

export function appendConsumptionAndLedger(root, entry) {
  const now = entry.consumedAt || new Date().toISOString();
  const consumptionPath = resolveWithin(root, "state", "approval-consumptions.jsonl");
  fs.mkdirSync(path.dirname(consumptionPath), { recursive: true });
  fs.appendFileSync(
    consumptionPath,
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      approvalId: entry.approvalId,
      operationId: entry.operationId,
      operationType: entry.operationType,
      consumedAt: now,
      actor: "owner",
      source: entry.source,
      ...(entry.extra || {}),
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
      eventType: entry.eventType,
      severity: "INFO",
      summary: entry.summary,
      approvalId: entry.approvalId,
      operationId: entry.operationId,
      actor: "owner",
      leaseMutation: false,
      cursorPrimaryForbidden: true,
      source: entry.source,
      ...(entry.ledgerExtra || {}),
    })}\n`,
    "utf8",
  );
  return sequence;
}

export function writeSupervisorPacket(root, packet) {
  const outboxDir = resolveWithin(root, "handoffs", "supervisor", "inbox");
  fs.mkdirSync(outboxDir, { recursive: true });
  const packetPath = path.join(outboxDir, `${packet.operationId}.json`);
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packetPath;
}

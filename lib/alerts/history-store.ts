/**
 * Local alert history under Mission Control dataRoot (never ADOS state/**).
 * Approved writer exception in scripts/verify-readonly.mjs.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AlertRuleId } from "@/lib/alerts/rules";
import type { Severity } from "@/lib/contracts";
import { getMissionControlConfig } from "@/lib/config";
import { redactValue, safeSummary } from "@/lib/redaction";

export type AlertDeliveryStatus = "delivered" | "failed" | "local_only" | "suppressed";

export interface AlertHistoryEntry {
  id: string;
  ruleId: AlertRuleId;
  severity: Severity;
  title: string;
  detail: string;
  fingerprint: string;
  firedAt: string;
  deliveryStatus: AlertDeliveryStatus;
  deliveryDetail?: string;
}

const MAX_HISTORY = 200;
const memoryHistory = new Map<string, AlertHistoryEntry[]>();

function historyPath(dataRoot: string): string {
  return path.join(path.resolve(dataRoot), "alerts", "history.jsonl");
}

function memoryKey(dataRoot: string): string {
  return path.resolve(dataRoot);
}

function loadFromDisk(filePath: string): AlertHistoryEntry[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as AlertHistoryEntry;
      } catch {
        return null;
      }
    })
    .filter((row): row is AlertHistoryEntry => Boolean(row?.id && row.ruleId));
}

export function listAlertHistory(limit = 50, dataRoot?: string): AlertHistoryEntry[] {
  const root = dataRoot || getMissionControlConfig().dataRoot;
  const key = memoryKey(root);
  let rows = memoryHistory.get(key);
  if (!rows) {
    rows = loadFromDisk(historyPath(root));
    memoryHistory.set(key, rows);
  }
  return rows.slice(-limit).reverse().map((row) => redactValue(row) as AlertHistoryEntry);
}

export function findRecentAlert(
  fingerprint: string,
  withinMs: number,
  dataRoot?: string,
): AlertHistoryEntry | null {
  const root = dataRoot || getMissionControlConfig().dataRoot;
  const rows = listAlertHistory(MAX_HISTORY, root);
  const cutoff = Date.now() - withinMs;
  for (const row of rows) {
    if (row.fingerprint !== fingerprint) continue;
    if (Date.parse(row.firedAt) >= cutoff) return row;
  }
  return null;
}

export function appendAlertHistory(
  entry: Omit<AlertHistoryEntry, "detail" | "title"> & { title: string; detail: string },
  dataRoot?: string,
): AlertHistoryEntry {
  const root = dataRoot || getMissionControlConfig().dataRoot;
  const key = memoryKey(root);
  const safe: AlertHistoryEntry = {
    ...entry,
    title: safeSummary(entry.title, entry.ruleId, 160),
    detail: safeSummary(entry.detail, "Alert fired.", 320),
    deliveryDetail: entry.deliveryDetail
      ? safeSummary(entry.deliveryDetail, entry.deliveryStatus, 160)
      : undefined,
  };
  const redacted = redactValue(safe) as AlertHistoryEntry;

  const rows = memoryHistory.get(key) || loadFromDisk(historyPath(root));
  rows.push(redacted);
  while (rows.length > MAX_HISTORY) rows.shift();
  memoryHistory.set(key, rows);

  if (getMissionControlConfig().persistenceMode !== "disabled") {
    const filePath = historyPath(root);
    mkdirSync(path.dirname(filePath), { recursive: true });
    appendFileSync(filePath, `${JSON.stringify(redacted)}\n`, "utf8");
  }

  return redacted;
}

/** Test helper — clear in-memory history for a data root. */
export function resetAlertHistoryForTests(dataRoot: string): void {
  memoryHistory.set(memoryKey(dataRoot), []);
}

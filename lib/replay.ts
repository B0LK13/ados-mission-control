import path from "node:path";
import type { FreshnessLabel, Severity, VerificationLabel } from "@/lib/contracts";
import { exists, readJson, readJsonLines, resolveWithinRoot } from "@/lib/broker/io";
import { redactValue, safeSummary } from "@/lib/redaction";

export interface ReplayEvent {
  timestamp: string;
  sequence: number;
  campaignId: string;
  missionId?: string | null;
  taskId?: string | null;
  runId: string;
  actor: string;
  eventType: string;
  severity: Severity;
  summary: string;
  evidenceRef?: string | null;
  verification: VerificationLabel;
}

export interface ReplayProjection {
  campaignId: string;
  runId: string;
  freshness: FreshnessLabel;
  events: ReplayEvent[];
  warnings: string[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return safeSummary(value, key);
    if (typeof value === "number") return String(value);
  }
  return "";
}

function severityOf(value: string): Severity {
  const upper = value.toUpperCase();
  if (upper.includes("CRITICAL") || upper.includes("ERROR")) return "CRITICAL";
  if (upper.includes("BLOCK")) return "BLOCKED";
  if (upper.includes("WARN")) return "WARNING";
  if (upper.includes("SUCCESS") || upper.includes("COMPLETE")) return "SUCCESS";
  return "INFO";
}

/**
 * Read-only chronological replay from evidence/supervisor-runs/<campaign>/<run>/.
 * Missing runs return freshness UNAVAILABLE with an empty event list.
 */
export async function loadRunReplay(
  orchestratorRoot: string,
  campaignId: string,
  runId: string,
): Promise<ReplayProjection> {
  const warnings: string[] = [];
  if (!campaignId.trim() || !runId.trim()) {
    return {
      campaignId: campaignId || "UNAVAILABLE",
      runId: runId || "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      events: [],
      warnings: ["campaignId and runId are required."],
    };
  }

  let runRoot: string;
  try {
    runRoot = resolveWithinRoot(orchestratorRoot, "evidence", "supervisor-runs", campaignId, runId);
  } catch {
    return {
      campaignId,
      runId,
      freshness: "UNAVAILABLE",
      events: [],
      warnings: ["Requested replay path is outside the configured control-plane root."],
    };
  }

  if (!(await exists(runRoot))) {
    return {
      campaignId,
      runId,
      freshness: "UNAVAILABLE",
      events: [],
      warnings: ["No supervisor-run evidence directory was found for the requested identifiers."],
    };
  }

  const eventFiles = [
    "supervisor-events.jsonl",
    "cursor-events.jsonl",
    "claude-review-events.jsonl",
  ];
  const events: ReplayEvent[] = [];

  for (const fileName of eventFiles) {
    const candidate = path.join(runRoot, fileName);
    if (!(await exists(candidate))) continue;
    const result = await readJsonLines(candidate, 500);
    warnings.push(...result.warnings.map((warning) => `${fileName}: ${warning.message}`));
    result.records.forEach((raw, index) => {
      const item = record(raw);
      events.push({
        timestamp: text(item, "timestamp") || "UNAVAILABLE",
        sequence: typeof item.sequence === "number" ? item.sequence : index + 1,
        campaignId: text(item, "campaignId") || campaignId,
        missionId: text(item, "missionId") || null,
        taskId: text(item, "taskId") || null,
        runId: text(item, "runId") || runId,
        actor: text(item, "actor") || path.parse(fileName).name,
        eventType: text(item, "eventType", "type") || "UNKNOWN",
        severity: severityOf(text(item, "severity")),
        summary: text(item, "summary", "message") || "Event recorded without summary.",
        evidenceRef: text(item, "evidenceRef") || null,
        verification: "REPORTED_NOT_REVERIFIED",
      });
    });
  }

  const manifestPath = path.join(runRoot, "manifest.sha256");
  if (await exists(manifestPath)) {
    const manifest = await readJson(manifestPath);
    if (!manifest) warnings.push("manifest.sha256 could not be parsed as JSON; treating as opaque text evidence.");
  }

  events.sort((left, right) => {
    const byTime = left.timestamp.localeCompare(right.timestamp);
    return byTime !== 0 ? byTime : left.sequence - right.sequence;
  });

  return redactValue({
    campaignId,
    runId,
    freshness: "CACHED" as const,
    events,
    warnings,
  }) as ReplayProjection;
}

import type { FreshnessLabel } from "@/lib/contracts";
import { loadRunReplay, type ReplayEvent, type ReplayProjection } from "@/lib/replay";
import { redactValue } from "@/lib/redaction";

export type EvidenceDiffKind = "added" | "removed" | "changed" | "unchanged";

export interface EvidenceDiffEntry {
  kind: EvidenceDiffKind;
  key: string;
  left?: ReplayEvent | null;
  right?: ReplayEvent | null;
  changes?: string[];
}

export interface EvidenceDiffProjection {
  campaignId: string;
  leftRunId: string;
  rightRunId: string;
  freshness: FreshnessLabel;
  left: Pick<ReplayProjection, "freshness" | "events" | "warnings">;
  right: Pick<ReplayProjection, "freshness" | "events" | "warnings">;
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  entries: EvidenceDiffEntry[];
  warnings: string[];
}

function eventKey(event: ReplayEvent): string {
  return `${event.sequence}:${event.eventType}:${event.actor}`;
}

function fieldChanges(left: ReplayEvent, right: ReplayEvent): string[] {
  const changes: string[] = [];
  if (left.summary !== right.summary) changes.push("summary");
  if (left.severity !== right.severity) changes.push("severity");
  if (left.timestamp !== right.timestamp) changes.push("timestamp");
  if ((left.taskId || "") !== (right.taskId || "")) changes.push("taskId");
  if ((left.evidenceRef || "") !== (right.evidenceRef || "")) changes.push("evidenceRef");
  return changes;
}

function combineFreshness(left: FreshnessLabel, right: FreshnessLabel): FreshnessLabel {
  if (left === "UNAVAILABLE" && right === "UNAVAILABLE") return "UNAVAILABLE";
  if (left === "UNAVAILABLE" || right === "UNAVAILABLE") return "STALE";
  if (left === "STALE" || right === "STALE") return "STALE";
  if (left === "CACHED" || right === "CACHED") return "CACHED";
  return left;
}

/**
 * GET-only comparison of two supervisor-run chronologies under the same campaign.
 * Missing runs stay UNAVAILABLE — never fabricate events or diffs.
 */
export async function loadEvidenceDiff(
  orchestratorRoot: string,
  campaignId: string,
  leftRunId: string,
  rightRunId: string,
): Promise<EvidenceDiffProjection> {
  const warnings: string[] = [];
  if (!campaignId.trim() || !leftRunId.trim() || !rightRunId.trim()) {
    return {
      campaignId: campaignId || "UNAVAILABLE",
      leftRunId: leftRunId || "UNAVAILABLE",
      rightRunId: rightRunId || "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      left: { freshness: "UNAVAILABLE", events: [], warnings: ["campaignId, leftRunId, and rightRunId are required."] },
      right: { freshness: "UNAVAILABLE", events: [], warnings: [] },
      summary: { added: 0, removed: 0, changed: 0, unchanged: 0 },
      entries: [],
      warnings: ["campaignId, leftRunId, and rightRunId are required."],
    };
  }

  if (leftRunId === rightRunId) {
    warnings.push("leftRunId and rightRunId are identical; diff will show only unchanged events when the run exists.");
  }

  const left = await loadRunReplay(orchestratorRoot, campaignId, leftRunId);
  const right = await loadRunReplay(orchestratorRoot, campaignId, rightRunId);
  warnings.push(...left.warnings.map((warning) => `left: ${warning}`));
  warnings.push(...right.warnings.map((warning) => `right: ${warning}`));

  const leftMap = new Map(left.events.map((event) => [eventKey(event), event]));
  const rightMap = new Map(right.events.map((event) => [eventKey(event), event]));
  const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort();

  const entries: EvidenceDiffEntry[] = [];
  const summary = { added: 0, removed: 0, changed: 0, unchanged: 0 };

  // Only emit structural diffs when both sides are available. If either side is
  // UNAVAILABLE, return empty entries so we never invent a comparison.
  const bothAvailable = left.freshness !== "UNAVAILABLE" && right.freshness !== "UNAVAILABLE";
  if (!bothAvailable) {
    if (left.freshness === "UNAVAILABLE") warnings.push("Left run is UNAVAILABLE; no fabricated diff entries.");
    if (right.freshness === "UNAVAILABLE") warnings.push("Right run is UNAVAILABLE; no fabricated diff entries.");
  } else {
    for (const key of keys) {
      const leftEvent = leftMap.get(key) || null;
      const rightEvent = rightMap.get(key) || null;
      if (leftEvent && !rightEvent) {
        summary.removed += 1;
        entries.push({ kind: "removed", key, left: leftEvent, right: null });
        continue;
      }
      if (!leftEvent && rightEvent) {
        summary.added += 1;
        entries.push({ kind: "added", key, left: null, right: rightEvent });
        continue;
      }
      if (leftEvent && rightEvent) {
        const changes = fieldChanges(leftEvent, rightEvent);
        if (changes.length) {
          summary.changed += 1;
          entries.push({ kind: "changed", key, left: leftEvent, right: rightEvent, changes });
        } else {
          summary.unchanged += 1;
          entries.push({ kind: "unchanged", key, left: leftEvent, right: rightEvent });
        }
      }
    }
  }

  return redactValue({
    campaignId,
    leftRunId,
    rightRunId,
    freshness: combineFreshness(left.freshness, right.freshness),
    left: {
      freshness: left.freshness,
      events: left.events,
      warnings: left.warnings,
    },
    right: {
      freshness: right.freshness,
      events: right.events,
      warnings: right.warnings,
    },
    summary,
    entries,
    warnings,
  }) as EvidenceDiffProjection;
}

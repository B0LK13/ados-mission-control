import type { FleetProjection } from "@/lib/fleet";
import type { DeadLetterProjection } from "@/lib/dead-letter";
import type { MissionSnapshot, Severity } from "@/lib/contracts";
import { safeSummary } from "@/lib/redaction";

export type AlertRuleId =
  | "readiness_blocked"
  | "heartbeat_stale"
  | "dead_letter_attention"
  | "fleet_unreachable"
  | "critical_safety";

export interface AlertRuleHit {
  ruleId: AlertRuleId;
  severity: Severity;
  title: string;
  detail: string;
  freshness: "INFERRED";
  fingerprint: string;
  /** Explicitly never grants mutation authority. */
  authority: "NON_AUTHORITATIVE";
  mutationActions: [];
}

export interface AlertRuleInput {
  snapshot: MissionSnapshot;
  deadLetter: DeadLetterProjection;
  fleet: FleetProjection;
}

function fingerprint(ruleId: AlertRuleId, parts: string[]): string {
  return `${ruleId}:${parts.join("|")}`;
}

/**
 * Local threshold rules over snapshot/fleet/dead-letter signals.
 * Never mutates ADOS state; outputs are redacted summaries only.
 */
export function evaluateAlertRules(input: AlertRuleInput): AlertRuleHit[] {
  const hits: AlertRuleHit[] = [];
  const { snapshot, deadLetter, fleet } = input;

  if (snapshot.systemHealth.readiness !== "READY") {
    hits.push({
      ruleId: "readiness_blocked",
      severity: snapshot.systemHealth.readiness === "UNAVAILABLE" ? "CRITICAL" : "WARNING",
      title: "Readiness not READY",
      detail: safeSummary(
        `System readiness is ${snapshot.systemHealth.readiness} (${snapshot.systemHealth.blockerCount} blockers).`,
        "Readiness signal elevated.",
      ),
      freshness: "INFERRED",
      fingerprint: fingerprint("readiness_blocked", [snapshot.systemHealth.readiness]),
      authority: "NON_AUTHORITATIVE",
      mutationActions: [],
    });
  }

  const heartbeat = snapshot.primaryLease.heartbeatFreshness || "unknown";
  if (heartbeat === "stale" || heartbeat === "missing" || heartbeat === "malformed" || heartbeat === "error") {
    hits.push({
      ruleId: "heartbeat_stale",
      severity: heartbeat === "stale" ? "WARNING" : "CRITICAL",
      title: "Lease heartbeat unhealthy",
      detail: safeSummary(
        `Primary lease heartbeat freshness is ${heartbeat}${
          snapshot.primaryLease.heartbeatAgeSeconds != null
            ? ` (age ${snapshot.primaryLease.heartbeatAgeSeconds}s)`
            : ""
        }.`,
        "Heartbeat signal elevated.",
      ),
      freshness: "INFERRED",
      fingerprint: fingerprint("heartbeat_stale", [heartbeat]),
      authority: "NON_AUTHORITATIVE",
      mutationActions: [],
    });
  }

  const attentionItems = deadLetter.items.filter((item) => item.ownerActionRequired);
  if (attentionItems.length > 0) {
    hits.push({
      ruleId: "dead_letter_attention",
      severity: "WARNING",
      title: "Dead-letter owner attention",
      detail: safeSummary(
        `${attentionItems.length} dead-letter item(s) require owner attention (repeated/blocked/containment).`,
        "Dead-letter attention required.",
      ),
      freshness: "INFERRED",
      fingerprint: fingerprint("dead_letter_attention", [String(attentionItems.length)]),
      authority: "NON_AUTHORITATIVE",
      mutationActions: [],
    });
  }

  if (fleet.enabled && fleet.configured) {
    const unreachable = fleet.members.filter((member) => !member.reachable);
    if (unreachable.length > 0) {
      hits.push({
        ruleId: "fleet_unreachable",
        severity: "WARNING",
        title: "Fleet member unreachable",
        detail: safeSummary(
          `${unreachable.length}/${fleet.members.length} fleet member(s) unreachable (non-authoritative probes).`,
          "Fleet reachability degraded.",
        ),
        freshness: "INFERRED",
        fingerprint: fingerprint(
          "fleet_unreachable",
          unreachable.map((member) => member.id).sort(),
        ),
        authority: "NON_AUTHORITATIVE",
        mutationActions: [],
      });
    }
  }

  const critical = snapshot.alerts.filter((alert) => alert.severity === "CRITICAL");
  if (critical.length > 0) {
    hits.push({
      ruleId: "critical_safety",
      severity: "CRITICAL",
      title: "Critical safety signal",
      detail: safeSummary(
        `${critical.length} critical safety alert(s): ${critical.map((alert) => alert.code).join(", ")}.`,
        "Critical safety signals present.",
      ),
      freshness: "INFERRED",
      fingerprint: fingerprint(
        "critical_safety",
        critical.map((alert) => alert.code).sort(),
      ),
      authority: "NON_AUTHORITATIVE",
      mutationActions: [],
    });
  }

  return hits;
}

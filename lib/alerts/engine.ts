import { randomBytes } from "node:crypto";
import { isAlertsEnabled } from "@/lib/alerts/enabled";
import {
  appendAlertHistory,
  findRecentAlert,
  listAlertHistory,
  type AlertHistoryEntry,
} from "@/lib/alerts/history-store";
import { evaluateAlertRules, type AlertRuleHit, type AlertRuleInput } from "@/lib/alerts/rules";
import { deliverAlertWebhook } from "@/lib/alerts/webhook";
import { buildDeadLetterProjection } from "@/lib/dead-letter";
import { buildFleetProjection } from "@/lib/fleet";
import type { MissionSnapshot } from "@/lib/contracts";
import { getMissionSnapshot } from "@/lib/broker/snapshot";

const DEDUPE_MS = 15 * 60 * 1000;

export interface AlertProjection {
  enabled: boolean;
  freshness: "INFERRED" | "UNAVAILABLE";
  authority: "NON_AUTHORITATIVE";
  active: AlertRuleHit[];
  history: AlertHistoryEntry[];
  warnings: string[];
  note: string;
}

export async function buildAlertProjection(options?: {
  snapshot?: MissionSnapshot;
  notify?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<AlertProjection> {
  if (!isAlertsEnabled()) {
    return {
      enabled: false,
      freshness: "UNAVAILABLE",
      authority: "NON_AUTHORITATIVE",
      active: [],
      history: [],
      warnings: ["MISSION_CONTROL_ALERTS is disabled (default)."],
      note: "Alerting is fail-closed. Enable MISSION_CONTROL_ALERTS=enabled after owner authorization.",
    };
  }

  const snapshot = options?.snapshot || (await getMissionSnapshot());
  const deadLetter = buildDeadLetterProjection(snapshot);
  const fleet = await buildFleetProjection();
  const input: AlertRuleInput = { snapshot, deadLetter, fleet };
  const active = evaluateAlertRules(input);
  const warnings: string[] = [];

  if (options?.notify !== false) {
    for (const hit of active) {
      const recent = findRecentAlert(hit.fingerprint, DEDUPE_MS);
      if (recent) continue;
      const firedAt = new Date().toISOString();
      const delivery = await deliverAlertWebhook(hit, firedAt, options?.fetchImpl);
      appendAlertHistory({
        id: `alert-${randomBytes(6).toString("hex")}`,
        ruleId: hit.ruleId,
        severity: hit.severity,
        title: hit.title,
        detail: hit.detail,
        fingerprint: hit.fingerprint,
        firedAt,
        deliveryStatus: delivery.status,
        deliveryDetail: delivery.detail,
      });
      if (delivery.status === "failed") warnings.push(`Webhook delivery failed for ${hit.ruleId}.`);
    }
  }

  return {
    enabled: true,
    freshness: "INFERRED",
    authority: "NON_AUTHORITATIVE",
    active,
    history: listAlertHistory(50),
    warnings,
    note: "Alert rules are derived/non-authoritative. They never approve, dispatch, or transfer lease.",
  };
}

export function buildAlertDigest(projection: AlertProjection): {
  enabled: boolean;
  criticalCount: number;
  warningCount: number;
  top: Array<{ ruleId: string; severity: string; title: string; detail: string }>;
  note: string;
} {
  if (!projection.enabled) {
    return {
      enabled: false,
      criticalCount: 0,
      warningCount: 0,
      top: [],
      note: projection.note,
    };
  }
  const criticalCount = projection.active.filter((hit) => hit.severity === "CRITICAL").length;
  const warningCount = projection.active.filter((hit) => hit.severity === "WARNING" || hit.severity === "BLOCKED").length;
  return {
    enabled: true,
    criticalCount,
    warningCount,
    top: projection.active.slice(0, 8).map((hit) => ({
      ruleId: hit.ruleId,
      severity: hit.severity,
      title: hit.title,
      detail: hit.detail,
    })),
    note: "Mobile digest — observation only; no push infrastructure.",
  };
}

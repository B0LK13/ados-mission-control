import type { AlertRuleHit } from "@/lib/alerts/rules";
import { redactValue, safeSummary } from "@/lib/redaction";

export interface WebhookDeliveryResult {
  status: "delivered" | "failed" | "local_only" | "suppressed";
  detail: string;
}

function webhookUrl(): string | null {
  const value = process.env.MISSION_CONTROL_ALERT_WEBHOOK_URL?.trim() || "";
  return value || null;
}

function webhookSecret(): string | null {
  const value = process.env.MISSION_CONTROL_ALERT_WEBHOOK_SECRET?.trim() || "";
  return value || null;
}

export function buildAlertWebhookPayload(hit: AlertRuleHit, firedAt: string): Record<string, unknown> {
  const payload = {
    schemaVersion: "1.0.0",
    kind: "mission-control-alert",
    firedAt,
    ruleId: hit.ruleId,
    severity: hit.severity,
    title: safeSummary(hit.title, hit.ruleId, 160),
    detail: safeSummary(hit.detail, "Alert fired.", 320),
    fingerprint: hit.fingerprint,
    freshness: hit.freshness,
    authority: hit.authority,
    /** Alerts never carry approve/dispatch/lease controls. */
    mutationActions: [] as string[],
    note: "Non-authoritative Mission Control alert. Does not approve, dispatch, or transfer lease.",
  };
  return redactValue(payload) as Record<string, unknown>;
}

/**
 * Opt-in outbound HTTPS webhook. Fail-closed on non-HTTPS URLs.
 * Secrets stay in env; payloads are redacted and never include mutation actions.
 */
export async function deliverAlertWebhook(
  hit: AlertRuleHit,
  firedAt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookDeliveryResult> {
  const url = webhookUrl();
  if (!url) {
    return { status: "local_only", detail: "MISSION_CONTROL_ALERT_WEBHOOK_URL unset; local history only." };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: "failed", detail: "Webhook URL is malformed." };
  }
  if (parsed.protocol !== "https:") {
    return { status: "failed", detail: "Webhook URL must use https." };
  }

  const secret = webhookSecret();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "ados-mission-control-alerts/1",
  };
  if (secret) headers["x-mission-control-alert-secret"] = secret;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(buildAlertWebhookPayload(hit, firedAt)),
    });
    if (!response.ok) {
      return { status: "failed", detail: `Webhook HTTP ${response.status}` };
    }
    return { status: "delivered", detail: `Webhook HTTP ${response.status}` };
  } catch (error) {
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "Webhook delivery failed",
    };
  }
}

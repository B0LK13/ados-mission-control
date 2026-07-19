import type { ApprovalCard, FreshnessLabel } from "@/lib/contracts";
import { scoreApprovalRisk } from "@/lib/risk-scoring";

export interface ApprovalSummary {
  approvalId: string;
  headline: string;
  bullets: string[];
  blastRadius: string;
  freshness: Extract<FreshnessLabel, "INFERRED" | "UNAVAILABLE">;
  riskBand: string;
}

function clipText(value: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/**
 * Rule-based owner-facing digest. Never invents willDo/willNotDo entries.
 */
export function summarizeApproval(approval: ApprovalCard, now: Date = new Date()): ApprovalSummary {
  const risk = scoreApprovalRisk(approval, now);
  const bullets: string[] = [];

  if (approval.willDo.length) {
    bullets.push(`Will do (${approval.willDo.length}): ${clipText(approval.willDo.slice(0, 2).join("; "))}`);
  }
  if (approval.willNotDo.length) {
    bullets.push(`Will not (${approval.willNotDo.length}): ${clipText(approval.willNotDo.slice(0, 2).join("; "))}`);
  }
  if (approval.preconditions.length) {
    bullets.push(`Preconditions: ${clipText(approval.preconditions.slice(0, 2).join("; "))}`);
  }
  for (const reason of risk.rationale.slice(0, 2)) bullets.push(reason);

  if (approval.expiresAt) bullets.push(`Expires ${approval.expiresAt}`);
  bullets.push(
    approval.consumed
      ? `Consumed ${approval.consumptionCount}/${approval.executionLimit ?? "∞"}`
      : `Unconsumed ${approval.consumptionCount}/${approval.executionLimit ?? "∞"}`,
  );

  const blastRadius = approval.affectedPaths.length
    ? `${approval.affectedPaths.length} path(s): ${clipText(approval.affectedPaths.slice(0, 3).join(", "), 100)}`
    : approval.scopeSummary?.trim()
      ? clipText(approval.scopeSummary)
      : "UNAVAILABLE";

  if (!approval.willDo.length && !approval.willNotDo.length && !approval.affectedPaths.length && !approval.scopeSummary?.trim()) {
    return {
      approvalId: approval.approvalId,
      headline: `${approval.action || "Approval"} · consequence details UNAVAILABLE`,
      bullets: ["No willDo/willNotDo/path signals were present; summary will not invent them."],
      blastRadius: "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      riskBand: risk.band,
    };
  }

  const status = approval.authoritativeDisposition || approval.status;
  return {
    approvalId: approval.approvalId,
    headline: `${approval.action || "Approval"} · ${status} · risk ${risk.band}`,
    bullets: bullets.slice(0, 6),
    blastRadius,
    freshness: risk.freshness,
    riskBand: risk.band,
  };
}

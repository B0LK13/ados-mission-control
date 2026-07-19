import type { ApprovalCard, CampaignCard, FreshnessLabel, Severity, TaskNode } from "@/lib/contracts";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNAVAILABLE";

export interface RiskScore {
  band: RiskBand;
  score: number | null;
  rationale: string[];
  freshness: Extract<FreshnessLabel, "INFERRED" | "UNAVAILABLE">;
  /** True when band came from control-plane riskLevel rather than derivation. */
  fromControlPlane: boolean;
}

const BAND_RANK: Record<RiskBand, number> = {
  UNAVAILABLE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function parseControlPlaneBand(value?: string | null): RiskBand | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "LOW" || normalized === "MEDIUM" || normalized === "HIGH" || normalized === "CRITICAL") {
    return normalized;
  }
  if (normalized === "UNAVAILABLE" || normalized === "UNRATED" || normalized === "UNVERIFIED" || normalized === "STALE_SOURCE") {
    return null;
  }
  return null;
}

function bandFromScore(score: number): RiskBand {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function maxRiskBand(bands: RiskBand[]): RiskBand {
  return bands.reduce<RiskBand>((max, band) => (BAND_RANK[band] > BAND_RANK[max] ? band : max), "LOW");
}

export function scoreApprovalRisk(approval: ApprovalCard, now: Date = new Date()): RiskScore {
  const control = parseControlPlaneBand(approval.riskLevel);
  if (control) {
    return {
      band: control,
      score: BAND_RANK[control] * 25,
      rationale: [`Control-plane riskLevel=${control}`],
      freshness: "INFERRED",
      fromControlPlane: true,
    };
  }

  let score = 10;
  const rationale: string[] = [];

  if (approval.status === "PENDING" || approval.ownerActionRequired) {
    score += 15;
    rationale.push("Owner action still required");
  }
  if (approval.affectedPaths.length >= 5) {
    score += 20;
    rationale.push(`${approval.affectedPaths.length} affected paths`);
  } else if (approval.affectedPaths.length > 0) {
    score += 8;
    rationale.push(`${approval.affectedPaths.length} affected path(s)`);
  }
  if (/DEPLOY|PUSH|MERGE|LEASE|PRIMARY|DISPATCH/i.test(`${approval.action} ${approval.scopeSummary}`)) {
    score += 25;
    rationale.push("High-impact action keywords");
  }
  if (approval.expiresAt) {
    const expires = Date.parse(approval.expiresAt);
    if (Number.isFinite(expires)) {
      const hours = (expires - now.getTime()) / 3_600_000;
      if (hours < 0) {
        score += 20;
        rationale.push("Approval expired");
      } else if (hours < 24) {
        score += 10;
        rationale.push("Expires within 24h");
      }
    }
  }
  if (approval.consumed || approval.status === "CONSUMED") {
    score += 5;
    rationale.push("Already consumed");
  }

  if (!rationale.length) {
    return {
      band: "UNAVAILABLE",
      score: null,
      rationale: ["Insufficient approval signals to derive risk"],
      freshness: "UNAVAILABLE",
      fromControlPlane: false,
    };
  }

  const band = bandFromScore(score);
  return { band, score, rationale, freshness: "INFERRED", fromControlPlane: false };
}

export function scoreTaskRisk(task: TaskNode): RiskScore {
  let score = 5;
  const rationale: string[] = [];

  if (task.status === "BLOCKED" || task.status === "FAILED") {
    score += 30;
    rationale.push(`Task status ${task.status}`);
  }
  if (task.launchCount >= 3) {
    score += 25;
    rationale.push(`Repeated launches (${task.launchCount})`);
  } else if (task.launchCount >= 2) {
    score += 12;
    rationale.push(`Relaunch count ${task.launchCount}`);
  }
  if (task.blockerClass) {
    score += 15;
    rationale.push(`Blocker class ${task.blockerClass}`);
  }
  if (/PRIMARY|LEASE|DEPLOY/i.test(task.objective)) {
    score += 20;
    rationale.push("Sensitive objective keywords");
  }
  if (task.owner.toLowerCase() === "cursor" && /PRIMARY/i.test(task.role || "")) {
    score += 40;
    rationale.push("Cursor PRIMARY role is forbidden");
  }

  if (!rationale.length && task.status === "COMPLETED") {
    return {
      band: "LOW",
      score: 5,
      rationale: ["Completed task with no elevated signals"],
      freshness: "INFERRED",
      fromControlPlane: false,
    };
  }
  if (!rationale.length) {
    return {
      band: "UNAVAILABLE",
      score: null,
      rationale: ["Insufficient task signals to derive risk"],
      freshness: "UNAVAILABLE",
      fromControlPlane: false,
    };
  }

  return { band: bandFromScore(score), score, rationale, freshness: "INFERRED", fromControlPlane: false };
}

export function scoreCampaignRisk(campaign: CampaignCard): RiskScore {
  let score = 10;
  const rationale: string[] = [];

  const { cursorLaunches, claudeReviews, remediations } = campaign.budgets;
  for (const [label, lane] of [
    ["cursor launches", cursorLaunches],
    ["claude reviews", claudeReviews],
    ["remediations", remediations],
  ] as const) {
    if (lane.limit > 0 && lane.used / lane.limit >= 0.9) {
      score += 20;
      rationale.push(`${label} ≥90% of budget`);
    } else if (lane.limit > 0 && lane.used / lane.limit >= 0.7) {
      score += 10;
      rationale.push(`${label} ≥70% of budget`);
    }
  }

  if (/PUSH|MERGE|DEPLOY/i.test(campaign.pushMergeDeployPolicy) && !/FORBIDDEN|DENIED|BLOCK/i.test(campaign.pushMergeDeployPolicy)) {
    score += 15;
    rationale.push("Push/merge/deploy policy is not clearly forbidden");
  }
  if (/BLOCK|FAIL|ERROR/i.test(campaign.status)) {
    score += 25;
    rationale.push(`Campaign status ${campaign.status}`);
  }

  if (!rationale.length) {
    return {
      band: "LOW",
      score: 10,
      rationale: ["No elevated campaign budget or policy signals"],
      freshness: "INFERRED",
      fromControlPlane: false,
    };
  }

  return { band: bandFromScore(score), score, rationale, freshness: "INFERRED", fromControlPlane: false };
}

export function severityForRisk(band: RiskBand): Severity {
  if (band === "CRITICAL") return "CRITICAL";
  if (band === "HIGH") return "BLOCKED";
  if (band === "MEDIUM") return "WARNING";
  if (band === "LOW") return "SUCCESS";
  return "INFO";
}

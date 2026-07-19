import type { CampaignBudgetSnapshot, CampaignCard } from "@/lib/contracts";

export type BudgetLaneId = "cursorLaunches" | "claudeReviews" | "remediations";

export interface BudgetLaneView {
  id: BudgetLaneId;
  label: string;
  used: number;
  limit: number;
  remaining: number | null;
  remainingLabel: string;
  utilizationPercent: number | null;
  burnPerDay: number | null;
  burnLabel: string;
  forecastExhaustionAt: string | null;
  forecastLabel: string;
}

const LANE_META: Array<{ id: BudgetLaneId; label: string }> = [
  { id: "cursorLaunches", label: "Cursor launches" },
  { id: "claudeReviews", label: "Claude reviews" },
  { id: "remediations", label: "Remediations" },
];

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseUtcMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function remainingCapacity(used: number, limit: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.max(0, limit - Math.max(0, used));
}

export function utilizationPercent(used: number, limit: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.min(100, Math.max(0, (Math.max(0, used) / limit) * 100));
}

/**
 * Burn rate is only derived when issuedAt is present and in the past.
 * Without a trustworthy start timestamp, burn/forecast stay UNAVAILABLE (never invented).
 */
export function burnPerDay(used: number, issuedAt?: string | null, nowMs: number = Date.now()): number | null {
  const start = parseUtcMs(issuedAt);
  if (start == null || nowMs <= start) return null;
  if (!Number.isFinite(used) || used < 0) return null;
  const elapsedDays = (nowMs - start) / 86_400_000;
  if (elapsedDays <= 0) return null;
  return used / elapsedDays;
}

export function forecastExhaustionAt(
  used: number,
  limit: number,
  issuedAt?: string | null,
  nowMs: number = Date.now(),
): string | null {
  const remaining = remainingCapacity(used, limit);
  const rate = burnPerDay(used, issuedAt, nowMs);
  if (remaining == null || rate == null || rate <= 0) return null;
  if (remaining === 0) return new Date(nowMs).toISOString();
  const daysLeft = remaining / rate;
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;
  return new Date(nowMs + daysLeft * 86_400_000).toISOString();
}

export function buildBudgetLaneViews(
  budgets: CampaignBudgetSnapshot,
  issuedAt?: string | null,
  nowMs: number = Date.now(),
): BudgetLaneView[] {
  return LANE_META.map(({ id, label }) => {
    const lane = budgets[id];
    const used = asFiniteNumber(lane?.used) ?? 0;
    const limit = asFiniteNumber(lane?.limit) ?? 0;
    const remaining = remainingCapacity(used, limit);
    const util = utilizationPercent(used, limit);
    const burn = burnPerDay(used, issuedAt, nowMs);
    const exhaustion = forecastExhaustionAt(used, limit, issuedAt, nowMs);
    return {
      id,
      label,
      used,
      limit,
      remaining,
      remainingLabel: remaining == null ? "UNAVAILABLE" : String(remaining),
      utilizationPercent: util,
      burnPerDay: burn,
      burnLabel: burn == null ? "UNAVAILABLE" : `${burn.toFixed(2)} / day`,
      forecastExhaustionAt: exhaustion,
      forecastLabel: exhaustion == null ? "UNAVAILABLE" : exhaustion,
    };
  });
}

export function buildCampaignBudgetPanel(campaign: CampaignCard, nowMs: number = Date.now()): {
  campaignId: string;
  issuedAt: string | null;
  lanes: BudgetLaneView[];
  anyForecast: boolean;
} {
  const issuedAt = campaign.issuedAt ?? null;
  const lanes = buildBudgetLaneViews(campaign.budgets, issuedAt, nowMs);
  return {
    campaignId: campaign.campaignId,
    issuedAt,
    lanes,
    anyForecast: lanes.some((lane) => lane.forecastExhaustionAt != null),
  };
}

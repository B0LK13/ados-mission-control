import type { FleetMemberStatus } from "@/lib/fleet";

export type FleetReachabilityFilter = "ALL" | "REACHABLE" | "UNREACHABLE";

export interface FleetFilterInput {
  reachability?: FleetReachabilityFilter;
  roleQuery?: string;
}

/**
 * Pure fleet member filter helpers (NON_AUTHORITATIVE observation only).
 */
export function filterFleetMembers(
  members: FleetMemberStatus[],
  input: FleetFilterInput = {},
): FleetMemberStatus[] {
  const reachability = input.reachability || "ALL";
  const roleQuery = (input.roleQuery || "").trim().toLowerCase();
  return members.filter((member) => {
    if (reachability === "REACHABLE" && !member.reachable) return false;
    if (reachability === "UNREACHABLE" && member.reachable) return false;
    if (roleQuery && !member.role.toLowerCase().includes(roleQuery) && !member.label.toLowerCase().includes(roleQuery)) {
      return false;
    }
    return true;
  });
}

export function groupFleetByRole(members: FleetMemberStatus[]): Record<string, FleetMemberStatus[]> {
  const groups: Record<string, FleetMemberStatus[]> = {};
  for (const member of members) {
    const key = member.role || "unspecified";
    if (!groups[key]) groups[key] = [];
    groups[key].push(member);
  }
  return groups;
}

export function formatProbeAge(probedAt: string | null | undefined, nowMs: number = Date.now()): string {
  if (!probedAt) return "UNAVAILABLE";
  const probedMs = Date.parse(probedAt);
  if (!Number.isFinite(probedMs)) return "UNAVAILABLE";
  const ageSeconds = Math.max(0, Math.floor((nowMs - probedMs) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
  return `${Math.floor(ageSeconds / 3600)}h ago`;
}

import fs from "node:fs";
import path from "node:path";
import { incrementMetric } from "@/lib/metrics";

export interface FleetMemberConfig {
  id: string;
  label: string;
  role?: string;
  controlPlaneRoot?: string;
  healthUrl?: string;
}

export interface FleetMemberStatus {
  id: string;
  label: string;
  role: string;
  reachable: boolean;
  readiness: string;
  primaryAgent: string;
  freshness: "OBSERVED" | "UNAVAILABLE";
  detail: string;
  authority: "NON_AUTHORITATIVE";
  /** ISO timestamp when this probe completed (local observation only). */
  probedAt: string;
}

export interface FleetProjection {
  enabled: boolean;
  configured: boolean;
  members: FleetMemberStatus[];
  warnings: string[];
  /** ISO timestamp for the fleet projection build (all members probed under this pass). */
  probedAt: string | null;
}

export function isFleetModeEnabled(): boolean {
  return process.env.MISSION_CONTROL_FLEET_MODE?.trim().toLowerCase() === "enabled";
}

export function loadFleetMemberConfig(configPath?: string): FleetMemberConfig[] {
  const configured = (configPath || process.env.MISSION_CONTROL_FLEET_CONFIG || "").trim();
  if (!configured) return [];
  const resolved = path.resolve(configured);
  if (!fs.existsSync(resolved)) {
    throw new Error(`FLEET_CONFIG_MISSING:${resolved}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as { members?: FleetMemberConfig[] };
  if (!Array.isArray(parsed.members)) return [];
  return parsed.members.filter((member) => member && typeof member.id === "string" && typeof member.label === "string");
}

function baseMember(
  member: FleetMemberConfig,
  overrides: Omit<FleetMemberStatus, "id" | "label" | "role" | "authority" | "probedAt"> &
    Partial<Pick<FleetMemberStatus, "role">>,
): FleetMemberStatus {
  return {
    id: member.id,
    label: member.label,
    role: overrides.role || member.role || "member",
    reachable: overrides.reachable,
    readiness: overrides.readiness,
    primaryAgent: overrides.primaryAgent,
    freshness: overrides.freshness,
    detail: overrides.detail,
    authority: "NON_AUTHORITATIVE",
    probedAt: new Date().toISOString(),
  };
}

async function probeLocalRoot(member: FleetMemberConfig): Promise<FleetMemberStatus> {
  incrementMetric("fleet_member_probes_total");
  const root = path.resolve(member.controlPlaneRoot || "");
  const leasePath = path.join(root, "state", "orchestrator-lease.json");
  try {
    if (!fs.existsSync(root)) {
      return baseMember(member, {
        reachable: false,
        readiness: "UNAVAILABLE",
        primaryAgent: "UNAVAILABLE",
        freshness: "UNAVAILABLE",
        detail: "controlPlaneRoot does not exist",
      });
    }
    let primaryAgent = "UNAVAILABLE";
    let readiness = "UNKNOWN";
    if (fs.existsSync(leasePath)) {
      const lease = JSON.parse(fs.readFileSync(leasePath, "utf8")) as Record<string, unknown>;
      primaryAgent = String(lease.orchestrator || lease.primaryAgent || "UNAVAILABLE");
      readiness = String(lease.state || "OBSERVED");
    } else {
      readiness = "LEASE_MISSING";
    }
    return baseMember(member, {
      reachable: true,
      readiness,
      primaryAgent,
      freshness: "OBSERVED",
      detail: "Local filesystem probe (non-authoritative for this cockpit)",
    });
  } catch (error) {
    return baseMember(member, {
      reachable: false,
      readiness: "UNAVAILABLE",
      primaryAgent: "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "local probe failed",
    });
  }
}

async function probeHealthUrl(member: FleetMemberConfig): Promise<FleetMemberStatus> {
  incrementMetric("fleet_member_probes_total");
  const url = member.healthUrl || "";
  try {
    const response = await fetch(url, { method: "GET", headers: { accept: "application/json" }, signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return baseMember(member, {
        reachable: false,
        readiness: `HTTP_${response.status}`,
        primaryAgent: "UNAVAILABLE",
        freshness: "UNAVAILABLE",
        detail: `healthUrl returned ${response.status}`,
      });
    }
    const body = (await response.json()) as Record<string, unknown>;
    return baseMember(member, {
      reachable: Boolean(body.dataSourceReachable ?? body.status === "ok"),
      readiness: String(body.status || "UNKNOWN"),
      primaryAgent: "REMOTE",
      freshness: "OBSERVED",
      detail: "Remote /api/health probe (never inherits local PRIMARY authority)",
    });
  } catch (error) {
    return baseMember(member, {
      reachable: false,
      readiness: "UNAVAILABLE",
      primaryAgent: "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "remote probe failed",
    });
  }
}

async function probeMember(member: FleetMemberConfig): Promise<FleetMemberStatus> {
  if (member.healthUrl) return probeHealthUrl(member);
  if (member.controlPlaneRoot) return probeLocalRoot(member);
  return baseMember(member, {
    reachable: false,
    readiness: "UNAVAILABLE",
    primaryAgent: "UNAVAILABLE",
    freshness: "UNAVAILABLE",
    detail: "Member lacks controlPlaneRoot and healthUrl",
  });
}

export async function buildFleetProjection(): Promise<FleetProjection> {
  if (!isFleetModeEnabled()) {
    return {
      enabled: false,
      configured: false,
      members: [],
      warnings: ["Fleet mode is disabled. Set MISSION_CONTROL_FLEET_MODE=enabled and MISSION_CONTROL_FLEET_CONFIG to activate."],
      probedAt: null,
    };
  }

  try {
    const configs = loadFleetMemberConfig();
    if (!configs.length) {
      return {
        enabled: true,
        configured: false,
        members: [],
        warnings: ["Fleet mode enabled but no members were listed in the fleet config."],
        probedAt: null,
      };
    }
    // P8-02: probe members in parallel (was sequential await). Same authority semantics.
    const members = await Promise.all(configs.map((member) => probeMember(member)));
    return { enabled: true, configured: true, members, warnings: [], probedAt: new Date().toISOString() };
  } catch (error) {
    return {
      enabled: true,
      configured: false,
      members: [],
      warnings: [error instanceof Error ? error.message : "Fleet config failed"],
      probedAt: null,
    };
  }
}

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
}

export interface FleetProjection {
  enabled: boolean;
  configured: boolean;
  members: FleetMemberStatus[];
  warnings: string[];
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

async function probeLocalRoot(member: FleetMemberConfig): Promise<FleetMemberStatus> {
  incrementMetric("fleet_member_probes_total");
  const root = path.resolve(member.controlPlaneRoot || "");
  const leasePath = path.join(root, "state", "orchestrator-lease.json");
  try {
    if (!fs.existsSync(root)) {
      return {
        id: member.id,
        label: member.label,
        role: member.role || "member",
        reachable: false,
        readiness: "UNAVAILABLE",
        primaryAgent: "UNAVAILABLE",
        freshness: "UNAVAILABLE",
        detail: "controlPlaneRoot does not exist",
        authority: "NON_AUTHORITATIVE",
      };
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
    return {
      id: member.id,
      label: member.label,
      role: member.role || "member",
      reachable: true,
      readiness,
      primaryAgent,
      freshness: "OBSERVED",
      detail: "Local filesystem probe (non-authoritative for this cockpit)",
      authority: "NON_AUTHORITATIVE",
    };
  } catch (error) {
    return {
      id: member.id,
      label: member.label,
      role: member.role || "member",
      reachable: false,
      readiness: "UNAVAILABLE",
      primaryAgent: "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "local probe failed",
      authority: "NON_AUTHORITATIVE",
    };
  }
}

async function probeHealthUrl(member: FleetMemberConfig): Promise<FleetMemberStatus> {
  incrementMetric("fleet_member_probes_total");
  const url = member.healthUrl || "";
  try {
    const response = await fetch(url, { method: "GET", headers: { accept: "application/json" }, signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return {
        id: member.id,
        label: member.label,
        role: member.role || "member",
        reachable: false,
        readiness: `HTTP_${response.status}`,
        primaryAgent: "UNAVAILABLE",
        freshness: "UNAVAILABLE",
        detail: `healthUrl returned ${response.status}`,
        authority: "NON_AUTHORITATIVE",
      };
    }
    const body = (await response.json()) as Record<string, unknown>;
    return {
      id: member.id,
      label: member.label,
      role: member.role || "member",
      reachable: Boolean(body.dataSourceReachable ?? body.status === "ok"),
      readiness: String(body.status || "UNKNOWN"),
      primaryAgent: "REMOTE",
      freshness: "OBSERVED",
      detail: "Remote /api/health probe (never inherits local PRIMARY authority)",
      authority: "NON_AUTHORITATIVE",
    };
  } catch (error) {
    return {
      id: member.id,
      label: member.label,
      role: member.role || "member",
      reachable: false,
      readiness: "UNAVAILABLE",
      primaryAgent: "UNAVAILABLE",
      freshness: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "remote probe failed",
      authority: "NON_AUTHORITATIVE",
    };
  }
}

export async function buildFleetProjection(): Promise<FleetProjection> {
  if (!isFleetModeEnabled()) {
    return {
      enabled: false,
      configured: false,
      members: [],
      warnings: ["Fleet mode is disabled. Set MISSION_CONTROL_FLEET_MODE=enabled and MISSION_CONTROL_FLEET_CONFIG to activate."],
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
      };
    }
    const members: FleetMemberStatus[] = [];
    for (const member of configs) {
      if (member.healthUrl) members.push(await probeHealthUrl(member));
      else if (member.controlPlaneRoot) members.push(await probeLocalRoot(member));
      else {
        members.push({
          id: member.id,
          label: member.label,
          role: member.role || "member",
          reachable: false,
          readiness: "UNAVAILABLE",
          primaryAgent: "UNAVAILABLE",
          freshness: "UNAVAILABLE",
          detail: "Member lacks controlPlaneRoot and healthUrl",
          authority: "NON_AUTHORITATIVE",
        });
      }
    }
    return { enabled: true, configured: true, members, warnings: [] };
  } catch (error) {
    return {
      enabled: true,
      configured: false,
      members: [],
      warnings: [error instanceof Error ? error.message : "Fleet config failed"],
    };
  }
}

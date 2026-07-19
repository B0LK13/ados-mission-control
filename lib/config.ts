import fs from "node:fs";
import path from "node:path";

export type MissionControlMode = "auto" | "live" | "fixture";
export type MissionControlPersistenceMode = "sqlite" | "disabled";
export type MissionControlAuthMode = "basic" | "disabled";

/** Canonical defaults — see docs/PATH-REGISTRY.md (FBL-MCV2-DOC-001 / FBL-X-PATH-001). */
const DEFAULT_RUNTIME = "D:\\agent-development-os-orchestrator";
const DEFAULT_SOURCE =
  "D:\\agent-development-orchestrator\\orchestrators\\agent-development-os-orchestrator-source";
const DEFAULT_CURSOR =
  "D:\\agent-development-orchestrator\\orchestrators\\agent-development-os-orchestrator-source-cursor";
const DEFAULT_PRODUCT = "D:\\agent-development-os";

const STALE_ROOT_MARKERS = [
  "D:\\agent-development-os-orchestrator-source",
  "D:\\agent-development-os-orchestrator-source-cursor",
  "D:\\Topics",
  "/mnt/d/Topics",
];

function resolveExisting(preferred: string, fallbacks: string[]): string {
  for (const candidate of [preferred, ...fallbacks]) {
    const resolved = path.resolve(candidate);
    if (STALE_ROOT_MARKERS.some((stale) => resolved === path.resolve(stale))) {
      continue;
    }
    try {
      if (fs.existsSync(resolved)) return resolved;
    } catch {
      /* ignore */
    }
  }
  return path.resolve(preferred);
}

export function getMissionControlConfig() {
  const modeValue = process.env.MISSION_CONTROL_MODE?.trim().toLowerCase();
  const mode: MissionControlMode =
    modeValue === "live" || modeValue === "fixture" ? modeValue : "auto";
  const orchestratorRoot =
    process.env.ADOS_CONTROL_PLANE_ROOT?.trim() ||
    process.env.ADOS_ORCHESTRATOR_ROOT?.trim() ||
    DEFAULT_RUNTIME;
  const persistenceValue = process.env.MISSION_CONTROL_PERSISTENCE?.trim().toLowerCase();
  const authValue = process.env.MISSION_CONTROL_AUTH_MODE?.trim().toLowerCase();

  const sourcePreferred =
    process.env.ADOS_SOURCE_ROOT?.trim() || DEFAULT_SOURCE;
  const cursorPreferred =
    process.env.ADOS_CURSOR_WORKTREE?.trim() || DEFAULT_CURSOR;

  return {
    mode,
    cockpitId: "ados-mission-control-v2-live-broker",
    cockpitLabel: "Mission Control v2 (live broker / read-only)",
    orchestratorRoot: path.resolve(orchestratorRoot),
    sourceRoot: resolveExisting(sourcePreferred, [
      DEFAULT_SOURCE,
      "/mnt/d/agent-development-orchestrator/orchestrators/agent-development-os-orchestrator-source",
    ]),
    cursorWorktree: resolveExisting(cursorPreferred, [
      DEFAULT_CURSOR,
      "/mnt/d/agent-development-orchestrator/orchestrators/agent-development-os-orchestrator-source-cursor",
    ]),
    productRoot: resolveExisting(
      process.env.ADOS_PRODUCT_ROOT?.trim() || DEFAULT_PRODUCT,
      [DEFAULT_PRODUCT, "/mnt/d/agent-development-os"],
    ),
    persistenceMode: (persistenceValue === "disabled" ? "disabled" : "sqlite") as MissionControlPersistenceMode,
    dataRoot: path.resolve(
      process.env.MISSION_CONTROL_DATA_ROOT?.trim() || path.join(process.cwd(), "data"),
    ),
    authMode: (authValue === "basic" ? "basic" : "disabled") as MissionControlAuthMode,
    refreshMs: Math.max(2_000, Number(process.env.MISSION_CONTROL_REFRESH_MS) || 5_000),
    applicationVersion: process.env.APP_VERSION?.trim() || "2.0.0",
    buildId: process.env.BUILD_ID?.trim() || "local",
  };
}

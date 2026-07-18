import path from "node:path";

export type MissionControlMode = "auto" | "live" | "fixture";
export type MissionControlPersistenceMode = "sqlite" | "disabled";
export type MissionControlAuthMode = "basic" | "disabled";

export function getMissionControlConfig() {
  const modeValue = process.env.MISSION_CONTROL_MODE?.trim().toLowerCase();
  const mode: MissionControlMode =
    modeValue === "live" || modeValue === "fixture" ? modeValue : "auto";
  const orchestratorRoot =
    process.env.ADOS_CONTROL_PLANE_ROOT?.trim() ||
    process.env.ADOS_ORCHESTRATOR_ROOT?.trim() ||
    "D:\\agent-development-os-orchestrator";
  const persistenceValue = process.env.MISSION_CONTROL_PERSISTENCE?.trim().toLowerCase();
  const authValue = process.env.MISSION_CONTROL_AUTH_MODE?.trim().toLowerCase();

  return {
    mode,
    orchestratorRoot: path.resolve(orchestratorRoot),
    sourceRoot: path.resolve(
      process.env.ADOS_SOURCE_ROOT?.trim() || "D:\\agent-development-os-orchestrator-source",
    ),
    cursorWorktree: path.resolve(
      process.env.ADOS_CURSOR_WORKTREE?.trim() ||
        "D:\\agent-development-os-orchestrator-source-cursor",
    ),
    productRoot: path.resolve(
      process.env.ADOS_PRODUCT_ROOT?.trim() || "D:\\agent-development-os",
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

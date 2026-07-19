import { spawn } from "node:child_process";
import path from "node:path";
import { getMissionControlConfig } from "@/lib/config";

export type AdosToolName =
  | "set-owner-approval-disposition"
  | "request-approval-followup"
  | "set-owner-gate-decision"
  | "dispatch-approved-operation"
  | "set-campaign-control"
  | "run-approved-validator"
  | "create-integration-request"
  | "trigger-review-pickup";

const ALLOWED_TOOLS: Record<AdosToolName, { script: string; phase: 2 | 3 | 6 }> = {
  "set-owner-approval-disposition": { script: "set-owner-approval-disposition.mjs", phase: 2 },
  "request-approval-followup": { script: "request-approval-followup.mjs", phase: 2 },
  "set-owner-gate-decision": { script: "set-owner-gate-decision.mjs", phase: 2 },
  "dispatch-approved-operation": { script: "dispatch-approved-operation.mjs", phase: 3 },
  "set-campaign-control": { script: "set-campaign-control.mjs", phase: 3 },
  "run-approved-validator": { script: "run-approved-validator.mjs", phase: 6 },
  "create-integration-request": { script: "create-integration-request.mjs", phase: 6 },
  "trigger-review-pickup": { script: "trigger-review-pickup.mjs", phase: 6 },
};

export function isPhase2CommandsEnabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE2_COMMANDS?.trim().toLowerCase() === "enabled";
}

export function isPhase3CommandsEnabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE3_COMMANDS?.trim().toLowerCase() === "enabled";
}

export function isPhase6CommandsEnabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE6_COMMANDS?.trim().toLowerCase() === "enabled";
}

export interface AdosToolResult {
  ok: boolean;
  code?: string;
  message?: string;
  raw: string;
  data?: Record<string, unknown>;
}

function parseToolOutput(stdout: string, stderr: string): AdosToolResult {
  const text = `${stdout}\n${stderr}`.trim();
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]) as Record<string, unknown>;
      if (typeof parsed.ok === "boolean") {
        return {
          ok: parsed.ok === true,
          code: typeof parsed.code === "string" ? parsed.code : undefined,
          message: typeof parsed.message === "string" ? parsed.message : undefined,
          raw: text,
          data: parsed,
        };
      }
    } catch {
      /* continue */
    }
  }
  return { ok: false, code: "TOOL_OUTPUT_UNPARSEABLE", message: "Tool did not emit a JSON result.", raw: text };
}

/**
 * Invoke an allowlisted ADOS tool via argv-only node spawn.
 * Phase 2/3/6 tools require their respective enablement flags.
 */
export async function invokeAdosTool(
  tool: AdosToolName,
  args: Record<string, string>,
): Promise<AdosToolResult> {
  const meta = ALLOWED_TOOLS[tool];
  if (!meta) {
    return { ok: false, code: "TOOL_NOT_ALLOWLISTED", message: `Tool not allowlisted: ${tool}`, raw: "" };
  }
  if (meta.phase === 2 && !isPhase2CommandsEnabled()) {
    return {
      ok: false,
      code: "PHASE2_DISABLED",
      message: "MISSION_CONTROL_PHASE2_COMMANDS is not enabled.",
      raw: "",
    };
  }
  if (meta.phase === 3 && !isPhase3CommandsEnabled()) {
    return {
      ok: false,
      code: "PHASE3_DISABLED",
      message: "MISSION_CONTROL_PHASE3_COMMANDS is not enabled.",
      raw: "",
    };
  }
  if (meta.phase === 6 && !isPhase6CommandsEnabled()) {
    return {
      ok: false,
      code: "PHASE6_DISABLED",
      message: "MISSION_CONTROL_PHASE6_COMMANDS is not enabled.",
      raw: "",
    };
  }

  const config = getMissionControlConfig();
  const scriptPath = path.join(process.cwd(), "scripts", "ados-tools", meta.script);
  const argv = [scriptPath];
  const merged = {
    root: config.orchestratorRoot,
    ...args,
  };
  for (const [key, value] of Object.entries(merged)) {
    if (!value) continue;
    if (!/^[a-z0-9-]+$/i.test(key)) {
      return { ok: false, code: "INVALID_ARG_NAME", message: `Illegal argument name: ${key}`, raw: "" };
    }
    argv.push(`--${key}`, value);
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, argv, {
      cwd: process.cwd(),
      env: { ...process.env, MISSION_CONTROL_TOOL_INVOKE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: "SPAWN_FAILED",
        message: error instanceof Error ? error.message : "spawn failed",
        raw: "",
      });
    });
    child.on("close", () => {
      resolve(parseToolOutput(stdout, stderr));
    });
  });
}

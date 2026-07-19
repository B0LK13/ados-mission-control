import { spawn } from "node:child_process";
import path from "node:path";
import { getMissionControlConfig } from "@/lib/config";

export type Phase2ToolName =
  | "set-owner-approval-disposition"
  | "set-owner-gate-decision";

const ALLOWED_TOOLS: Record<Phase2ToolName, string> = {
  "set-owner-approval-disposition": "set-owner-approval-disposition.mjs",
  "set-owner-gate-decision": "set-owner-gate-decision.mjs",
};

export function isPhase2CommandsEnabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE2_COMMANDS?.trim().toLowerCase() === "enabled";
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
 * Invoke an allowlisted ADOS Phase-2 tool via argv-only node spawn.
 * The tool scripts live under scripts/ados-tools (outside the read-model write ban).
 */
export async function invokeAdosTool(
  tool: Phase2ToolName,
  args: Record<string, string>,
): Promise<AdosToolResult> {
  if (!isPhase2CommandsEnabled()) {
    return {
      ok: false,
      code: "PHASE2_DISABLED",
      message: "MISSION_CONTROL_PHASE2_COMMANDS is not enabled.",
      raw: "",
    };
  }

  const scriptName = ALLOWED_TOOLS[tool];
  if (!scriptName) {
    return { ok: false, code: "TOOL_NOT_ALLOWLISTED", message: `Tool not allowlisted: ${tool}`, raw: "" };
  }

  const config = getMissionControlConfig();
  const scriptPath = path.join(process.cwd(), "scripts", "ados-tools", scriptName);
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

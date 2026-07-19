import { invokeAdosTool, isPhase3CommandsEnabled } from "@/lib/commands/ados-bridge";

export async function runApprovedDispatch(input: {
  approvalId: string;
  taskId: string;
  runtime?: "cursor" | "codex" | "kimi";
  mode?: "prepare" | "queue";
  idempotencyKey?: string;
}) {
  if (!isPhase3CommandsEnabled()) {
    return {
      httpStatus: 405 as const,
      body: {
        error: {
          code: "PHASE3_DISABLED",
          message: "Phase 3 commands are disabled. Set MISSION_CONTROL_PHASE3_COMMANDS=enabled after owner authorization.",
        },
      },
    };
  }
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(input.approvalId) || !/^[A-Za-z0-9._:-]{3,128}$/.test(input.taskId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid approvalId or taskId." } },
    };
  }

  const result = await invokeAdosTool("dispatch-approved-operation", {
    "approval-id": input.approvalId,
    "task-id": input.taskId,
    runtime: input.runtime || "cursor",
    mode: input.mode || "prepare",
    actor: "owner",
    "idempotency-key": input.idempotencyKey || "",
  });

  if (!result.ok) {
    const code = result.code || "TOOL_FAILED";
    const status =
      code === "APPROVAL_NOT_APPROVED" || code === "APPROVAL_EXPIRED" || code === "APPROVAL_CONSUMED" || code === "APPROVAL_ACTION_MISMATCH"
        ? 403
        : code === "APPROVAL_FILE_MISSING" || code === "TASK_CONTRACT_MISSING"
          ? 404
          : code === "VALIDATION_ERROR"
            ? 400
            : 502;
    return {
      httpStatus: status as 400 | 403 | 404 | 502,
      body: { error: { code, message: result.message || "Dispatch tool failed.", details: result.data } },
    };
  }

  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      operation: "dispatch",
      tool: result.data,
      authority: "phase3-ados-tool",
      cursorPrimaryForbidden: true,
    },
  };
}

export async function runCampaignControl(input: {
  approvalId: string;
  campaignId: string;
  control: "PAUSE" | "RESUME";
}) {
  if (!isPhase3CommandsEnabled()) {
    return {
      httpStatus: 405 as const,
      body: { error: { code: "PHASE3_DISABLED", message: "Phase 3 commands are disabled." } },
    };
  }
  const result = await invokeAdosTool("set-campaign-control", {
    "approval-id": input.approvalId,
    "campaign-id": input.campaignId,
    control: input.control,
    actor: "owner",
  });
  if (!result.ok) {
    const code = result.code || "TOOL_FAILED";
    const status =
      code === "APPROVAL_NOT_APPROVED" || code === "APPROVAL_ACTION_MISMATCH"
        ? 403
        : code === "APPROVAL_FILE_MISSING"
          ? 404
          : 502;
    return {
      httpStatus: status as 403 | 404 | 502,
      body: { error: { code, message: result.message || "Campaign control tool failed.", details: result.data } },
    };
  }
  return {
    httpStatus: 200 as const,
    body: { ok: true, operation: "campaign-control", tool: result.data, authority: "phase3-ados-tool" },
  };
}

import { invokeAdosTool, isPhase6CommandsEnabled } from "@/lib/commands/ados-bridge";

function phase6Disabled() {
  return {
    httpStatus: 405 as const,
    body: {
      error: {
        code: "PHASE6_DISABLED",
        message:
          "Phase 6 commands are disabled. Set MISSION_CONTROL_PHASE6_COMMANDS=enabled after owner authorization.",
      },
    },
  };
}

function mapToolFailure(result: { code?: string; message?: string; data?: Record<string, unknown> }) {
  const code = result.code || "TOOL_FAILED";
  const status =
    code === "APPROVAL_NOT_APPROVED" ||
    code === "APPROVAL_EXPIRED" ||
    code === "APPROVAL_CONSUMED" ||
    code === "APPROVAL_ACTION_MISMATCH" ||
    code === "LEASE_MUTATION_DENIED" ||
    code === "NON_OWNER_ACTOR"
      ? 403
      : code === "APPROVAL_FILE_MISSING"
        ? 404
        : code === "VALIDATION_ERROR" || code === "PHASE6_DISABLED"
          ? 400
          : 502;
  return {
    httpStatus: status as 400 | 403 | 404 | 502,
    body: { error: { code, message: result.message || "Phase 6 tool failed.", details: result.data } },
  };
}

export async function runApprovedValidator(input: {
  approvalId: string;
  taskId?: string;
}) {
  if (!isPhase6CommandsEnabled()) return phase6Disabled();
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(input.approvalId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid approvalId." } },
    };
  }
  if (input.taskId && !/^[A-Za-z0-9._:-]{3,128}$/.test(input.taskId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid taskId." } },
    };
  }

  const result = await invokeAdosTool("run-approved-validator", {
    "approval-id": input.approvalId,
    "task-id": input.taskId || "",
    actor: "owner",
  });
  if (!result.ok) return mapToolFailure(result);
  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      operation: "validate",
      tool: result.data,
      authority: "phase6-ados-tool",
      cursorPrimaryForbidden: true,
    },
  };
}

export async function runIntegrationRequest(input: {
  approvalId: string;
  projectId: string;
  summary?: string;
}) {
  if (!isPhase6CommandsEnabled()) return phase6Disabled();
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(input.approvalId) || !/^[A-Za-z0-9._:-]{2,128}$/.test(input.projectId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid approvalId or projectId." } },
    };
  }

  const result = await invokeAdosTool("create-integration-request", {
    "approval-id": input.approvalId,
    "project-id": input.projectId,
    summary: input.summary || "",
    actor: "owner",
  });
  if (!result.ok) return mapToolFailure(result);
  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      operation: "integration-request",
      tool: result.data,
      authority: "phase6-ados-tool",
      cursorPrimaryForbidden: true,
    },
  };
}

export async function runReviewPickup(input: {
  approvalId: string;
  taskId: string;
}) {
  if (!isPhase6CommandsEnabled()) return phase6Disabled();
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(input.approvalId) || !/^[A-Za-z0-9._:-]{3,128}$/.test(input.taskId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid approvalId or taskId." } },
    };
  }

  const result = await invokeAdosTool("trigger-review-pickup", {
    "approval-id": input.approvalId,
    "task-id": input.taskId,
    actor: "owner",
  });
  if (!result.ok) return mapToolFailure(result);
  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      operation: "review-pickup",
      tool: result.data,
      authority: "phase6-ados-tool",
      cursorPrimaryForbidden: true,
      silentDispatchEnablement: false,
    },
  };
}

import { invokeAdosTool, isPhase2CommandsEnabled } from "@/lib/commands/ados-bridge";

export type ApprovalAction = "approve" | "reject" | "withdraw";

const DISPOSITION: Record<ApprovalAction, "APPROVED" | "DENIED" | "REVOKED"> = {
  approve: "APPROVED",
  reject: "DENIED",
  withdraw: "REVOKED",
};

export async function runApprovalDisposition(input: {
  approvalId: string;
  action: ApprovalAction;
  justification?: string;
  idempotencyKey?: string;
}) {
  if (!isPhase2CommandsEnabled()) {
    return {
      httpStatus: 405 as const,
      body: {
        error: {
          code: "PHASE2_DISABLED",
          message: "Phase 2 commands are disabled. Set MISSION_CONTROL_PHASE2_COMMANDS=enabled after owner authorization.",
        },
      },
    };
  }

  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(input.approvalId)) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "Invalid approvalId." } },
    };
  }

  const result = await invokeAdosTool("set-owner-approval-disposition", {
    "approval-id": input.approvalId,
    disposition: DISPOSITION[input.action],
    actor: "owner",
    justification: input.justification || `Mission Control Phase 2 ${input.action}`,
    "idempotency-key": input.idempotencyKey || "",
  });

  if (!result.ok) {
    const code = result.code || "TOOL_FAILED";
    const status =
      code === "APPROVAL_FILE_MISSING" ? 404 : code === "NON_OWNER_ACTOR" ? 403 : code === "VALIDATION_ERROR" ? 400 : 502;
    return {
      httpStatus: status as 400 | 403 | 404 | 502,
      body: {
        error: {
          code,
          message: result.message || "ADOS approval tool failed.",
          details: result.data,
        },
      },
    };
  }

  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      action: input.action,
      disposition: DISPOSITION[input.action],
      approvalId: input.approvalId,
      tool: result.data,
      authority: "phase2-ados-tool",
    },
  };
}

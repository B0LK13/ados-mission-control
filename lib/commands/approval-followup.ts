import { invokeAdosTool, isPhase2CommandsEnabled } from "@/lib/commands/ados-bridge";

export type ApprovalFollowupKind = "evidence" | "corrections";

const STATUS: Record<ApprovalFollowupKind, "EVIDENCE_REQUESTED" | "CORRECTIONS_REQUESTED"> = {
  evidence: "EVIDENCE_REQUESTED",
  corrections: "CORRECTIONS_REQUESTED",
};

export async function runApprovalFollowup(input: {
  approvalId: string;
  kind: ApprovalFollowupKind;
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

  if (input.kind !== "evidence" && input.kind !== "corrections") {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "VALIDATION_ERROR", message: "kind must be evidence or corrections." } },
    };
  }

  const justification = (input.justification || "").trim();
  if (justification.length < 3) {
    return {
      httpStatus: 400 as const,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "justification is required for follow-up requests (min 3 characters).",
        },
      },
    };
  }

  const result = await invokeAdosTool("request-approval-followup", {
    "approval-id": input.approvalId,
    kind: input.kind,
    actor: "owner",
    justification,
    "idempotency-key": input.idempotencyKey || "",
  });

  if (!result.ok) {
    const code = result.code || "TOOL_FAILED";
    const status =
      code === "APPROVAL_FILE_MISSING" ? 404 : code === "NON_OWNER_ACTOR" ? 403 : code === "VALIDATION_ERROR" || code === "INVALID_KIND" ? 400 : 502;
    return {
      httpStatus: status as 400 | 403 | 404 | 502,
      body: {
        error: {
          code,
          message: result.message || "ADOS approval follow-up tool failed.",
          details: result.data,
        },
      },
    };
  }

  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      action: `request-${input.kind}`,
      kind: input.kind,
      status: STATUS[input.kind],
      approvalId: input.approvalId,
      terminal: false,
      tool: result.data,
      authority: "phase2-ados-tool",
      consequences: [
        "Does not approve, deny, or revoke the approval",
        "Appends OWNER_APPROVAL_FOLLOWUP to the event ledger",
        "Records follow-up status in approvals.jsonl via allowlisted ADOS tool",
        "Approval remains pending for a later approve/reject/withdraw decision",
      ],
    },
  };
}

import { runApprovalFollowup } from "@/lib/commands/approval-followup";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const { approvalId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { justification?: string };
  const result = await runApprovalFollowup({
    approvalId,
    kind: "evidence",
    justification: body.justification,
    idempotencyKey: request.headers.get("idempotency-key") || undefined,
  });
  return missionCommandJson(result.body, result.httpStatus);
}

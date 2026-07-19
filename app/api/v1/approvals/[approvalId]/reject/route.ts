import { runApprovalDisposition } from "@/lib/commands/approval-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const { approvalId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { justification?: string };
  const result = await runApprovalDisposition({
    approvalId,
    action: "reject",
    justification: body.justification,
    idempotencyKey: request.headers.get("idempotency-key") || undefined,
  });
  return missionCommandJson(result.body, result.httpStatus);
}

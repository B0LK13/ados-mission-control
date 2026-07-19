import { runReviewPickup } from "@/lib/commands/phase6-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "JSON body required." } },
      400,
      "phase6-commands",
    );
  }
  const result = await runReviewPickup({
    approvalId: String(body.approvalId || ""),
    taskId: String(body.taskId || ""),
  });
  return missionCommandJson(result.body, result.httpStatus, "phase6-commands");
}

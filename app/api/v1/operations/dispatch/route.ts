import { runApprovedDispatch } from "@/lib/commands/phase3-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    approvalId?: string;
    taskId?: string;
    runtime?: "cursor" | "codex" | "kimi";
    mode?: "prepare" | "queue";
  };
  if (!body.approvalId || !body.taskId) {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "approvalId and taskId are required." } },
      400,
      "phase3-commands",
    );
  }
  const result = await runApprovedDispatch({
    approvalId: body.approvalId,
    taskId: body.taskId,
    runtime: body.runtime,
    mode: body.mode,
    idempotencyKey: request.headers.get("idempotency-key") || undefined,
  });
  return missionCommandJson(result.body, result.httpStatus, "phase3-commands");
}

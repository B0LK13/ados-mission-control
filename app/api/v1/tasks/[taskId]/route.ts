import { findTask, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  if (!taskId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "taskId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const task = findTask(snapshot, taskId);
    if (!task) return notFoundResponse("Task", taskId);
    return { item: task, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

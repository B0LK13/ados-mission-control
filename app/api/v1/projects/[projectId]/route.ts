import { findProject, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  if (!projectId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "projectId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const project = findProject(snapshot, projectId);
    if (!project) return notFoundResponse("Project", projectId);
    return { item: project, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

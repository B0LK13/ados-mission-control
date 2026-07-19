import { findWorktree, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ repoId: string }> }) {
  const { repoId } = await context.params;
  if (!repoId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "repoId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const worktree = findWorktree(snapshot, repoId);
    if (!worktree) return notFoundResponse("Worktree", repoId);
    return { item: worktree, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

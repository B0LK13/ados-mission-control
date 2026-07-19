import { findHandoff, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ handoffId: string }> }) {
  const { handoffId } = await context.params;
  if (!handoffId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "handoffId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const handoff = findHandoff(snapshot, handoffId);
    if (!handoff) return notFoundResponse("Handoff", handoffId);
    return { item: handoff, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

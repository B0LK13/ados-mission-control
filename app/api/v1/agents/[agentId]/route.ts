import { findAgent, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;
  if (!agentId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "agentId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const agent = findAgent(snapshot, agentId);
    if (!agent) return notFoundResponse("Agent", agentId);
    return { item: agent, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

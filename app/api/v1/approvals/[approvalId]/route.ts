import { findApproval, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET detail — POST approve/reject/withdraw remain under nested routes + Phase 2 flag. */
export async function GET(_request: Request, context: { params: Promise<{ approvalId: string }> }) {
  const { approvalId } = await context.params;
  if (!approvalId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "approvalId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const approval = findApproval(snapshot, approvalId);
    if (!approval) return notFoundResponse("Approval", approvalId);
    return { item: approval, snapshotAt: snapshot.snapshotAt, freshness: snapshot.freshness };
  });
}

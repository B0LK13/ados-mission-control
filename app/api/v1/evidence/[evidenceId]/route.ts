import { findEvidence, notFoundResponse } from "@/lib/api/entity-lookup";
import { missionJson, missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Metadata-only evidence detail. Bodies are never returned. */
export async function GET(_request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await context.params;
  if (!evidenceId?.trim()) {
    return missionJson({ error: { code: "VALIDATION_ERROR", message: "evidenceId is required." } }, 400);
  }
  return missionResponse((snapshot) => {
    const evidence = findEvidence(snapshot, evidenceId);
    if (!evidence) return notFoundResponse("Evidence", evidenceId);
    return {
      item: evidence,
      snapshotAt: snapshot.snapshotAt,
      freshness: snapshot.freshness,
      contentIngested: false,
      note: "Evidence detail is metadata only.",
    };
  });
}

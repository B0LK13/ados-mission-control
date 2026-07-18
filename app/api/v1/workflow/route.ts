import { missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return missionResponse((snapshot) => ({
    ...snapshot.workflowSummary,
    protocol: snapshot.protocol,
    snapshotAt: snapshot.snapshotAt,
  }));
}

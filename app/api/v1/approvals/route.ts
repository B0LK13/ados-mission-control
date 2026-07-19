import { missionListResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return missionListResponse(request, (snapshot) => snapshot.approvals, (snapshot) => ({
    ownerActionItems: snapshot.pendingApprovals,
    phase: snapshot.capabilities?.phase2Commands ? "PHASE2_COMMANDS" : "READ_ONLY",
    mutationRoutesAvailable: snapshot.capabilities?.phase2Commands === true,
  }));
}

import { missionListResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return missionListResponse(request, (snapshot) => snapshot.agents);
}

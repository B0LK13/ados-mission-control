import { missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return missionResponse((snapshot) => ({ items: snapshot.agents, snapshotAt: snapshot.snapshotAt }));
}

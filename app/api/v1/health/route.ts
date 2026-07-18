import { missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return missionResponse((snapshot) => ({
    health: snapshot.systemHealth,
    source: snapshot.source,
    readModel: snapshot.readModel,
    snapshotAt: snapshot.snapshotAt,
  }));
}

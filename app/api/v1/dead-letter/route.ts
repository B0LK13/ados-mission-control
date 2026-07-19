import { getSharedMissionSnapshot } from "@/lib/broker/snapshot-cache";
import { buildDeadLetterProjection } from "@/lib/dead-letter";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { snapshot } = await getSharedMissionSnapshot();
  const projection = buildDeadLetterProjection(snapshot);
  return missionJson({
    ...projection,
    snapshotAt: snapshot.snapshotAt,
  });
}

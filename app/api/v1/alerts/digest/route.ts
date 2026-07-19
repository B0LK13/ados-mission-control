import { buildAlertDigest, buildAlertProjection } from "@/lib/alerts/engine";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const projection = await buildAlertProjection({ notify: false });
  return missionJson(buildAlertDigest(projection));
}

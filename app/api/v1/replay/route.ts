import { getMissionControlConfig } from "@/lib/config";
import { missionJson } from "@/lib/http";
import { loadRunReplay } from "@/lib/replay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId")?.trim() || "";
  const runId = url.searchParams.get("runId")?.trim() || "";
  const config = getMissionControlConfig();
  const projection = await loadRunReplay(config.orchestratorRoot, campaignId, runId);
  return missionJson(projection, projection.freshness === "UNAVAILABLE" && !projection.events.length ? 404 : 200);
}

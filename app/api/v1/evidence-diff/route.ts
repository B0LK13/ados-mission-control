import { getMissionControlConfig } from "@/lib/config";
import { missionJson } from "@/lib/http";
import { loadEvidenceDiff } from "@/lib/evidence-diff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId")?.trim() || "";
  const leftRunId = url.searchParams.get("leftRunId")?.trim() || "";
  const rightRunId = url.searchParams.get("rightRunId")?.trim() || "";
  const config = getMissionControlConfig();
  const projection = await loadEvidenceDiff(config.orchestratorRoot, campaignId, leftRunId, rightRunId);
  const missingBoth =
    projection.freshness === "UNAVAILABLE"
    && !projection.left.events.length
    && !projection.right.events.length;
  return missionJson(projection, missingBoth ? 404 : 200);
}

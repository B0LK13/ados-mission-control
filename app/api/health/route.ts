import { getMissionControlConfig } from "@/lib/config";
import { missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getMissionControlConfig();
  return missionResponse((snapshot) => ({
    status: snapshot.systemHealth.readiness === "UNAVAILABLE" ? "degraded" : "ok",
    version: config.applicationVersion,
    buildId: config.buildId,
    dataSourceReachable: snapshot.source.reachable,
    dataSourceStale: snapshot.source.stale,
    lastSuccessfulStateRefresh: snapshot.source.lastSuccessfulRefresh,
    parsingWarningCount: snapshot.source.parsingWarningCount,
    authentication: config.authMode,
    readModel: snapshot.readModel.status,
    readModelBackend: snapshot.readModel.backend,
    readOnly: true,
  }));
}

import { getMissionControlConfig } from "@/lib/config";
import { missionResponse } from "@/lib/http";
import { getMetricsSnapshot, incrementMetric } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  incrementMetric("health_requests_total");
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
    metrics: getMetricsSnapshot(),
  }));
}

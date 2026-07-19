import { incrementMetric } from "@/lib/metrics";
import { renderPrometheusText } from "@/lib/prometheus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Prometheus text exposition — aggregate counters only, never authority. */
export async function GET() {
  incrementMetric("metrics_scrapes_total");
  const body = renderPrometheusText();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-ADOS-Authority": "observed-metrics",
    },
  });
}

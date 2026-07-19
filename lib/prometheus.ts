import { getMetricsSnapshot, type MetricName } from "@/lib/metrics";

const HELP: Record<MetricName, string> = {
  health_requests_total: "Total GET /api/health requests served by this process.",
  ingest_warning_events_total: "Total ingest/parsing warning events observed.",
  source_unavailable_events_total: "Total times the configured ADOS source was unavailable.",
  metrics_scrapes_total: "Total Prometheus scrapes of /api/v1/metrics.",
  fleet_member_probes_total: "Total fleet member probe attempts.",
};

/**
 * Render Prometheus text exposition (counters only).
 * Labels never include paths, secrets, or authority claims.
 */
export function renderPrometheusText(extra?: Partial<Record<MetricName, number>>): string {
  const snapshot = { ...getMetricsSnapshot(), ...extra };
  const lines: string[] = [
    "# HELP mission_control_info Static Mission Control build labels (non-authoritative).",
    "# TYPE mission_control_info gauge",
    `mission_control_info{service="ados-mission-control",authority="observed"} 1`,
  ];

  for (const [name, value] of Object.entries(snapshot) as Array<[MetricName, number]>) {
    const metric = `mission_control_${name}`;
    lines.push(`# HELP ${metric} ${HELP[name] || name}`);
    lines.push(`# TYPE ${metric} counter`);
    lines.push(`${metric} ${Number(value) || 0}`);
  }

  return `${lines.join("\n")}\n`;
}

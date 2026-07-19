/**
 * Process-local structured counters. Values are aggregates only — never paths or secrets.
 */

export type MetricName =
  | "health_requests_total"
  | "ingest_warning_events_total"
  | "source_unavailable_events_total"
  | "metrics_scrapes_total"
  | "fleet_member_probes_total";

const counters = new Map<MetricName, number>([
  ["health_requests_total", 0],
  ["ingest_warning_events_total", 0],
  ["source_unavailable_events_total", 0],
  ["metrics_scrapes_total", 0],
  ["fleet_member_probes_total", 0],
]);

export function incrementMetric(name: MetricName, by = 1): number {
  const next = (counters.get(name) || 0) + by;
  counters.set(name, next);
  return next;
}

export function getMetricsSnapshot(): Record<MetricName, number> {
  return {
    health_requests_total: counters.get("health_requests_total") || 0,
    ingest_warning_events_total: counters.get("ingest_warning_events_total") || 0,
    source_unavailable_events_total: counters.get("source_unavailable_events_total") || 0,
    metrics_scrapes_total: counters.get("metrics_scrapes_total") || 0,
    fleet_member_probes_total: counters.get("fleet_member_probes_total") || 0,
  };
}

/** Test helper only. */
export function resetMetricsForTests(): void {
  for (const key of counters.keys()) counters.set(key, 0);
}

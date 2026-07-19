import assert from "node:assert/strict";
import test from "node:test";
import { logMissionEvent } from "../lib/logging";
import { getMetricsSnapshot, incrementMetric, resetMetricsForTests } from "../lib/metrics";

test("metrics counters increment on health and warning paths without leaking paths", () => {
  resetMetricsForTests();
  assert.equal(incrementMetric("health_requests_total"), 1);
  assert.equal(incrementMetric("health_requests_total"), 2);

  logMissionEvent("warn", "parsing_failure", { warningCount: 3 });
  logMissionEvent("warn", "source_unavailable", { mode: "live" });

  const snapshot = getMetricsSnapshot();
  assert.equal(snapshot.health_requests_total, 2);
  assert.equal(snapshot.ingest_warning_events_total, 3);
  assert.equal(snapshot.source_unavailable_events_total, 1);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "fleet_member_probes_total",
    "health_requests_total",
    "ingest_warning_events_total",
    "metrics_scrapes_total",
    "source_unavailable_events_total",
  ]);
  assert.equal(snapshot.metrics_scrapes_total, 0);
  assert.equal(snapshot.fleet_member_probes_total, 0);
});

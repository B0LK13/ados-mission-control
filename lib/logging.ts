import { incrementMetric } from "@/lib/metrics";

type LogLevel = "info" | "warn" | "error";

export function logMissionEvent(
  level: LogLevel,
  event: "startup" | "state_refresh" | "parsing_failure" | "source_unavailable" | "health_transition" | "read_model_failure",
  detail: Record<string, string | number | boolean | null> = {},
): void {
  if (event === "parsing_failure") {
    const warningCount = typeof detail.warningCount === "number" ? detail.warningCount : 1;
    incrementMetric("ingest_warning_events_total", warningCount);
  }
  if (event === "source_unavailable") {
    incrementMetric("source_unavailable_events_total");
  }

  const payload = {
    timestamp: new Date().toISOString(),
    service: "ados-mission-control",
    level,
    event,
    ...detail,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

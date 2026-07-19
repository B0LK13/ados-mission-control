# Grafana provisioning runbook — Mission Control metrics

**Audience:** operators wiring an *external* Grafana to Mission Control  
**Related:** `docs/adr/ADR-001-fleet-and-prometheus.md`, `docs/grafana/mission-control-overview.json`  
**Non-goal:** Mission Control does **not** bundle a Grafana server.

## Authority warning

`GET /api/v1/metrics` is **non-authoritative**. Counters are process-local observations only. They never grant PRIMARY lease, approve, dispatch, or mutate ADOS state. Do not treat Grafana panels as control-plane truth.

## Prerequisites

1. Mission Control reachable on a loopback or trusted network path.
2. Optional: `MISSION_CONTROL_FLEET_MODE=enabled` if you want fleet-related counters populated.
3. Prometheus (or Grafana Alloy / agent) that can scrape Mission Control.

## Sample Prometheus scrape job

```yaml
scrape_configs:
  - job_name: ados-mission-control
    metrics_path: /api/v1/metrics
    scrape_interval: 15s
    static_configs:
      - targets: ["127.0.0.1:3000"]
    # /api/v1/metrics is auth-exempt like /api/health.
    # Do not put Basic auth secrets into committed scrape configs.
```

Adjust host/port to your deployment. Prefer loopback or private network; do not expose metrics publicly without an additional reverse-proxy policy.

## Import the dashboard JSON

1. Open external Grafana → **Dashboards** → **New** → **Import**.
2. Upload `docs/grafana/mission-control-overview.json` from this repository.
3. Select the Prometheus datasource that scrapes `/api/v1/metrics`.
4. Confirm panels render counters only (no path/secret/lease bodies).

## Alerting vs Grafana

- **Phase 7 local alerts** (`MISSION_CONTROL_ALERTS`) evaluate rules inside Mission Control and optionally POST a redacted HTTPS webhook.
- **Grafana alerting** is optional and external. If you enable it, keep the same non-authority invariant: alerts must not trigger approve/dispatch/lease actions.

## Rollback

Stop scraping `/api/v1/metrics`, remove the imported dashboard, and/or set `MISSION_CONTROL_FLEET_MODE=disabled`. Mission Control remains GET-only by default.

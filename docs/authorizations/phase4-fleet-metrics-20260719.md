# Owner authorization — Mission Control Phase 4 fleet + metrics

**Status:** AUTHORIZED  
**Authorized at:** 2026-07-19 (owner chat directive: “Resolve all issues and proceed with the next phase”)  
**Scope:** `ados-mission-control-v2-roadmap-phase4-001`

## Allowed

- Opt-in fleet observation UI (`MISSION_CONTROL_FLEET_MODE=enabled`)
- Prometheus text metrics at `GET /api/v1/metrics`
- Grafana dashboard JSON documentation under `docs/grafana/`

## Prohibited

- Treating fleet member health as authoritative PRIMARY lease for this cockpit
- Cross-member mutation, dispatch, or approval from the fleet view
- Embedding secrets/paths in exported metrics

## Rollback

Leave `MISSION_CONTROL_FLEET_MODE` unset/disabled; stop scraping `/api/v1/metrics`.

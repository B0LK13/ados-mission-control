# ADR-001 — Fleet mode and Prometheus/Grafana hooks

**Status:** Accepted (2026-07-19)  
**Context:** Phase 4 backlog `ados-mission-control-v2-roadmap-phase4-001`

## Decision

1. **Prometheus export** is a GET-only text exposition at `/api/v1/metrics` containing process-local aggregate counters only. It never embeds paths, secrets, lease bodies, or authority claims. Scrapes are auth-exempt like `/api/health` so loopback Prometheus can scrape without Basic credentials; the payload remains non-authoritative.

2. **Fleet mode** is opt-in via `MISSION_CONTROL_FLEET_MODE=enabled` plus `MISSION_CONTROL_FLEET_CONFIG` pointing at a JSON registry. Members are either:
   - local `controlPlaneRoot` probes (filesystem reachability + lease presence), or
   - remote `healthUrl` probes (`GET` health JSON).
   Fleet rows are labeled `OBSERVED` / `UNAVAILABLE` and never merge into the local PRIMARY lease authority.

3. **Grafana** receives a provisioning-friendly dashboard JSON under `docs/grafana/` that scrapes the Prometheus endpoint. No Grafana server is bundled.

## Consequences

- Fleet and metrics can be fully disabled (default).
- Single-project authority invariants remain intact: Cursor cannot become PRIMARY; fleet views cannot approve/dispatch.
- Empty/unconfigured fleet renders a truthful empty state.

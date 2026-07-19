# Mission Control V2 — Current vs Desired Gap Analysis

**Date:** 2026-07-19  
**Repo tip:** Phases 1–4 MVP complete (`MISSION_CONTROL_V2_ROADMAP_PHASES_1_TO_4_MVP_COMPLETE`)  
**Desired-state sources:** `docs/01-PRD-PHASE-1.md`, `docs/04-API-DESIGN.md`, `docs/05-SCREEN-INVENTORY.md`, `docs/08-PHASE-ROADMAP.md`, `docs/09-PHASE-ROADMAP-V3.md`, `SECURITY.md`, auth packages under `docs/authorizations/`

## Current state (summary)

| Area | State |
|------|--------|
| Phase 1 read-only cockpit | Shipped — module views, nine questions, SSE full-snapshot, freshness honesty |
| Phase 2 owner commands | Shipped opt-in — approve/reject/withdraw + signed owner-gate decide |
| Phase 3 controlled ops | Shipped opt-in — approved dispatch prepare/queue + campaign pause/resume |
| Phase 4 fleet/metrics | Shipped opt-in — `/fleet`, Prometheus `/api/v1/metrics`, Grafana JSON stub |
| Central backlog before this analysis | 0 open MC V2 tasks |

## Desired state (beyond Phases 1–4)

1. **V3 Phase 5** — Operator intelligence (conflicts, risk, approval digests, agent drawer, hash verify, overview hardening) — authorized in `docs/authorizations/v3-roadmap-20260719.md`
2. **V3 Phase 6** — Controlled-ops completeness (validators, integration requests, review pickup) — authorized
3. **V3 Phase 7** — Alerting / webhooks / mobile digest / Grafana runbook — authorized
4. **V3 Phase 8** — SSE ADR, performance, fleet polish, threat-model refresh, e2e — authorized
5. **PRD/API residual** — leases/primary + entity detail GETs, pagination/ETag, S5/S6/S9/S10 polish, shared countdown/copy components
6. **Security residual** — CSRF for browser mutations, broader schema registry, SSO/roles design
7. **Phase 2 residual** — request corrections / more evidence

## Gap → backlog mapping

### Already present (V3 epic IDs)

`roadmap-phase5-001` … `phase5-006`, `phase6-001` … `phase6-005`, `phase7-001` … `phase7-005`, `phase8-001` … `phase8-005`

### Added this analysis (2026-07-19)

| Task ID | Gap |
|---------|-----|
| `api-003` | Primary-lease + entity detail GET routes (API design) |
| `api-002` | cursor/limit pagination + ETag |
| `security-003` | CSRF hardening for Phase 2/3/6 browser POSTs |
| `security-004` | Expand schema registry coverage |
| `security-005` | Multi-identity / SSO design ADR |
| `feature-004` | Request corrections / more evidence (Phase 2 leftover) |
| `ui-008` | Handoff LifecycleStepper + filters |
| `ui-009` | Safety DetectorLegend + `/repos` alias |
| `ui-010` | `/owner` action preview catalog (S10) |
| `docs-005` | Sync `docs/04-API-DESIGN.md` with shipped opt-in routes |
| `ux-004` | LeaseExpiryCountdown + CopyIdButton |
| `testing-004` | E2E for Phase 2/3/4 flag off/on |

## Explicit non-gaps (do not backlog as defects)

- Cursor PRIMARY / lease transfer via MC
- Bundled Grafana/Prometheus servers
- Fabricated SSE event deltas without ADR proof
- Holding owner private keys in the MC repo/image

## Recommended execution

1. Phase 5 in sequence (`phase5-001` → `phase5-006`)
2. Parallelize low-risk polish (`ui-008/009`, `docs-005`, `ux-004`) during Phase 5
3. Phase 6 only after Phase 5 exit gate (or explicit override)
4. Phase 7 after conflict signals exist; Phase 8 may overlap late

**Open MC V2 tasks after load:** see auto-generated `BACKLOG.md`.

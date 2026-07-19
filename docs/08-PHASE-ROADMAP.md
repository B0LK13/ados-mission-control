# Phase Roadmap — ADOS Mission Control

> Release note: application version 2.0 ships read-only resilience, opt-in Phase 2 owner commands, opt-in Phase 3 approved-only controlled operations (`MISSION_CONTROL_PHASE3_COMMANDS=enabled`), and opt-in Phase 4 fleet observation + Prometheus/Grafana hooks (`MISSION_CONTROL_FLEET_MODE=enabled`).

## Phase 1 — Read-only observability (current spec package)

**Deliverables:** PRD, IA, data model, API, screens, broker design, security, schemas, sample snapshot, Cursor implementation mission.

**Product capabilities (when built):**
- Agent cards, lease status, approvals list, timeline, task graph, worktrees, handoffs, evidence, safety monitor
- Home cockpit answering nine operational questions
- SSE live updates

**Exit gate:** Specs accepted by Owner + Claude PRIMARY review; sample snapshot schema-valid; implementation mission ready.

## Phase 2 — Owner approvals

- Approve / reject / withdraw with full consequence panels
- Generate signed approval records via ADOS PowerShell tools
- Request corrections / more evidence
- Full audit trail in ledger

**Exit gate:** Every UI mutation produces ADOS-grade approval + ledger event; no raw `state/*` edits from UI.

## Phase 3 — Controlled operations

- Trigger bounded review pickups
- Dispatch **approved** worker tasks only
- Pause/resume workflows
- Run validators
- Create integration requests

**Exit gate:** Dispatch remains impossible without owner approval; Cursor still cannot hold orchestrator lease.

## Phase 4 — Advanced automation (fleet + metrics shipped 2026-07-19)

Shipped behind flags:
- Cross-project fleet observation UI (`/fleet`, `GET /api/v1/fleet`)
- Prometheus text exposition (`GET /api/v1/metrics`)
- Grafana dashboard JSON (`docs/grafana/mission-control-overview.json`)
- Design ADR (`docs/adr/ADR-001-fleet-and-prometheus.md`)

Still deferred / non-goals for this slice:
- Automated conflict detection upgrades
- Risk scoring / intelligent approval summaries
- Mobile alerts
- Bundled Grafana server

**Exit gate:** Fleet mode does not weaken single-project authority invariants (met: NON_AUTHORITATIVE probes only; default off).

## Non-goals across phases (unless contract changes)

- Cursor acquiring or inheriting ADOS PRIMARY lease through Mission Control
- Silent dispatch enablement
- Unaudited write paths into control-plane state

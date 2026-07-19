# Product Brief — ADOS Mission Control

**Codename UI:** The Black Agency Command Deck  
**Phase 1 focus:** Read-only observability

## Problem

ADOS already produces leases, approvals, handoffs, evidence, checkpoints, tasks, and agent results across JSON/JSONL files, Git worktrees, and processes. Operators must manually inspect directories, PowerShell dashboards, and chat transcripts to answer basic questions: who is PRIMARY, what is blocked, what needs approval, and whether the system is healthy.

## Solution

A single operational cockpit that:

1. Aggregates authoritative ADOS state through a **read-model broker**.
2. Presents agents, tasks, approvals, handoffs, worktrees, evidence, and events in one UI.
3. Makes the authority model **visible** (Claude PRIMARY; Cursor NON-AUTHORITATIVE).
4. Defers all mutations to Phase 2+ validated command APIs (never direct `state/*` writes).

## Who it is for

| Persona | Need |
|---------|------|
| Owner | See pending approvals, system health, risk, dispatch status at a glance |
| Operator (Cursor-assisted) | Navigate workflow without digging through folders |
| Claude PRIMARY | Consume consistent status; review proposed UI/impl without lease risk |

## Phase 1 outcomes

- Home dashboard answers the nine operational questions (agents, lease, tasks, blockers, approvals, conflicts, reviews, dispatch, health).
- Modules: Agent Operations, Workflow graph (read-only), Approval Center (read-only), Task graph, Handoff Queue, Repo/Worktree Map, Evidence Explorer, Timeline, Safety monitor.
- Owner Command Center shows **previews only** of future actions (no mutations).

## Explicit non-goals (Phase 1)

- Approve / reject / withdraw approvals
- Lease transfer or Cursor PRIMARY UI
- Enabling production dispatch
- Launching workers
- Push, merge, deploy
- Writing into ADOS `state/**` or mutating leases

## Success

An owner can open Mission Control and, within seconds, know who holds the lease, what is pending, and whether the system is NOMINAL—without opening raw JSON files.

## MVP PoC status (2026-07-19)

**Phase 1 MVP proof of concept: COMPLETE** — classification `MISSION_CONTROL_V2_PHASE1_MVP_POC_COMPLETE` (see `docs/evidence/mvp-poc-20260719/STATUS.json`).

**Phase 2 owner commands MVP: COMPLETE (2026-07-19)** — approve/reject/withdraw + signed owner-gate workflow via allowlisted ADOS tools when `MISSION_CONTROL_PHASE2_COMMANDS=enabled`.

**Phase 3 controlled operations MVP: COMPLETE (2026-07-19)** — approved-only dispatch prepare/queue + campaign pause/resume when `MISSION_CONTROL_PHASE3_COMMANDS=enabled`. See `docs/authorizations/phase3-controlled-operations-20260719.md`. Cursor cannot take PRIMARY lease via Mission Control.

**Phase 6 controlled-ops completeness: COMPLETE (2026-07-19)** — approved validate / integration request / review pickup when `MISSION_CONTROL_PHASE6_COMMANDS=enabled`. See `docs/authorizations/phase6-controlled-ops-20260719.md`.

**Phase 7 alerting: COMPLETE (2026-07-19)** — local rules + optional HTTPS webhook + `/alerts` history/digest when `MISSION_CONTROL_ALERTS=enabled`. See `docs/authorizations/phase7-alerting-20260719.md`.

**Phase 4 fleet + metrics MVP: COMPLETE (2026-07-19)** — opt-in fleet observation (`MISSION_CONTROL_FLEET_MODE=enabled`) + Prometheus `/api/v1/metrics` + Grafana JSON stub. See `docs/authorizations/phase4-fleet-metrics-20260719.md` and `docs/adr/ADR-001-fleet-and-prometheus.md`. Fleet never inherits PRIMARY authority.

**Roadmap MVP closeout:** Phases 1–4 for Mission Control V2 are complete. V3 Phases 5–7 complete.

**Phase 8 hardening: COMPLETE (2026-07-19)** — ADR-002 (SSE deltas deferred), fleet filter/probe-age polish, parallel fleet probes, V3 threat model, Playwright V3 surface coverage.

**V3 roadmap: AUTHORIZED (2026-07-19)** — Phases 5–8 complete. See `docs/09-PHASE-ROADMAP-V3.md` and `docs/authorizations/v3-roadmap-20260719.md`.

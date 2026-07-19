<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.6/5) → target: advanced
- **Summary:** Phase-1 + Phase-2 MVP complete (2026-07-19): read-only Command Deck plus owner-authorized approve/reject/withdraw and signed owner-gate decide via ADOS tools. Remaining open: Phase 3 dispatch (not authorized) and deferred Phase 4 fleet.

## Open Tasks (2)

| Priority | Count |
|---|---|
| Medium | 1 |
| Low | 1 |

### `ados-mission-control-v2-roadmap-phase3-001` — [OWNER-GATED] Phase 3: controlled operations (approved dispatch only)

- **Priority:** Medium | **Severity:** High | **Effort:** L | **Risk:** High | **Phase:** Advanced | **Status:** Open
- **Category:** roadmap / phase-3
- **Owner role:** tech-lead

**Current state:** MC cannot dispatch; control-plane supervisor may operate under separate gates.

**Target state:** MC optional control surface that only triggers already-approved operations through ADOS tools.

**Gap:** No in-UI controlled operations (intentional until authorized).

**Acceptance criteria:**
- [ ] Dispatch impossible without owner approval
- [ ] Cursor still cannot hold orchestrator lease via MC
- [ ] Full audit trail

**Validation steps:**
1. Negative tests: unapproved dispatch denied

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-3, owner-gated

### `ados-mission-control-v2-roadmap-phase4-001` — Phase 4: fleet dashboard and Prometheus/Grafana hooks (defer)

- **Priority:** Low | **Severity:** Low | **Effort:** L | **Risk:** Low | **Phase:** Advanced | **Status:** Open
- **Category:** roadmap / phase-4
- **Owner role:** fullstack-engineer

**Current state:** Single-cockpit metrics counters and /api/health exist; no fleet mode or Grafana integration.

**Target state:** Optional fleet view + metrics export that does not weaken authority invariants.

**Gap:** Multi-project fleet and external metrics backends absent.

**Acceptance criteria:**
- [ ] Fleet mode design review
- [ ] Metrics do not imply authority
- [ ] Can be disabled

**Validation steps:**
1. Design ADR + prototype behind flag

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-4, observability

<!-- END AUTO-GENERATED BACKLOG -->

## Deep analysis (2026-07-19)

Full write-up: [`docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md`](docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md).

**Verdict:** Phase-1 read-only MVP and Phase-2 owner-command MVP are complete. Phase 3 dispatch remains unauthorized per `docs/authorizations/phase2-owner-commands-20260719.md`.

### Recommended next

1. ~~**Phase-1 module surface + hardening**~~ — done 2026-07-19.
2. ~~**roadmap-phase2-001/002**~~ — Approve/reject/withdraw + signed owner-gate workflow (done 2026-07-19; owner-authorized).
3. **Stop** unless owner authorizes **roadmap-phase3-001** (controlled dispatch) or **roadmap-phase4-001** (fleet — deferred).

### Owner-gated (do not implement without authorization)

- **roadmap-phase3-001** — Controlled dispatch of approved work only.
- **roadmap-phase4-001** — Fleet + Prometheus/Grafana (defer).

### Completed earlier (keep for history)

G0–G7 clearance, lease reacq, CI Node 22, campaigns/owner-gates/replay, Docker CI, package schemas, secrets baseline, timing-safe auth, SSE fan-out, PATH-REGISTRY, support-bundle, axe a11y, dead-letter, deps graph, evidence-diff, budget burn, redaction allowlist, keyboard e2e, Phase 2 owner commands.

**Classification:** `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane). Default remains GET-only; Phase 2 commands are opt-in.

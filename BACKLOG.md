<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.7/5) → target: advanced
- **Summary:** Phases 1–4 MVP complete (2026-07-19): read-only Command Deck, opt-in Phase 2/3 commands, opt-in Phase 4 fleet/metrics. V3 roadmap AUTHORIZED: operator intelligence, controlled-ops completeness, alerting, and platform hardening (docs/09-PHASE-ROADMAP-V3.md).

## Open Tasks (1)

| Priority | Count |
|---|---|
| Low | 1 |

### `ados-mission-control-v2-security-004` — Expand schema registry coverage beyond ledger/approval families

- **Priority:** Low | **Severity:** Medium | **Effort:** L | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** security / ingestion
- **Owner role:** fullstack-engineer

**Current state:** Versioned ingestion covers limited families; other records warning-isolated.

**Target state:** Broader allowlisted schemas + explicit unsupported-version warnings for remaining high-traffic types.

**Gap:** Incomplete schema archive increases parse-warning noise and miss risk.

**Acceptance criteria:**
- [ ] New schemas documented
- [ ] Malformed still isolated
- [ ] No silent upgrades of authority

**Validation steps:**
1. validate:schemas
2. ingestion unit tests

**Source evidence:**
- SECURITY.md
- docs/06-READ-MODEL-AND-BROKER.md

**Labels:** security, schemas, gap-analysis-2026-07-19

<!-- END AUTO-GENERATED BACKLOG -->

## Deep analysis (2026-07-19)

Full write-up: [`docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md`](docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md).

**Verdict:** V3 Phases 5–8 complete. Residual non-roadmap gaps remain in the open backlog.

### Recommended next

1. ~~**V3 Phases 5–8**~~ — done 2026-07-19.
2. ~~**Residual polish**~~ — gap-analysis Medium/Low batch closed 2026-07-19 (`api-002/003`, `feature-004`, `docs-005`, `ui-008/009/010`, `ux-004`, `testing-004`, `security-003/005`). Remaining open: `security-004` (schema registry expansion).
3. Optional future: amend ADR-002 to implement SSE deltas only if non-fabricating.

**Classification:** `MISSION_CONTROL_V3_PHASES_5_TO_8_COMPLETE`.

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

## Open Tasks (12)

| Priority | Count |
|---|---|
| Medium | 5 |
| Low | 7 |

### `ados-mission-control-v2-api-003` — Add primary-lease and entity detail GET routes

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** api / read-model
- **Owner role:** fullstack-engineer

**Current state:** Collection GETs only; no /leases/primary; no /{id} detail handlers.

**Target state:** GET leases/primary + detail routes with NOT_FOUND/UNAVAILABLE honesty and redaction.

**Gap:** docs/04-API-DESIGN.md detail/lease endpoints unimplemented.

**Acceptance criteria:**
- [ ] leases/primary from authoritative lease file
- [ ] 404/UNAVAILABLE not fabricated for missing entities
- [ ] Redaction on detail payloads

**Validation steps:**
1. Unit/API tests for missing ids
2. Security: mutations still 405 by default

**Source evidence:**
- docs/04-API-DESIGN.md
- docs/03-DATA-MODEL.md
- docs/audits/MC-V2-GAP-ANALYSIS-2026-07-19.md

**Labels:** api, prd, gap-analysis-2026-07-19

### `ados-mission-control-v2-security-003` — CSRF hardening for browser Phase 2/3/6 mutation POSTs

- **Priority:** Medium | **Severity:** High | **Effort:** M | **Risk:** High | **Phase:** Hardening | **Status:** Open
- **Category:** security / csrf
- **Owner role:** security-engineer

**Current state:** Mutations rely on Basic auth + loopback guidance; no CSRF token/SameSite strategy.

**Target state:** Documented + implemented CSRF defense for cookie/basic browser posts (or explicit loopback-only enforcement).

**Gap:** SECURITY.md flags CSRF as follow-up.

**Acceptance criteria:**
- [ ] Mutations fail without CSRF when browser mode requires it
- [ ] Loopback/automation path documented
- [ ] Tests cover rejection

**Validation steps:**
1. Security unit/e2e
2. SECURITY.md updated

**Source evidence:**
- SECURITY.md
- docs/authorizations/v3-roadmap-20260719.md

**Labels:** security, csrf, gap-analysis-2026-07-19

### `ados-mission-control-v2-feature-004` — Request corrections / more evidence on approvals (Phase 2 leftover)

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** Advanced | **Status:** Open
- **Category:** feature / approvals
- **Owner role:** fullstack-engineer

**Current state:** Approvals UI has approve/reject/withdraw when Phase 2 enabled.

**Target state:** Request-evidence/corrections action via allowlisted tool + consequence preview; audit trail.

**Gap:** Phase 2 exit narrative incomplete vs docs/08-PHASE-ROADMAP.md.

**Acceptance criteria:**
- [ ] Uses ADOS tool only
- [ ] Denied without Phase 2 flag
- [ ] Ledger/audit event

**Validation steps:**
1. Unit negative tests
2. UI disabled when flag off

**Source evidence:**
- docs/08-PHASE-ROADMAP.md
- docs/05-SCREEN-INVENTORY.md

**Labels:** phase2, approvals, gap-analysis-2026-07-19

### `ados-mission-control-v2-docs-005` — Sync API design + ARCHITECTURE with Phase 2–4 implemented routes

- **Priority:** Medium | **Severity:** Low | **Effort:** S | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** documentation / api
- **Owner role:** tech-lead

**Current state:** API design Phase 1-centric; ARCHITECTURE mostly updated.

**Target state:** API design documents opt-in Phase 2/3/4/6 routes, flags, and error codes; remove stale 501 guidance.

**Gap:** Spec/implementation contract drift.

**Acceptance criteria:**
- [ ] Phase flags documented
- [ ] No contradictory 501 for shipped routes
- [ ] Links to auth packages

**Validation steps:**
1. Doc review

**Source evidence:**
- docs/04-API-DESIGN.md
- ARCHITECTURE.md
- docs/08-PHASE-ROADMAP.md

**Labels:** docs, api, gap-analysis-2026-07-19

### `ados-mission-control-v2-testing-004` — E2E coverage for Phase 2/3/4 opt-in surfaces (flag off/on)

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** testing / e2e
- **Owner role:** qa-engineer

**Current state:** live.spec covers read-only views; mutation/fleet paths lightly covered.

**Target state:** Dedicated specs for approvals actions disabled, operations disabled, fleet off; optional enabled project.

**Gap:** Opt-in surfaces lack regression nets.

**Acceptance criteria:**
- [ ] Flag-off asserts NO ACTION / disabled controls
- [ ] Enabled project uses fixtures only

**Validation steps:**
1. npm run test:e2e

**Source evidence:**
- docs/evidence/mvp-poc-20260719/STATUS.json
- playwright.config.ts

**Labels:** e2e, phase2, phase3, phase4, gap-analysis-2026-07-19

### `ados-mission-control-v2-api-002` — Implement cursor/limit pagination and ETag on list endpoints

- **Priority:** Low | **Severity:** Low | **Effort:** M | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** api / pagination
- **Owner role:** fullstack-engineer

**Current state:** List endpoints return full arrays without cursor/ETag.

**Target state:** Optional cursor/limit (default 50, max 200) + ETag/If-None-Match where practical.

**Gap:** API design §1 conventions unmet for large control planes.

**Acceptance criteria:**
- [ ] limit capped at 200
- [ ] Stable cursor semantics documented
- [ ] 304 on matching ETag when implemented

**Validation steps:**
1. Unit tests for limit/cursor
2. Docs updated

**Source evidence:**
- docs/04-API-DESIGN.md

**Labels:** api, performance, gap-analysis-2026-07-19

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

### `ados-mission-control-v2-ui-008` — Handoff LifecycleStepper + richer filters (S5 polish)

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** ui / handoffs
- **Owner role:** frontend-engineer

**Current state:** Handoffs view lists packets with stage badges; no stepper visualization.

**Target state:** Lifecycle stepper + filters for fromAgent/toAgent/lifecycleStage.

**Gap:** Handoff UX incomplete vs PRD screen inventory.

**Acceptance criteria:**
- [ ] Stepper reflects lifecycle only from data
- [ ] Filters do not invent handoffs

**Validation steps:**
1. UI fixture smoke

**Source evidence:**
- docs/05-SCREEN-INVENTORY.md

**Labels:** prd, handoffs, gap-analysis-2026-07-19

### `ados-mission-control-v2-ui-009` — Safety DetectorLegend + /repos alias for worktrees (S6/S9 polish)

- **Priority:** Low | **Severity:** Low | **Effort:** XS | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** ui / polish
- **Owner role:** frontend-engineer

**Current state:** /safety and /worktrees exist; no detector legend; no /repos alias.

**Target state:** Legend explaining detector sources; /repos resolves to worktrees view.

**Gap:** Screen inventory S6/S9 naming/components incomplete.

**Acceptance criteria:**
- [ ] /repos serves worktrees
- [ ] Legend is informational only

**Validation steps:**
1. Route smoke test

**Source evidence:**
- docs/05-SCREEN-INVENTORY.md

**Labels:** prd, safety, worktrees, gap-analysis-2026-07-19

### `ados-mission-control-v2-ui-010` — Owner action preview surface (/owner) for disabled Phase-1 catalog

- **Priority:** Low | **Severity:** Low | **Effort:** M | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** ui / owner
- **Owner role:** frontend-engineer

**Current state:** Approvals/owner-gates/operations are separate; no unified /owner preview catalog.

**Target state:** /owner (or overview panel) listing preview cards with exact consequence text; actions gated by phase flags.

**Gap:** S10 Owner preview surface missing.

**Acceptance criteria:**
- [ ] Preview cards never execute without flag
- [ ] Consequence text present
- [ ] Empty when none applicable

**Validation steps:**
1. UI e2e flag-off

**Source evidence:**
- docs/05-SCREEN-INVENTORY.md

**Labels:** prd, owner, gap-analysis-2026-07-19

### `ados-mission-control-v2-ux-004` — LeaseExpiryCountdown + CopyIdButton shared components

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** ux / components
- **Owner role:** frontend-engineer

**Current state:** Timestamps/IDs shown as plain text.

**Target state:** Shared countdown that never false-expires on skew; copy-id control with a11y.

**Gap:** Screen inventory shared components incomplete.

**Acceptance criteria:**
- [ ] Countdown never shows expired when skew unknown
- [ ] Copy announces success to AT

**Validation steps:**
1. Unit/time skew test
2. a11y smoke

**Source evidence:**
- docs/05-SCREEN-INVENTORY.md

**Labels:** prd, ux, gap-analysis-2026-07-19

### `ados-mission-control-v2-security-005` — Design multi-identity / SSO path (roles beyond single Basic user)

- **Priority:** Low | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** Advanced | **Status:** Open
- **Category:** security / auth
- **Owner role:** security-engineer

**Current state:** Single Basic user when auth enabled.

**Target state:** Design ADR for roles (owner/operator/readonly) + SSO options; no Cursor PRIMARY via IdP.

**Gap:** No path to multi-operator staging.

**Acceptance criteria:**
- [ ] ADR with threat model
- [ ] Explicit non-goal: Cursor PRIMARY
- [ ] Migration notes from Basic

**Validation steps:**
1. Doc review / owner sign-off

**Source evidence:**
- SECURITY.md

**Labels:** security, sso, design, gap-analysis-2026-07-19

<!-- END AUTO-GENERATED BACKLOG -->

## Deep analysis (2026-07-19)

Full write-up: [`docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md`](docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md).

**Verdict:** V3 Phases 5–8 complete. Residual non-roadmap gaps remain in the open backlog.

### Recommended next

1. ~~**V3 Phases 5–8**~~ — done 2026-07-19.
2. **Residual polish** — gap-analysis items (`ui-008/009`, `docs-005`, `security-003`…).
3. Optional future: amend ADR-002 to implement SSE deltas only if non-fabricating.

**Classification:** `MISSION_CONTROL_V3_PHASES_5_TO_8_COMPLETE`.

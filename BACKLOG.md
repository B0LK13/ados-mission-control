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

## Open Tasks (33)

| Priority | Count |
|---|---|
| High | 6 |
| Medium | 17 |
| Low | 10 |

### `ados-mission-control-v2-roadmap-phase5-001` — Phase 5: conflict detection upgrades (dual-primary, path, stale-lease)

- **Priority:** High | **Severity:** High | **Effort:** M | **Risk:** Medium | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** fullstack-engineer

**Current state:** Routing incidents and some safety alerts exist; conflict taxonomy is incomplete vs PRD nine questions.

**Target state:** Deterministic conflict cards for dual-primary, path-conflict, stale-lease, and cross-worktree drift with truthful UNAVAILABLE when unknown.

**Gap:** Operators cannot quickly see structural conflicts that block safe autonomy.

**Acceptance criteria:**
- [ ] Conflict signals derived only from control-plane/fixture state
- [ ] Never invent a conflict when evidence is missing (UNAVAILABLE)
- [ ] Overview or safety surfaces the new conflict cards
- [ ] Unit tests cover positive and absent-signal cases

**Validation steps:**
1. npm run test:unit covering conflict projection
2. Manual fixture check on /overview and /safety

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, conflicts, authorized

### `ados-mission-control-v2-roadmap-phase5-002` — Phase 5: derived risk scoring for approvals, tasks, and campaigns

- **Priority:** High | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** fullstack-engineer

**Current state:** riskLevel fields exist sparsely; no consistent derived scoring model.

**Target state:** lib/risk-scoring.ts produces LOW/MEDIUM/HIGH/CRITICAL bands with rationale; UI badges distinguish INFERRED vs control-plane risk.

**Gap:** Owner lacks a consistent risk glance across approvals/tasks/campaigns.

**Acceptance criteria:**
- [ ] Scores are deterministic from known inputs
- [ ] INFERRED label used when score is derived
- [ ] Never upgrade freshness to AUTHORITATIVE based on score
- [ ] Unit tests for scoring matrix edges

**Validation steps:**
1. Unit tests for risk matrix
2. UI review on /approvals /tasks /campaigns

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, risk, authorized

### `ados-mission-control-v2-roadmap-phase5-003` — Phase 5: rule-based intelligent approval summaries

- **Priority:** High | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** frontend-engineer

**Current state:** Consequence panels list raw arrays; long approvals are hard to scan.

**Target state:** Each approval card shows a rule-based summary (impact, blast radius, expiry, consumption) with UNAVAILABLE when inputs missing.

**Gap:** Owner must manually synthesize approval consequences.

**Acceptance criteria:**
- [ ] No cloud LLM / no secret exfiltration path
- [ ] Summary never invents willDo/willNotDo items
- [ ] Works in fixture mode
- [ ] Unit tests for summarizer

**Validation steps:**
1. Unit tests for summarizer
2. Visual check on /approvals with fixture data

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, approvals, authorized

### `ados-mission-control-v2-roadmap-phase6-001` — Phase 6: approved validator run via allowlisted ADOS tool

- **Priority:** High | **Severity:** High | **Effort:** L | **Risk:** High | **Phase:** V3-ControlledOps | **Status:** Open
- **Category:** roadmap / phase-6
- **Owner role:** tech-lead

**Current state:** Phase 3 covers dispatch prepare/queue and campaign pause/resume only.

**Target state:** Owner can request a validator run for APPROVED scope; unapproved denied; ledger/consumption recorded.

**Gap:** Validators cannot be triggered from Mission Control even when approved.

**Acceptance criteria:**
- [ ] MISSION_CONTROL_PHASE6_COMMANDS flag fail-closed by default
- [ ] Unapproved/expired/consumed denied
- [ ] No Cursor PRIMARY/lease path
- [ ] Audit/consumption ledger updated on accept

**Validation steps:**
1. Negative unit tests for unapproved validate
2. Positive fixture prepare/run via tool
3. npm run verify:readonly

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-6, v3, owner-gated, authorized

### `ados-mission-control-v2-roadmap-phase6-002` — Phase 6: approved integration request creation

- **Priority:** High | **Severity:** High | **Effort:** L | **Risk:** High | **Phase:** V3-ControlledOps | **Status:** Open
- **Category:** roadmap / phase-6
- **Owner role:** tech-lead

**Current state:** No MC path to open integration requests.

**Target state:** Approved-only integration request creation with ledger trail and UI on /operations.

**Gap:** Integration requests remain outside Mission Control.

**Acceptance criteria:**
- [ ] Requires APPROVED disposition scoped to integration
- [ ] Fail-closed without Phase 6 flag
- [ ] No raw state/** writes from Next.js
- [ ] Unit tests for deny/accept

**Validation steps:**
1. Unit tests
2. Fixture approval round-trip

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-6, v3, owner-gated, authorized

### `ados-mission-control-v2-roadmap-phase6-005` — Phase 6: negative tests + audit evidence package

- **Priority:** High | **Severity:** High | **Effort:** M | **Risk:** Medium | **Phase:** V3-ControlledOps | **Status:** Open
- **Category:** roadmap / phase-6
- **Owner role:** qa-engineer

**Current state:** Phase 3 has deny tests; Phase 6 needs its own suite + evidence.

**Target state:** tests/phase6-commands.test.ts covers validate/integration/pickup denies; docs/evidence/phase6-*/STATUS.json recorded.

**Gap:** Phase 6 cannot close without proof of fail-closed behavior.

**Acceptance criteria:**
- [ ] Unapproved actions denied in automated tests
- [ ] Evidence STATUS.json published
- [ ] typecheck + unit + verify:readonly pass

**Validation steps:**
1. npm run test:unit
2. npm run verify:readonly
3. Review evidence package

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-6, v3, testing, authorized

### `ados-mission-control-v2-roadmap-phase5-004` — Phase 5: agent detail drawer on Agents view

- **Priority:** Medium | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** frontend-engineer

**Current state:** Agents view is card/table level without a focused detail surface.

**Target state:** Selecting an agent opens a read-only drawer with authority invariants (Cursor NON-AUTHORITATIVE) and last protocol state.

**Gap:** Operators cannot inspect a single agent without leaving context.

**Acceptance criteria:**
- [ ] Drawer is read-only (no promote/lease controls)
- [ ] Cursor remains NON-AUTHORITATIVE in copy
- [ ] Keyboard accessible open/close
- [ ] Unavailable fields render UNAVAILABLE

**Validation steps:**
1. Manual /agents check
2. Keyboard e2e or unit interaction smoke

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, ui, authorized

### `ados-mission-control-v2-roadmap-phase5-005` — Phase 5: evidence hash verify UI (metadata only)

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Medium | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** fullstack-engineer

**Current state:** Evidence browser shows metadata; no verify action for hash consistency.

**Target state:** UI action recomputes hash from allowed local metadata/path under control-plane root and reports MATCH/MISMATCH/UNAVAILABLE.

**Gap:** Operators cannot confirm evidence integrity from Mission Control.

**Acceptance criteria:**
- [ ] No evidence body content returned to clients
- [ ] Path traversal rejected
- [ ] Secrets redacted in errors
- [ ] Unit tests for MATCH/MISMATCH/UNAVAILABLE

**Validation steps:**
1. Unit tests for hash verify helper
2. Manual /evidence verify on fixture manifest

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, evidence, authorized

### `ados-mission-control-v2-roadmap-phase5-006` — Phase 5: overview nine-question completeness panel

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Low | **Phase:** V3-Intelligence | **Status:** Open
- **Category:** roadmap / phase-5
- **Owner role:** frontend-engineer

**Current state:** Overview answers most questions implicitly; dispatch/conflict/review-waiting are not first-class chips.

**Target state:** Overview shows nine labeled answers with freshness; missing data is UNAVAILABLE not invented.

**Gap:** PRD home-question contract is only partially explicit in UI.

**Acceptance criteria:**
- [ ] All nine PRD questions visible as labeled answers
- [ ] Uses existing snapshot fields; no fabricated counters
- [ ] Fixture mode remains non-authoritative

**Validation steps:**
1. Compare overview chips to PRODUCT_BRIEF / PRD nine questions
2. Fixture mode screenshot or e2e assertion

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-5, v3, overview, authorized

### `ados-mission-control-v2-roadmap-phase6-003` — Phase 6: bounded review pickup for already-approved work

- **Priority:** Medium | **Severity:** High | **Effort:** M | **Risk:** High | **Phase:** V3-ControlledOps | **Status:** Open
- **Category:** roadmap / phase-6
- **Owner role:** fullstack-engineer

**Current state:** Review pickups are external to MC.

**Target state:** Approved-only review pickup action via allowlisted tool with audit trail.

**Gap:** Owners cannot trigger bounded review pickup from the cockpit.

**Acceptance criteria:**
- [ ] Cannot run without APPROVED disposition
- [ ] Does not enable silent production dispatch
- [ ] Cursor still cannot hold PRIMARY lease
- [ ] Ledger event recorded

**Validation steps:**
1. Negative + positive unit tests
2. verify:readonly

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-6, v3, owner-gated, authorized

### `ados-mission-control-v2-roadmap-phase6-004` — Phase 6: expand /operations UI for validate, integration, review pickup

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** V3-ControlledOps | **Status:** Open
- **Category:** roadmap / phase-6
- **Owner role:** frontend-engineer

**Current state:** /operations covers Phase 3 dispatch + campaign control only.

**Target state:** UI sections for validate / integration / review pickup with disabled states when Phase 6 off.

**Gap:** Even after tools exist, operators lack a cockpit surface.

**Acceptance criteria:**
- [ ] Actions disabled when flag off
- [ ] Consequence preview shown before submit
- [ ] Clear copy that Cursor cannot take PRIMARY
- [ ] No mutation when disabled

**Validation steps:**
1. Manual UI with flag on/off
2. Optional Playwright smoke

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-6, v3, ui, authorized

### `ados-mission-control-v2-roadmap-phase7-001` — Phase 7: local alert rule engine for readiness/heartbeat/dead-letter/fleet

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** V3-Alerting | **Status:** Open
- **Category:** roadmap / phase-7
- **Owner role:** fullstack-engineer

**Current state:** Safety alerts are derived inline; no configurable rule engine or history.

**Target state:** lib/alerts/rules.ts evaluates named rules; results available via API; MISSION_CONTROL_ALERTS gate.

**Gap:** Operators only notice issues while looking at the UI.

**Acceptance criteria:**
- [ ] Default disabled
- [ ] Rules never mutate ADOS state
- [ ] Unit tests for rule evaluation
- [ ] No secrets in rule outputs

**Validation steps:**
1. Unit tests for rules
2. Flag off returns empty/disabled projection

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-7, v3, alerts, authorized

### `ados-mission-control-v2-roadmap-phase7-002` — Phase 7: opt-in redacted webhook notifier

- **Priority:** Medium | **Severity:** High | **Effort:** M | **Risk:** High | **Phase:** V3-Alerting | **Status:** Open
- **Category:** roadmap / phase-7
- **Owner role:** security-engineer

**Current state:** No outbound notifier.

**Target state:** Webhook sender uses MISSION_CONTROL_ALERT_WEBHOOK_URL (+ optional secret header); fails closed if misconfigured while alerts enabled.

**Gap:** No push path for operator attention.

**Acceptance criteria:**
- [ ] Webhook URL/secret never committed
- [ ] Payloads pass redaction tests
- [ ] No approve/dispatch actions via webhook callbacks
- [ ] Disabled when alerts flag off

**Validation steps:**
1. Unit tests with mock fetch
2. Redaction assertions on payload

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-7, v3, alerts, security, authorized

### `ados-mission-control-v2-roadmap-phase7-003` — Phase 7: alert history UI

- **Priority:** Medium | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** V3-Alerting | **Status:** Open
- **Category:** roadmap / phase-7
- **Owner role:** frontend-engineer

**Current state:** Safety view shows active derived alerts only.

**Target state:** History list with timestamps, rule id, delivery status, redacted detail.

**Gap:** Operators cannot audit what was fired.

**Acceptance criteria:**
- [ ] Empty/disabled truthful states
- [ ] No mutation controls
- [ ] Secrets absent from rendered detail

**Validation steps:**
1. Manual UI with fixture history
2. Optional e2e

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-7, v3, ui, authorized

### `ados-mission-control-v2-roadmap-phase8-001` — Phase 8: SSE bounded delta protocol ADR (design gate)

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** High | **Phase:** V3-Hardening | **Status:** Open
- **Category:** roadmap / phase-8
- **Owner role:** tech-lead

**Current state:** SSE resume is full-snapshot only (wont-fix for Phase-1).

**Target state:** ADR accepted with threat model; implementation ticket unblocked only if non-fabricating protocol is proven.

**Gap:** Reconnect bandwidth remains high; unsafe deltas were correctly deferred.

**Acceptance criteria:**
- [ ] ADR documents fabrication risks and rejection criteria
- [ ] Keeps full-snapshot fallback
- [ ] No implementation without ADR acceptance note

**Validation steps:**
1. Owner/Claude review of ADR

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-8, v3, sse, adr, authorized

### `ados-mission-control-v2-roadmap-phase8-002` — Phase 8: snapshot/query performance pass

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** V3-Hardening | **Status:** Open
- **Category:** roadmap / phase-8
- **Owner role:** fullstack-engineer

**Current state:** Shared snapshot fan-out exists; rebuild cost under large fixtures is unbudgeted.

**Target state:** Documented baseline + at least one measured improvement (cache, selective IO, or projection reuse) with tests still green.

**Gap:** WSL/D: and large control planes remain slow for operators.

**Acceptance criteria:**
- [ ] Before/after notes in evidence or docs
- [ ] No freshness/authority regressions
- [ ] Unit tests pass

**Validation steps:**
1. Benchmark note + npm run test:unit

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-8, v3, performance, authorized

### `ados-mission-control-v2-roadmap-phase8-004` — Phase 8: threat model + SECURITY.md refresh for V3 surfaces

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Low | **Phase:** V3-Hardening | **Status:** Open
- **Category:** roadmap / phase-8
- **Owner role:** security-engineer

**Current state:** SECURITY covers Phases 2–4 primarily.

**Target state:** SECURITY.md and optional threat-model note cover V3 surfaces and rollback flags.

**Gap:** Security docs lag authorized V3 scope.

**Acceptance criteria:**
- [ ] Phase 6/7 flags documented
- [ ] Webhook secret handling documented
- [ ] INFERRED vs AUTHORITATIVE guidance present

**Validation steps:**
1. Doc review against authorization package

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-8, v3, security, docs, authorized

### `ados-mission-control-v2-roadmap-phase8-005` — Phase 8: Playwright e2e coverage for V3 surfaces

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** V3-Hardening | **Status:** Open
- **Category:** roadmap / phase-8
- **Owner role:** qa-engineer

**Current state:** E2E covers core views/a11y/keyboard; V3 surfaces not covered.

**Target state:** Playwright specs assert V3 routes render and Phase 6/7 controls respect disabled defaults.

**Gap:** Regressions in new surfaces would slip past CI.

**Acceptance criteria:**
- [ ] CI Playwright includes V3 smoke
- [ ] Defaults remain fail-closed in tests
- [ ] No authority regression assertions weakened

**Validation steps:**
1. npm run test:e2e (or project subset)

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-8, v3, e2e, authorized

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

### `ados-mission-control-v2-roadmap-phase7-004` — Phase 7: Grafana external provisioning runbook

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** V3-Alerting | **Status:** Open
- **Category:** roadmap / phase-7
- **Owner role:** devops-engineer

**Current state:** Dashboard JSON stub exists; no operator runbook.

**Target state:** docs/operations/GRAFANA-PROVISIONING.md with scrape config sample and non-authority warnings.

**Gap:** Operators lack a clear path to wire external Grafana.

**Acceptance criteria:**
- [ ] Runbook states metrics are non-authoritative
- [ ] No bundled Grafana server introduced
- [ ] Sample scrape job uses /api/v1/metrics

**Validation steps:**
1. Doc review against ADR-001

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-7, v3, docs, authorized

### `ados-mission-control-v2-roadmap-phase7-005` — Phase 7: mobile alert digest view

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** V3-Alerting | **Status:** Open
- **Category:** roadmap / phase-7
- **Owner role:** frontend-engineer

**Current state:** Mobile nav exists; no alert digest layout.

**Target state:** Compact digest route/section usable on Pixel-class viewports in Playwright mobile project.

**Gap:** On-call mobile glance is weak.

**Acceptance criteria:**
- [ ] Readable on mobile viewport
- [ ] No push infrastructure required
- [ ] Playwright mobile smoke optional but preferred

**Validation steps:**
1. Manual mobile viewport check
2. Optional live-mobile Playwright

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-7, v3, mobile, authorized

### `ados-mission-control-v2-roadmap-phase8-003` — Phase 8: fleet aggregation polish (filters, last-probe age)

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** V3-Hardening | **Status:** Open
- **Category:** roadmap / phase-8
- **Owner role:** frontend-engineer

**Current state:** Fleet probes and cards exist; limited filtering/aggregation.

**Target state:** Filter by reachability/role; show last probe age; still NON_AUTHORITATIVE.

**Gap:** Multi-member fleets are hard to scan.

**Acceptance criteria:**
- [ ] Authority remains NON_AUTHORITATIVE
- [ ] No mutation controls added
- [ ] Empty/disabled states preserved

**Validation steps:**
1. Manual /fleet with fixture members
2. Unit test for filter helper if extracted

**Source evidence:**
- docs/09-PHASE-ROADMAP-V3.md
- docs/authorizations/v3-roadmap-20260719.md
- docs/08-PHASE-ROADMAP.md
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md

**Labels:** phase-8, v3, fleet, authorized

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

**Verdict:** Phases 1–4 complete. **V3 roadmap (Phases 5–8) AUTHORIZED**. Residual PRD/API/security gaps loaded 2026-07-19 — see [`docs/audits/MC-V2-GAP-ANALYSIS-2026-07-19.md`](docs/audits/MC-V2-GAP-ANALYSIS-2026-07-19.md), [`docs/09-PHASE-ROADMAP-V3.md`](docs/09-PHASE-ROADMAP-V3.md), and [`docs/authorizations/v3-roadmap-20260719.md`](docs/authorizations/v3-roadmap-20260719.md).

### Recommended next

1. ~~**Phases 1–4**~~ — done 2026-07-19.
2. **Start V3 Phase 5** — `roadmap-phase5-001` (conflict detection), then 5-002…5-006.
3. **Parallel polish (low risk):** `ui-008/009`, `docs-005`, `ux-004`, `api-003`.
4. **Phase 6** after Phase 5 exit gate — `MISSION_CONTROL_PHASE6_COMMANDS` (`phase6-001`…).
5. **Phase 7** alerting after conflict signals — `MISSION_CONTROL_ALERTS`; **Phase 8** may overlap (SSE needs ADR first).
6. **Security residuals:** `security-003` (CSRF), `security-004` (schemas), `security-005` (SSO design).

### Completed earlier (keep for history)

G0–G7 clearance, lease reacq, CI Node 22, campaigns/owner-gates/replay, Docker CI, package schemas, secrets baseline, timing-safe auth, SSE fan-out, PATH-REGISTRY, support-bundle, axe a11y, dead-letter, deps graph, evidence-diff, budget burn, redaction allowlist, keyboard e2e, Phase 2 owner commands, Phase 3 controlled operations, Phase 4 fleet + metrics.

**Classification:** `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane). Default remains GET-only; Phase 2/3/4/6/7 features are opt-in. V3 authorization: `MISSION_CONTROL_V3_ROADMAP_AUTHORIZED`.

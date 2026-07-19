<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.6/5) → target: advanced
- **Summary:** Phase-1++ read-only cockpit: CI (Node 22 + Playwright incl. axe a11y), support-bundle, PATH-REGISTRY, SSE fan-out, campaigns/owner-gates/replay. Deep analysis 2026-07-19 found Phase-1 screen gaps (workflow/handoffs/worktrees/evidence dedicated views), thin approval consequences, and owner-gated Phase 2+ items.

## Open Tasks (21)

| Priority | Count |
|---|---|
| High | 6 |
| Medium | 9 |
| Low | 6 |

### `ados-mission-control-v2-ui-002` — Add dedicated read-only Workflow graph view for GET /api/v1/workflow

- **Priority:** High | **Severity:** High | **Effort:** M | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ui / workflow
- **Owner role:** frontend-engineer

**Current state:** API route exists; no /workflow nav item or graph UI.

**Target state:** /workflow view renders read-only graph/nodes from workflowSummary with truthful empty states.

**Gap:** PRD visual workflow module missing from Command Deck.

**Acceptance criteria:**
- [ ] Nav item + route
- [ ] Read-only (no drag-to-dispatch)
- [ ] Uses existing API/snapshot fields
- [ ] e2e smoke

**Validation steps:**
1. npm run test:e2e -- --grep workflow || manual /workflow

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-1, screen-inventory

### `ados-mission-control-v2-ui-003` — Add dedicated Handoffs queue view for GET /api/v1/handoffs

- **Priority:** High | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ui / handoffs
- **Owner role:** frontend-engineer

**Current state:** API exists; handoff data not a first-class nav view.

**Target state:** /handoffs view with filters (from/to/lifecycle) and truthful empty states.

**Gap:** Operators inspect handoff directories manually or via unrelated views.

**Acceptance criteria:**
- [ ] Nav + view
- [ ] Filterable list
- [ ] GET-only
- [ ] e2e or unit coverage for projection

**Validation steps:**
1. Open /handoffs against fixtures

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-1, screen-inventory

### `ados-mission-control-v2-ui-004` — Add dedicated Repos / Worktrees view for GET /api/v1/worktrees

- **Priority:** High | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ui / worktrees
- **Owner role:** frontend-engineer

**Current state:** API exists; no dedicated worktrees Command Deck view.

**Target state:** /worktrees (or /repos) shows clean/dirty, branch, owner, residue signals from snapshot.

**Gap:** Path-conflict and worktree hygiene harder to scan than PRD requires.

**Acceptance criteria:**
- [ ] Nav + view
- [ ] Shows dirty/clean and path signals
- [ ] No mutation

**Validation steps:**
1. Fixture worktree rows render

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-1, screen-inventory

### `ados-mission-control-v2-ui-005` — Build Evidence browser UI with optional read-only hash verify

- **Priority:** High | **Severity:** High | **Effort:** M | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ui / evidence
- **Owner role:** fullstack-engineer

**Current state:** GET /api/v1/evidence returns snapshot.evidence metadata only; timeline references paths; no browser or hash verify control.

**Target state:** Evidence view lists bundles/trust indicators; optional GET-only hash recompute that never mutates ADOS.

**Gap:** Evidence trust cannot be inspected end-to-end in the cockpit.

**Acceptance criteria:**
- [ ] Evidence view in nav
- [ ] Trust/freshness labels
- [ ] Hash verify is read-only recompute if implemented
- [ ] Secrets stay redacted

**Validation steps:**
1. Fixture evidence list + security tests still pass

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-1, evidence

### `ados-mission-control-v2-roadmap-phase2-001` — [OWNER-GATED] Phase 2: approve/reject/withdraw via ADOS tools (no raw state writes)

- **Priority:** High | **Severity:** High | **Effort:** L | **Risk:** High | **Phase:** Advanced | **Status:** Open
- **Category:** roadmap / phase-2
- **Owner role:** tech-lead

**Current state:** UI shows read-only approvals with NO UI ACTION / Phase-2 banners.

**Target state:** Authorized command path + UI actions that invoke ADOS PowerShell/tools with full consequence panels and audit trail.

**Gap:** Owner still uses external tools for approval decisions.

**Acceptance criteria:**
- [ ] Owner authorization package exists
- [ ] Every UI mutation → ledger event
- [ ] No raw state/* writes from Next.js
- [ ] Security review

**Validation steps:**
1. Owner gate + integration tests against fixture control plane

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-2, owner-gated, approvals

### `ados-mission-control-v2-roadmap-phase2-002` — [OWNER-GATED] Owner-gate signing workflow UI (keys/nonce/canonicalization)

- **Priority:** High | **Severity:** High | **Effort:** L | **Risk:** High | **Phase:** Advanced | **Status:** Open
- **Category:** roadmap / phase-2
- **Owner role:** security-engineer

**Current state:** Owner-gates view is observation-only.

**Target state:** Signing workflow with key pinning, canonicalization, nonce, expiry, count — only after Phase 2 authorization.

**Gap:** Signing workflow lives nowhere in-product (correct for V2; needed for safe autonomy later).

**Acceptance criteria:**
- [ ] Cryptographic design reviewed
- [ ] UI cannot bypass policy engine
- [ ] Fail-closed without keys

**Validation steps:**
1. Security threat model + fixture signing round-trip

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-2, owner-gated, signing

### `ados-mission-control-v2-ux-002` — Make overview explicitly answer all nine PRD home-screen questions

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ux / overview
- **Owner role:** frontend-engineer

**Current state:** Overview covers readiness, lease, agents, approvals, blockers, alerts, recent executions; dispatch-enabled and path-conflict answers are not first-class chips.

**Target state:** Overview surfaces explicit answers for all nine PRD questions using existing snapshot fields (or documents honest UNAVAILABLE).

**Gap:** Operators may still need secondary views for dispatch/conflict status.

**Acceptance criteria:**
- [ ] Checklist of nine PRD questions mapped to overview UI
- [ ] Missing fields show UNAVAILABLE not invented values
- [ ] Unit or e2e asserts key labels present

**Validation steps:**
1. Read docs/01-PRD-PHASE-1.md §5 against /overview

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** prd, overview

### `ados-mission-control-v2-ux-003` — Add approval consequence panels (willDo / willNotDo / paths) without enabling mutations

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ux / approvals
- **Owner role:** frontend-engineer

**Current state:** Approvals table shows filed vs authoritative disposition and scope summary; no dedicated willDo/willNotDo/path consequence panel.

**Target state:** Each approval shows consequence panel text; Approve/Reject remain disabled with Phase 2 tooltip.

**Gap:** Owner cannot preview exact consequences from the UI alone.

**Acceptance criteria:**
- [ ] Consequence panel rendered from snapshot fields
- [ ] No mutation controls enabled
- [ ] Empty/missing consequences show truthful unavailable copy

**Validation steps:**
1. Manual fixture review + a11y still green

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** approvals, phase-1

### `ados-mission-control-v2-ui-007` — Add task dependency graph visualization (PRD §6.4)

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Optimization | **Status:** Open
- **Category:** ui / tasks
- **Owner role:** frontend-engineer

**Current state:** Tasks view is tabular with filters.

**Target state:** Optional graph/canvas or adjacency visualization derived from task dependencies without inventing edges.

**Gap:** Blocked/ready relationships harder to see than PRD task graph requires.

**Acceptance criteria:**
- [ ] Graph uses only snapshot/API edges
- [ ] Empty/unavailable when deps missing
- [ ] Table remains available

**Validation steps:**
1. Fixture with deps renders; no deps shows empty state

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** prd, tasks

### `ados-mission-control-v2-feature-001` — Add evidence-diff viewer between runs or artifact versions

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Optimization | **Status:** Open
- **Category:** feature / evidence-diff
- **Owner role:** fullstack-engineer

**Current state:** Replay shows single-run chronology; no compare mode.

**Target state:** Read-only diff of two evidence refs or two runIds with redaction and UNAVAILABLE honesty.

**Gap:** Operators cannot see what changed between supervisor runs in-product.

**Acceptance criteria:**
- [ ] Compare two identifiers via GET
- [ ] Redacted output
- [ ] No fabricated diffs when missing

**Validation steps:**
1. Unit tests for ordering/redaction; UI empty states

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** evidence, differentiator

### `ados-mission-control-v2-feature-002` — Add campaign budget burn / forecast panel

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Optimization | **Status:** Open
- **Category:** feature / budgets
- **Owner role:** frontend-engineer

**Current state:** Campaigns table lists Cursor/Claude/Remediation used vs limit.

**Target state:** Panel shows remaining budget, burn rate if timestamps allow, and truthful UNAVAILABLE when rate cannot be derived.

**Gap:** Capacity risk is not visible until budgets are exhausted.

**Acceptance criteria:**
- [ ] Remaining capacity visible
- [ ] No invented burn when timestamps missing
- [ ] Read-only

**Validation steps:**
1. Fixture campaigns render forecast or UNAVAILABLE

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** campaigns, ops

### `ados-mission-control-v2-feature-003` — Add dead-letter / repeated-failure incident surface

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Low | **Phase:** Optimization | **Status:** Open
- **Category:** feature / incidents
- **Owner role:** fullstack-engineer

**Current state:** routing-incidents covers misroute cases; no general dead-letter queue UI.

**Target state:** View or panel listing repeated failures / dead-lettered tasks from snapshot or ledger-derived fields without fabricating.

**Gap:** Chronic failures blend into task tables.

**Acceptance criteria:**
- [ ] Surface only derived failures
- [ ] Links to evidence/replay when present
- [ ] Empty state when none

**Validation steps:**
1. Fixture with repeated failure appears; clean fixture empty

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** ops, reliability

### `ados-mission-control-v2-security-002` — Add structured field allowlisting to redaction pipeline

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Low | **Phase:** Hardening | **Status:** Open
- **Category:** security / redaction
- **Owner role:** security-engineer

**Current state:** lib/redaction.ts removes secret-shaped keys/values.

**Target state:** Allowlist or schema-driven redaction for high-risk envelopes with tests for false negatives.

**Gap:** Novel secret shapes may pass regex-only filters.

**Acceptance criteria:**
- [ ] Allowlist or schema path documented
- [ ] Unit tests for known secret fixtures
- [ ] No regression in support-bundle redaction

**Validation steps:**
1. npm run test:unit — redaction + support-bundle

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** security, redaction

### `ados-mission-control-v2-operations-001` — Push or explicitly waive local main commits ahead of origin

- **Priority:** Medium | **Severity:** Medium | **Effort:** XS | **Risk:** Low | **Phase:** Hardening | **Status:** Open
- **Category:** operations / git
- **Owner role:** tech-lead

**Current state:** As of analysis, main can be ahead of origin/main with unpushed commits.

**Target state:** origin/main includes intended commits or an owner waiver notes why push is deferred.

**Gap:** Remote CI and collaborators do not see local completions.

**Acceptance criteria:**
- [ ] git status not ahead, or written waiver in docs/evidence

**Validation steps:**
1. git status -sb against origin/main

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** git, owner-ops

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

### `ados-mission-control-v2-documentation-004` — Sync ARCHITECTURE.md page list with the live ten-view Command Deck

- **Priority:** Low | **Severity:** Low | **Effort:** XS | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** documentation / architecture
- **Owner role:** frontend-engineer

**Current state:** ARCHITECTURE.md Pages section lists overview/projects/agents/tasks/approvals/timeline/routing-incidents only.

**Target state:** ARCHITECTURE pages section matches navigation in components/mission-control.tsx and notes API-only surfaces.

**Gap:** Docs train operators on a stale IA.

**Acceptance criteria:**
- [ ] ARCHITECTURE lists all live views
- [ ] Mentions API-backed screens not yet in nav if any remain

**Validation steps:**
1. Diff ARCHITECTURE Pages vs navigation array

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** docs, drift

### `ados-mission-control-v2-ui-006` — Add dedicated Safety alerts view (screen inventory S9)

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** ui / safety
- **Owner role:** frontend-engineer

**Current state:** snapshot.alerts rendered on overview only.

**Target state:** /safety view with severity filter and detector legend; shares alert projection.

**Gap:** Safety monitor is not a first-class module.

**Acceptance criteria:**
- [ ] Nav + view
- [ ] Severity filter
- [ ] No duplicate conflicting severity semantics

**Validation steps:**
1. Open /safety with fixture alerts

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** phase-1, safety

### `ados-mission-control-v2-sse-002` — Optional true Last-Event-ID delta resume (beyond full-snapshot replay)

- **Priority:** Low | **Severity:** Low | **Effort:** M | **Risk:** Medium | **Phase:** Optimization | **Status:** Open
- **Category:** performance / sse
- **Owner role:** fullstack-engineer

**Current state:** Documented full-snapshot resume; reconnect e2e exists.

**Target state:** Either implement bounded delta resume safely or document as wont-fix with operator guidance; if implemented, never fabricate missed events.

**Gap:** High-frequency clients refetch entire snapshot on every reconnect.

**Acceptance criteria:**
- [ ] Decision recorded in ARCHITECTURE
- [ ] If deltas: correctness tests; else explicit wont-fix note

**Validation steps:**
1. Re-read events/stream route + ARCHITECTURE

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** sse, performance

### `ados-mission-control-v2-testing-003` — Add keyboard-navigation Playwright coverage beyond axe scans

- **Priority:** Low | **Severity:** Low | **Effort:** S | **Risk:** Low | **Phase:** Hardening | **Status:** Open
- **Category:** testing / accessibility
- **Owner role:** frontend-engineer

**Current state:** live-a11y covers wcag tags on four views.

**Target state:** e2e exercises tab order through rail + primary filters on key views.

**Gap:** Keyboard usability regressions can land despite axe green.

**Acceptance criteria:**
- [ ] At least overview+tasks keyboard path tested
- [ ] Fails on unreachable primary controls

**Validation steps:**
1. npm run test:e2e -- --grep keyboard || new project

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** a11y, keyboard

### `ados-mission-control-v2-dx-001` — Document WSL + D: native-FS build workaround for Next.js

- **Priority:** Low | **Severity:** Low | **Effort:** XS | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** documentation / dx
- **Owner role:** frontend-engineer

**Current state:** Tribal knowledge only; no README/DEPLOYMENT note.

**Target state:** Short DX note in README or DEPLOYMENT with recommended /tmp or clone-to-ext4 workflow.

**Gap:** Agent/dev sessions waste time on hung builds.

**Acceptance criteria:**
- [ ] Documented workaround with commands
- [ ] Notes lightningcss native binary caveat

**Validation steps:**
1. Read README/DEPLOYMENT for WSL section

**Source evidence:**
- docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md
- docs/05-SCREEN-INVENTORY.md
- docs/08-PHASE-ROADMAP.md

**Labels:** wsl, dx

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

**Verdict:** Strong Phase-1++ read-only cockpit (CI, a11y, replay, support-bundle, freshness honesty). Incomplete against Phase-1 screen inventory — several APIs lack dedicated views. Phase 2+ mutation/signing correctly absent until owner-gated.

### Recommended next (MC-local, not owner-gated)

1. **ui-002…005** — Dedicated `/workflow`, `/handoffs`, `/worktrees`, `/evidence` views (APIs already exist).
2. **ux-002 / ux-003** — Overview nine PRD questions + approval consequence panels (still read-only).
3. **feature-001…003** — Evidence-diff, budget forecast, dead-letter/incident surface.
4. **security-002 / testing-003 / dx-001 / operations-001** — Redaction allowlist, keyboard e2e, WSL build note, push local `main`.

### Owner-gated (do not implement without authorization)

- **roadmap-phase2-001/002** — Approve/reject/withdraw + signing UI via ADOS tools (never raw `state/*` from Next.js).
- **roadmap-phase3-001** — Controlled dispatch of approved work only.
- **roadmap-phase4-001** — Fleet + Prometheus/Grafana (defer).

### Completed earlier (keep for history)

G0–G7 clearance, lease reacq, CI Node 22, campaigns/owner-gates/replay, Docker CI, package schemas, secrets baseline, timing-safe auth, SSE fan-out, PATH-REGISTRY, support-bundle, axe a11y gate, support-bundle/path docs.

**Classification:** `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane). MC V2 remains GET-only observability.
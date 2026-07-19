<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.6/5) → target: advanced
- **Summary:** Phase-1 MVP PoC complete (2026-07-19): read-only Command Deck with full module surface, dead-letter, deps graph, evidence-diff, budget burn, high-risk redaction allowlist, keyboard e2e, WSL DX notes. Remaining open work is Phase 2/3 OWNER-GATED + Phase 4 deferred.

## Open Tasks (4)

| Priority | Count |
|---|---|
| High | 2 |
| Medium | 1 |
| Low | 1 |

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

**Verdict:** Strong Phase-1++ read-only cockpit (CI, a11y, replay, support-bundle, freshness honesty). Incomplete against Phase-1 screen inventory — several APIs lack dedicated views. Phase 2+ mutation/signing correctly absent until owner-gated.

### Recommended next (MC-local, not owner-gated)

1. ~~**ui-002…006 + ux-002/003 + docs-004**~~ — Dedicated workflow/handoffs/worktrees/evidence/safety views, nine-question overview, approval consequences, ARCHITECTURE sync (done 2026-07-19).
2. ~~**feature-001 / feature-002**~~ — Evidence-diff viewer + campaign budget burn/forecast (done 2026-07-19).
3. ~~**feature-003 / ui-007**~~ — Dead-letter surface + task dependency graph on `/tasks` (done 2026-07-19).
4. ~~**security-002 / testing-003 / dx-001 / operations-001 / sse-002**~~ — Closed or deferred in central backlog; only owner-gated roadmap items remain open.

### Owner-gated (do not implement without authorization)

- **roadmap-phase2-001/002** — Approve/reject/withdraw + signing UI via ADOS tools (never raw `state/*` from Next.js).
- **roadmap-phase3-001** — Controlled dispatch of approved work only.
- **roadmap-phase4-001** — Fleet + Prometheus/Grafana (defer).

### Completed earlier (keep for history)

G0–G7 clearance, lease reacq, CI Node 22, campaigns/owner-gates/replay, Docker CI, package schemas, secrets baseline, timing-safe auth, SSE fan-out, PATH-REGISTRY, support-bundle, axe a11y gate, support-bundle/path docs.

**Classification:** `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane). MC V2 remains GET-only observability.

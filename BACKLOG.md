<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** moderate (overall score 3.4/5) → target: advanced
- **Summary:** Well-documented read-only ADOS observability cockpit (README, ARCHITECTURE.md, DEPLOYMENT.md, Dockerfile, docker-compose.staging.yml, tests/ with broker/io/normalization specs, evidence/ and examples/) that is a separate real project from the similarly-named agent-development-os-mission-control, creating naming collision risk; no .github/workflows found despite mature test setup.

## Open Tasks (7)

| Priority | Count |
|---|---|
| Critical | 1 |
| Medium | 4 |
| Low | 2 |

### `ados-mission-control-v2-blocked-001` — [BLOCKED] Clear Cursor-First G0–G7 gates before control-plane supervisor writes

- **Priority:** Critical | **Severity:** Critical | **Effort:** S | **Risk:** High | **Phase:** Foundation | **Status:** Blocked
- **Category:** governance / authorization
- **Owner role:** owner

**Current state:** Planning package complete; executionAuthorization false; G0–G7 incomplete per IMPLEMENTATION-READINESS.

**Target state:** All gates green with evidence; campaign APPROVED; then BL-A3/U1 may write control-plane schemas.

**Gap:** Supervisor implementation cannot legally start in the orchestrator tree.

**Acceptance criteria:**
- [ ] CANONICAL_PATHS_RECONCILED recorded
- [ ] Disk-backed campaign status APPROVED with budgets
- [ ] Write allowlist + pre-change hashes for next unit
- [ ] Lease healthy; cursor-windows eligible; adapter dry-run VERIFIED
- [ ] Git/source home declared

**Validation steps:**
1. Walk checklist in ados-mission-control-update-package/docs/IMPLEMENTATION-READINESS.md

**Source evidence:**
- ados-mission-control-update-package/docs/BACKLOG-CURSOR-FIRST-SUPERVISOR.md §3
- executionAuthorization: false in package docs

**Labels:** blocked, authorization, cursor-first

### `ados-mission-control-v2-replay-001` — Add read-only run replay projection and /api/v1/replay endpoint

- **Priority:** Medium | **Severity:** Medium | **Effort:** L | **Risk:** Medium | **Phase:** Enhancement | **Status:** In Progress
- **Category:** api / replay
- **Owner role:** fullstack-engineer

**Current state:** GET /api/v1/replay and lib/replay.ts exist; UI/replay sequence parity and Playwright still open.

**Target state:** lib/replay.ts + GET /api/v1/replay?campaignId&runId returns ordered redacted events with CACHED/STALE labels as appropriate.

**Gap:** AE6 cockpit/UI sequence parity cannot be demonstrated.

**Acceptance criteria:**
- [ ] Replay endpoint is GET-only and redacted
- [ ] Missing run returns truthful UNAVAILABLE
- [ ] Unit tests cover ordering and redaction
- [ ] UI or docs describe how to open a replay

**Validation steps:**
1. npm run test:unit && npm run verify:readonly

**Source evidence:**
- ados-mission-control-update-package BL-F1/BL-F2
- Show-AdosRunReplay.ps1 stub in update package

**Labels:** replay, evidence, cursor-first

### `ados-mission-control-v2-sse-001` — Harden SSE reconnect and heartbeat signaling for live cockpit

- **Priority:** Medium | **Severity:** High | **Effort:** M | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** reliability / sse
- **Owner role:** frontend-engineer

**Current state:** SSE route exists at /api/v1/events/stream; reconnect UX and heartbeat labeling are limited.

**Target state:** UI shows connected/reconnecting/disconnected; freshness falls back from LIVE on disconnect; Playwright covers reconnect.

**Gap:** Operators can misread a stalled stream as live health.

**Acceptance criteria:**
- [ ] UI connection state visible on overview
- [ ] Disconnect downgrades freshness label away from LIVE
- [ ] Playwright reconnect or connection-state assertion exists

**Validation steps:**
1. npm run test:e2e -- tests/e2e/live.spec.ts

**Source evidence:**
- app/api/v1/events/stream/route.ts
- components/mission-control.tsx live subscription
- update-package AE6 SSE reconnect requirement

**Labels:** sse, reliability, ui

### `ados-mission-control-v2-security-001` — Add secrets baseline and make detect-secrets pre-commit usable

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** security / secret-scanning
- **Owner role:** security-engineer

**Current state:** .pre-commit-config.yaml points at .secrets.baseline; .mission-control-auth.env exists locally and must stay ignored.

**Target state:** Baseline committed; pre-commit detect-secrets passes; SECURITY.md notes local auth file handling.

**Gap:** Secret scanning hook may fail or be skipped locally.

**Acceptance criteria:**
- [ ] .secrets.baseline exists and is committed
- [ ] detect-secrets hook can run without || true
- [ ] .mission-control-auth.env remains gitignored

**Validation steps:**
1. pre-commit run detect-secrets --all-files

**Source evidence:**
- .pre-commit-config.yaml args --baseline .secrets.baseline
- .gitignore and .mission-control-auth.env

**Labels:** security, pre-commit

### `ados-mission-control-v2-deployment-001` — Add Docker image build job and staging smoke to CI

- **Priority:** Medium | **Severity:** Medium | **Effort:** M | **Risk:** Medium | **Phase:** Hardening | **Status:** Open
- **Category:** ci-cd / container
- **Owner role:** platform-engineer

**Current state:** Dockerfile and docker-compose.staging.yml exist with evidence packs, but CI does not build the image.

**Target state:** CI builds the image; optional smoke hits /api/health; evidence script remains the deep verification path.

**Gap:** Image regressions can ship unnoticed until manual staging.

**Acceptance criteria:**
- [ ] CI job builds Dockerfile successfully
- [ ] Smoke check of /api/health documented
- [ ] No requirement to mount real ADOS roots in CI (fixture/env ok)

**Validation steps:**
1. Inspect CI logs for docker build success

**Source evidence:**
- Dockerfile
- docker-compose.staging.yml
- evidence/deployment-v2/

**Labels:** docker, ci-cd

### `ados-mission-control-v2-observability-001` — Add structured request metrics counters for health and ingest warnings

- **Priority:** Low | **Severity:** Low | **Effort:** M | **Risk:** Low | **Phase:** Enhancement | **Status:** Open
- **Category:** observability / metrics
- **Owner role:** platform-engineer

**Current state:** logging.ts emits structured events; health returns readiness but not cumulative operational counters.

**Target state:** Health or /api/v1/metrics (read-only) returns bounded counters without secrets/paths.

**Gap:** Staging operators lack quantitative signals beyond single snapshot health.

**Acceptance criteria:**
- [ ] Counters available without leaking secrets or filesystem paths
- [ ] Documented in DEPLOYMENT.md
- [ ] Unit test covers counter increment on warning path

**Validation steps:**
1. npm run test:unit
2. Inspect health/metrics JSON in fixture mode

**Source evidence:**
- lib/logging.ts
- app/api/v1/health/route.ts
- roadmap Phase 4 Grafana/Prometheus note

**Labels:** observability, ops

### `ados-mission-control-v2-ux-001` — Improve mobile Command Deck density and filter persistence

- **Priority:** Low | **Severity:** Low | **Effort:** M | **Risk:** Low | **Phase:** Enhancement | **Status:** Open
- **Category:** frontend / ux
- **Owner role:** frontend-engineer

**Current state:** Mobile Playwright checks exist; filters are client state only and overview is dense on narrow viewports.

**Target state:** Filters reflected in URL search params; mobile layout prioritizes lease/health/blockers before secondary panels.

**Gap:** Operator usability on tablets/phones is limited despite e2e coverage.

**Acceptance criteria:**
- [ ] Key filters persist via URL
- [ ] Mobile overview shows primary operational questions without horizontal overflow
- [ ] Existing mobile e2e remains green

**Validation steps:**
1. npm run test:e2e -- tests/e2e/mobile.spec.ts

**Source evidence:**
- tests/e2e/mobile.spec.ts
- components/mission-control.tsx filter state

**Labels:** ux, mobile

<!-- END AUTO-GENERATED BACKLOG -->

## Recommendations summary (2026-07-18 session)

Ordered against `ados-mission-control-update-package/04-CURSOR-MASTER-INSTRUCTION.md`.

### Critical / blocked (owner)

1. Clear **G0–G7** (see `ados-mission-control-update-package/docs/GATE-VERIFICATION-2026-07-18.md`) before any control-plane supervisor write.
2. Renew orchestrator lease heartbeat; current lease was expired/stale at verification.
3. Approve a disk-backed Cursor-First campaign (budgets 3/2/2, push/merge/deploy DENY for pilot).

### High — Mission Control (in progress / next)

4. ~~Harden CI to Node 22 + full verify/e2e~~ (done this session).
5. ~~Campaigns / owner-gates GET APIs + UI + freshness labels~~ (U7 partial — done).
6. Replay UI surface + SSE reconnect Playwright (API stub exists; UI/e2e reconnect still open).
7. Docker image build job in CI.

### Medium — package / contracts

8. Port package schemas to control-plane `config/schemas/` **only after** G3–G4 (U1 / BL-A3).
9. Keep package fixtures/schemas synced (`npm`/`node` validate-package-schemas.mjs).
10. Secrets baseline for pre-commit detect-secrets.

### Additional features (post-authorization)

11. Supervisor Shadow queue/FSM (U3), Cursor loop with Fake CLI (U4), Claude review dispatcher (U5).
12. Four-pane WT cockpit + live event broker (U6).
13. Kill switches / service recovery / pilot (U8) → stop at `OWNER_ACTION_REQUIRED: Authorize local commit`.

**Handoff report:** `ados-mission-control-update-package/docs/COMPLETION-REPORT-2026-07-18.md`  
**Classification:** `ADOS_CURSOR_FIRST_SUPERVISOR_V1_HANDOFF_READY`

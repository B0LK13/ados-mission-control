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

## Open Tasks (1)

| Priority | Count |
|---|---|
| Critical | 1 |

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

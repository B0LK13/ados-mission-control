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

## Open Tasks (0)

| Priority | Count |
|---|---|


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
6. ~~Replay UI surface + SSE reconnect Playwright~~ (done this session — `/replay` UI + live e2e).
7. ~~Docker image build job in CI~~ (done — `.github/workflows/ci.yml` `docker-image` job).

### Medium — package / contracts

8. Port package schemas to control-plane `config/schemas/` **only after** G3–G4 (U1 / BL-A3).
9. ~~Keep package fixtures/schemas synced~~ (done — `npm run validate:package-schemas` in verify + CI).
10. ~~Secrets baseline for pre-commit detect-secrets~~ (done — refreshed `.secrets.baseline` + `npm run verify:secrets`).

### Additional features (post-authorization)

11. Supervisor Shadow queue/FSM (U3), Cursor loop with Fake CLI (U4), Claude review dispatcher (U5).
12. Four-pane WT cockpit + live event broker (U6).
13. Kill switches / service recovery / pilot (U8) → stop at `OWNER_ACTION_REQUIRED: Authorize local commit`.

### Reliability / security (MC-local)

14. ~~Basic auth `crypto.timingSafeEqual` (FBL-SEC-004)~~ (done).
15. ~~Shared SSE/REST snapshot cache + SSE event ids (FBL-PERF-002 / FBL-UX-001)~~ (done).

**Handoff report:** `ados-mission-control-update-package/docs/COMPLETION-REPORT-2026-07-18.md`  
**Classification:** `ADOS_CURSOR_FIRST_SUPERVISOR_V1_PACKAGE_HANDOFF_READY` (package/planning only — control-plane implementation remains blocked pending owner gates; see `docs/COMPLETION-REPORT-2026-07-18.md`)

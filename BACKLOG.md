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

1. ~~Clear **G0–G7**~~ (cleared/waived — `docs/GATE-CLEARANCE-STATUS.md` + package-wide validation waiver + `g0-g7-mc-pilot-001-20260718T150618Z/STATUS.json`).
2. ~~Renew orchestrator lease heartbeat~~ (done 2026-07-19 — `reacq-20260719a`, new lease `b2001bb2-…`, holder PID alive + heartbeat advancing; evidence `docs/evidence/lease-reacq-request-20260719/EXECUTE-RESULT.json`).
3. ~~Approve a disk-backed Cursor-First campaign~~ (`MC-PILOT-001` + `ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION` are APPROVED and unexpired).

### High — Mission Control (in progress / next)

4. ~~Harden CI to Node 22 + full verify/e2e~~ (done this session).
5. ~~Campaigns / owner-gates GET APIs + UI + freshness labels~~ (U7 partial — done).
6. ~~Replay UI surface + SSE reconnect Playwright~~ (done this session — `/replay` UI + live e2e).
7. ~~Docker image build job in CI~~ (done — `.github/workflows/ci.yml` `docker-image` job).

### Medium — package / contracts

8. ~~Port package schemas (U1 / BL-A3)~~ — source + **runtime deploy complete** 2026-07-19 (`Deploy-OrchestratorRuntime -Execute`, 27 files; evidence `docs/evidence/lease-reacq-request-20260719/deploy-20260719/`).
9. ~~Keep package fixtures/schemas synced~~ (done — `npm run validate:package-schemas` in verify + CI).
10. ~~Secrets baseline for pre-commit detect-secrets~~ (done — refreshed `.secrets.baseline` + `npm run verify:secrets`).

### Additional features (post-authorization)

11. ~~Supervisor Shadow queue/FSM (U3), Cursor loop with Fake CLI (U4), Claude review dispatcher (U5)~~ — landed in supervisor-source closeout (`LOCAL_CLOSEOUT_READY_AWAITING_PUSH_MERGE_AUTH`); lease healthy — activation awaits owner commit/push/merge gates.
12. ~~Four-pane WT cockpit + live event broker (U6)~~ — source closeout evidence present; runtime activation awaits owner commit/push gates.
13. Kill switches / service recovery / pilot (U8) → stop at `OWNER_ACTION_REQUIRED: Authorize local commit` (controls exist in source; pilot activation awaits owner commit authorization).

### Reliability / security (MC-local)

14. ~~Basic auth `crypto.timingSafeEqual` (FBL-SEC-004)~~ (done).
15. ~~Shared SSE/REST snapshot cache + SSE event ids (FBL-PERF-002 / FBL-UX-001)~~ (done).
16. ~~Canonical tree / path registry (FBL-DX-001 / FBL-DOC-001)~~ (done — `docs/PATH-REGISTRY.md`).
17. ~~Remove stale `Topics` relocation target from package README (FBL-DOC-002)~~ (done).
18. ~~Playwright starts standalone server (matches `output: "standalone"`)~~ (done — `scripts/start-e2e-server.mjs`).

**Handoff report:** `ados-mission-control-update-package/docs/COMPLETION-REPORT-2026-07-18.md`  
**Classification:** `ADOS_CURSOR_FIRST_SUPERVISOR_V1_PACKAGE_HANDOFF_READY` (package/planning only — control-plane implementation remains blocked pending owner gates; see `docs/COMPLETION-REPORT-2026-07-18.md`)

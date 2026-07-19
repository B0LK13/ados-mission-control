<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.6/5) → target: advanced
- **Summary:** CI now runs lint/typecheck/unit/readonly/build/Playwright on Node 22 (previously absent); recent work added a redacted support-bundle export, canonical path registry, Basic-auth hardening, SSE/REST fan-out, and an axe-core a11y suite not yet wired as a required CI check.

## Open Tasks (3)

| Priority | Count |
|---|---|
| High | 1 |
| Medium | 2 |

### `ados-mission-control-v2-testing-002` — Make the new axe-core accessibility suite a required CI check

- **Priority:** High | **Severity:** High | **Effort:** S | **Risk:** Low | **Phase:** Hardening | **Status:** Open
- **Category:** testing / accessibility
- **Owner role:** frontend-engineer

**Current state:** tests/e2e/a11y.spec.ts (axe-core, 4 views) exists as an untracked working-tree file; not committed or run in CI.

**Target state:** a11y spec committed and run as a required CI check that fails the build on serious/critical violations.

**Gap:** New accessibility coverage isn't yet enforced, so regressions could ship unnoticed.

**Acceptance criteria:**
- [ ] a11y.spec.ts committed
- [ ] CI job runs it
- [ ] CI fails on serious/critical axe violations

**Validation steps:**
1. git add tests/e2e/a11y.spec.ts; open PR; confirm CI runs and can fail

**Source evidence:**
- ados-mission-control/tests/e2e/a11y.spec.ts untracked as of 2026-07-19

**Labels:** testing, accessibility

### `ados-mission-control-v2-documentation-003` — Document the redacted support-bundle export and canonical path registry features

- **Priority:** Medium | **Severity:** Medium | **Effort:** S | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** documentation / readme
- **Owner role:** tech-lead

**Current state:** Support-bundle export and canonical path registry exist in code/commits but aren't documented in README or ARCHITECTURE.md.

**Target state:** README/ARCHITECTURE.md describe both features, their purpose, and how to invoke the support-bundle export.

**Gap:** Recently shipped features are undiscoverable from the project's own documentation.

**Acceptance criteria:**
- [ ] README/ARCHITECTURE.md mention support-bundle export
- [ ] README/ARCHITECTURE.md mention canonical path registry

**Validation steps:**
1. Read README/ARCHITECTURE.md for both feature names

**Source evidence:**
- git log: 'feat: add redacted read-only support bundle export', 'docs: add canonical path registry and standalone e2e launcher' (2026-07-19)

**Labels:** documentation, readme

### `ados-mission-control-v2-code-quality-001` — Commit pending working-tree changes (secrets baseline, config, a11y test)

- **Priority:** Medium | **Severity:** Medium | **Effort:** XS | **Risk:** Low | **Phase:** Foundation | **Status:** Open
- **Category:** code-quality / repo-hygiene
- **Owner role:** tech-lead

**Current state:** Modified: .secrets.baseline, BACKLOG.md, app/globals.css, package-lock.json, package.json, playwright.config.ts. Untracked: notes/BACKLOG.md, tests/e2e/a11y.spec.ts.

**Target state:** Working tree is clean; all intentional changes committed with clear messages, generated files (BACKLOG.md, notes/BACKLOG.md) confirmed gitignored if not meant to be tracked.

**Gap:** Uncommitted work is at risk of loss and isn't visible to CI or collaborators.

**Acceptance criteria:**
- [ ] git status clean
- [ ] BACKLOG.md / notes/BACKLOG.md handling decided (tracked vs gitignored)

**Validation steps:**
1. git status --short returns nothing

**Source evidence:**
- git status --short in ados-mission-control shows 6 modified + 2 untracked as of 2026-07-19 11:33

**Labels:** code-quality, repo-hygiene

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

11. ~~Supervisor Shadow queue/FSM (U3), Cursor loop with Fake CLI (U4), Claude review dispatcher (U5)~~ — on `origin/main` (private GitHub).
12. ~~Four-pane WT cockpit + live event broker (U6)~~ — on `origin/main`; runtime state-preserving-deployed.
13. ~~Kill switches / service recovery / pilot (U8)~~ — remotes pushed; BL-G2 ensure; shadow + **controlled Cursor-primary (fixture)** active. LIVE_UNSCOPED Cursor + publication still DENY.
20. ~~BL-G2 Windows service / Task Scheduler recovery~~ — task `ADOS_LeaseHolder_Ensure` registered; Windows `kill`→Stop-Process hazard fixed; ensure tests 4/4.
21. ~~Standing shadow pilot (feature flags 1–2)~~ — active.
22. ~~Controlled Cursor-primary + flags 3–6~~ — gate `gate-ea0dad36625d416f` → fixture primary verified; MC-PILOT → 2026-07-26.
23. ~~Rollout flags 7–8~~ — cockpit auto-open + Cursor-first default (`gate-b61b459ce39e4f82`); supervisor-source `384e32f`; completion report `docs/COMPLETION-REPORT-2026-07-19.md`.

### Reliability / security (MC-local)

14. ~~Basic auth `crypto.timingSafeEqual` (FBL-SEC-004)~~ (done).
15. ~~Shared SSE/REST snapshot cache + SSE event ids (FBL-PERF-002 / FBL-UX-001)~~ (done).
16. ~~Canonical tree / path registry (FBL-DX-001 / FBL-DOC-001)~~ (done — `docs/PATH-REGISTRY.md`).
17. ~~Remove stale `Topics` relocation target from package README (FBL-DOC-002)~~ (done).
18. ~~Playwright starts standalone server (matches `output: "standalone"`)~~ (done — `scripts/start-e2e-server.mjs`).
19. ~~Support-bundle exporter (FBL-OPS-003)~~ (done — `GET /api/v1/support-bundle` + footer download).

**Handoff report:** `ados-mission-control-update-package/docs/COMPLETION-REPORT-2026-07-18.md`  
**Classification:** `ADOS_CURSOR_FIRST_SUPERVISOR_V1_ROLLOUT_COMPLETE_CONTROLLED` (flags 1–8 on; Cursor-first default; Headless cockpit auto-open; LIVE_UNSCOPED + publication still DENY; see `docs/COMPLETION-REPORT-2026-07-19.md` + `docs/evidence/rollout-complete-controlled-20260719/`)

# Mission Control V2 — Deep Analysis & Roadmap Gap Review

**Target:** `D:\ados-mission-control` / `/mnt/d/ados-mission-control` (canonical MC V2)  
**Analyzed:** 2026-07-19  
**Sources:** `docs/01-PRD-PHASE-1.md`, `docs/05-SCREEN-INVENTORY.md`, `docs/08-PHASE-ROADMAP.md`, `ARCHITECTURE.md`, `README.md`, `docs/audits/FABLE-ADOS-WHOLE-PROJECT-AUDIT-2026-07-18.md`, live code under `app/`, `components/`, `lib/`, CI, and `/mnt/d/backlog/tasks.json`.

---

## 1. Executive verdict

Mission Control V2 is a **strong Phase-1++ read-only cockpit**: authenticity-first freshness labels, GET-only APIs, Basic-auth + timing-safe compare, SSE with reconnect e2e, campaigns/owner-gates/replay, support-bundle export, axe a11y gate, Docker CI smoke, and a clear non-mutation boundary.

It is **not** finished against its own Phase-1 screen inventory or PRD module set. Several APIs exist without dedicated Command Deck views; approval consequence UX and evidence browsing are thin; Phase 2+ mutation/signing remains correctly out of scope until owner-authorized.

**Maturity (workspace score):** strong **3.6/5** → target advanced. Highest remaining leverage is closing Phase-1 UI surface gaps (workflow/handoffs/worktrees/evidence) and operator-facing evidence/budget/incident tools — not expanding authority.

---

## 2. Current state map

### Shipped (do not re-open)

| Area | Evidence |
|---|---|
| Core views | `overview`, `projects`, `agents`, `tasks`, `approvals`, `campaigns`, `owner-gates`, `timeline`, `routing-incidents`, `replay` |
| Broker + cache | `lib/broker/*`, SQLite cache, shared SSE/REST snapshot fan-out |
| Auth / security | middleware method deny, Basic auth, `lib/security/timing-safe.ts`, `.secrets.baseline`, `verify:secrets` |
| Replay | `GET /api/v1/replay` + UI + redaction + UNAVAILABLE |
| Support bundle | `GET /api/v1/support-bundle` + footer download |
| A11y | `tests/e2e/a11y.spec.ts`, `npm run test:a11y`, included in `test:e2e` CI |
| CI | Node 22 lint/typecheck/unit/readonly/schemas/secrets/build/Playwright + Docker smoke |
| Paths | `docs/PATH-REGISTRY.md` |
| Classification | `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane); MC itself remains read-only |

### Implemented APIs without dedicated nav views

`workflow`, `handoffs`, `worktrees`, `evidence`, `safety/alerts` — data is partly folded into overview/timeline/projects, but Phase-1 screens S2/S5/S6/S7/S9 are not first-class Command Deck routes.

### Boundary that must stay

- No approve/reject/dispatch/lease mutation from this UI.
- Owner-gate cards correctly show **NO UI ACTION**.
- Phase 2+ items in the backlog are **planning/authorization tracks**, not invitations to break the read-only contract.

---

## 3. Roadmap crosswalk

### Phase 1 — Read-only observability (`docs/08-PHASE-ROADMAP.md` + PRD)

| Deliverable | Status | Gap |
|---|---|---|
| Agent cards + lease | Partial→Strong | No agent detail drawer; Cursor non-authoritative copy present |
| Approvals list | Partial | Missing consequence panels (willDo / willNotDo / paths) |
| Timeline / SSE | Strong | Resume is full-snapshot only (documented), not delta |
| Task graph | Weak | Table only; no dependency graph |
| Worktrees / handoffs / evidence / safety / workflow | Weak–Partial | APIs exist; dedicated screens missing |
| Home nine questions | Partial | Dispatch-enabled and path-conflict answers not first-class on overview |
| Staging auth + cache recovery | Strong | Done |

### Phase 2 — Owner approvals

**Not started in MC (correct).** Needs separate owner-authorized command path + ADOS tool integration. Backlogged as Advanced / owner-gated.

### Phase 3 — Controlled operations

**Out of scope for MC V2 UI** until Phase 2 authority exists. Backlogged as Advanced / owner-gated.

### Phase 4 — Advanced automation

Fleet dashboard, mobile alerts, Grafana/Prometheus — deferred Advanced items.

---

## 4. Gap register (MC-local)

Severity: **C** critical · **H** high · **M** medium · **L** low. Effort: XS/S/M/L.

### Product / UX (Phase 1 completeness)

| ID | Sev | Effort | Gap |
|---|---|---|---|
| GAP-UI-01 | H | M | No dedicated `/workflow` graph view (API present) |
| GAP-UI-02 | H | M | No dedicated `/handoffs` queue view |
| GAP-UI-03 | H | M | No dedicated `/worktrees` (repos) view |
| GAP-UI-04 | H | M | Evidence browser thin: API `contentIngested: false`; no hash-verify UI |
| GAP-UI-05 | M | M | No task dependency graph (PRD §6.4) |
| GAP-UI-06 | M | S | Approval consequence panels incomplete vs screen inventory S3 |
| GAP-UI-07 | M | S | Overview does not explicitly answer all nine PRD home questions |
| GAP-UI-08 | L | S | No dedicated `/safety` route (alerts only on overview) |
| GAP-UI-09 | L | S | No agent detail drawer |

### Operator / differentiators

| ID | Sev | Effort | Gap |
|---|---|---|---|
| GAP-OPS-01 | M | M | No evidence-diff viewer (replay exists; side-by-side/hash diff does not) |
| GAP-OPS-02 | M | M | Campaign budgets show used/limit only — no burn/forecast |
| GAP-OPS-03 | M | M | No dead-letter / repeated-failure incident surface |
| GAP-SSE-01 | L | M | SSE `Last-Event-ID` acknowledged but resume always re-emits full snapshot |

### Security / quality / DX

| ID | Sev | Effort | Gap |
|---|---|---|---|
| GAP-SEC-01 | M | S | Redaction is regex-heavy; structured allowlist still recommended (FBL-SEC-003) |
| GAP-TEST-01 | L | S | Keyboard-nav e2e beyond axe not present |
| GAP-DOC-01 | L | XS | `ARCHITECTURE.md` pages list still lists seven legacy views |
| GAP-DX-01 | L | XS | WSL + `D:` `next build` is extremely slow; native `/tmp` workaround undocumented |
| GAP-OPS-04 | M | XS | Local `main` may be ahead of `origin` — push is owner/ops hygiene |

### Future (owner-gated — do not implement without authorization)

| ID | Sev | Effort | Gap |
|---|---|---|---|
| GAP-P2-01 | H | L | Approve / reject / withdraw with ADOS-grade ledger events |
| GAP-P2-02 | H | L | Owner-gate signing workflow UI |
| GAP-P3-01 | H | L | Controlled dispatch of approved workers only |
| GAP-P4-01 | L | L | Fleet mode + Prometheus/Grafana |

### Explicitly closed this review

- Axe a11y suite committed + CI via `test:e2e` / `test:a11y`
- Support-bundle + PATH-REGISTRY documented
- Prior uncommitted a11y/secrets/config hygiene landed

---

## 5. Recommendations (ordered)

### Tier 1 — This week (Phase-1 completeness)

1. **Dedicated views for existing APIs:** workflow, handoffs, worktrees, evidence (read-only). Highest user-visible completeness vs effort.
2. **Approval consequence panels** without enabling mutations.
3. **Overview nine-question audit** — add explicit dispatch / conflict / review-waiting chips if missing from snapshot fields.
4. **Sync ARCHITECTURE pages list** with the live ten-view nav.

### Tier 2 — This month (operator value)

5. Evidence-diff viewer (build on replay + evidence metadata).
6. Budget burn/forecast panel on Campaigns.
7. Dead-letter / repeated-failure incident view (may share routing-incidents patterns).
8. Structured redaction allowlist + keyboard-nav e2e.

### Tier 3 — Authorized only

9. Phase 2 approval actions via ADOS PowerShell/tools — never raw `state/*` writes from Next.js.
10. Phase 3 controlled operations behind owner gates.
11. Phase 4 fleet / metrics backends.

### Keep (do not “improve away”)

- Fail-closed read-only boundary and “NO UI ACTION” banners.
- Truthful `UNAVAILABLE` / `STALE` / freshness labels.
- Fixture vs live mode honesty.

---

## 6. Suggested execution order

```text
Week 1:  ARCHITECTURE sync → overview nine-questions → approval consequences
Week 2:  /workflow → /handoffs → /worktrees views
Week 3:  /evidence browser (+ optional hash recompute) → /safety route
Week 4+: evidence-diff → budget forecast → dead-letter → redaction allowlist
Later:   Phase 2+ only after explicit owner authorization package
```

---

## 7. Backlog linkage

Central tasks live in `/mnt/d/backlog/tasks.json` (`project_id: ados-mission-control-v2`).  
Per-project open list: `BACKLOG.md` (auto-generated section).  
This analysis is mirrored into backlog task IDs created 2026-07-19 under categories `ui`, `ux`, `api`, `security`, `testing`, `documentation`, `operations`, and `roadmap`.

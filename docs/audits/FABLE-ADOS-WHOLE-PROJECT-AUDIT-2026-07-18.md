# FABLE WHOLE-PROJECT AUDIT — ADOS Ecosystem

**Auditor role:** Fable, independent senior product / software / security / reliability / UX / QA / autonomy reviewer
**Operating mode:** `READ_ONLY_DIAGNOSTIC` (no project files edited, no state mutated, no leases touched, no agents launched)
**Audit date:** 2026-07-18
**Authoritative campaign:** `ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION` (approval `approval-4161dde85611494b986bbd5e4c5ba019`)
**Final status:** `FABLE_PROJECT_AUDIT_COMPLETE` (with explicitly documented blind spots — see §24)

---

## 1. Executive summary

The ADOS ecosystem is an ambitious, unusually well-governed autonomous-agent orchestration platform. Its **design** is strong: a deterministic non-LLM supervisor, an append-only ledger, fail-closed execution leases, a control-plane mutation API gated by lease + write-lock + transaction journal, a strictly read-only Mission Control cockpit, and a governance model that keeps commit/push/merge/deploy behind owner-only gates. The security *intent* and the trust-boundary *documentation* are above the norm for a project this young.

The gap is between **specification and implemented reality**. The platform is a rich collection of well-built *components* that are **not yet wired into a closed autonomous loop**, and several machine-readable contracts (schemas) **disagree with the code that is supposed to satisfy them**. The most important issues are not exotic exploits — they are integrity and coherence problems that will cause an autonomous run to either fail closed unexpectedly or behave inconsistently across the PowerShell control plane and the JSON schema layer.

Highest-impact themes:

1. **The autonomous loop is not closed in code.** `Invoke-AdosSupervisor.ps1` performs a policy dry-run and refuses real launch; nothing orchestrates supervisor → adapter → evidence → remediation → review → gate. The pieces exist (`Invoke-CursorAgent.ps1`, `AdosRemediation.psm1`, `AdosPolicy.psm1`, `AdosSupervisorState.psm1`) but are not composed. (VERIFIED GAP, P1)
2. **Schema/implementation contract divergence.** The PowerShell policy engine emits decision objects that do not conform to `policy-decision.schema.json` (different field names, extra enum values); campaign status values used by the FSM and supervisor entrypoint (`RUNNING`, `DRAFT`, `BLOCKED`, `QUARANTINED`) are not in `campaign.schema.json`'s `status` enum. An automated validator would reject the platform's own runtime output. (VERIFIED DEFECT, P1)
3. **Policy engine omits two campaign-level controls it is documented to enforce:** campaign **expiry** and **kill switch** are never checked in `Get-AdosPolicyDecision`. (VERIFIED DEFECT, P1)
4. **Queue claim is not atomic.** `New-AdosQueueClaim` does read-modify-write of a whole JSON array with no lock/mutex, contradicting the "atomic claim / no duplicate dispatch" invariant. (VERIFIED DEFECT, P1)
5. **Path/identity incoherence across trees.** Three similarly-named Mission Control trees exist; `lib/config.ts` and `README.md` still default to the known-stale `D:\agent-development-os-orchestrator-source` path; the Cursor adapter's default `$CanonicalRepository` (`D:\agent-development-os`) does not match the pilot worktree's real git common dir. (VERIFIED DEFECT / CONFLICT, P1–P2)
6. **Governance authority conflict.** A package-wide validation **waiver** (owner-verbatim, 2026-07-18) declares all validations/gates non-blocking, while the machine-readable `ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION.json` still carries eight `requiredValidations`, and two APPROVED campaigns with overlapping scope exist. A human and an automated agent would reach opposite conclusions. (DOCUMENTATION CONFLICT, P1)

Mission Control V2 (`D:\ados-mission-control`) is the most mature artifact: real tests, CI, redaction, fail-closed auth, read-only enforcement at middleware, and honest data-quality labeling. Its issues are mostly optimizations and one stale-config defect.

**Overall readiness:** planning/handoff-ready and component-ready; **not** autonomous-operation-ready. No P0 (active bypass / data-loss) was demonstrated; the fail-closed posture is genuinely load-bearing and is why the gaps degrade to "blocks safe autonomy" (P1) rather than "unsafe autonomy" (P0).

---

## 2. Measured project / path inventory (PASS 0)

All paths measured directly on disk 2026-07-18. Git identity read from `.git` metadata.

| Path | Exists | Git | Branch | HEAD | Role |
|---|---|---|---|---|---|
| `…\orchestrators\agent-development-os-orchestrator-source` | Yes | standalone repo | `main` | `07053a29…` | **Supervisor SOURCE** (frozen baseline; 1 commit) |
| `…\orchestrators\agent-development-os-mission-control-cursor-live-integration` | Yes | **worktree** of `D:\agent-development-os-mission-control` | `cursor/mission-control-live-integration` | `942c42de…` | MC live-integration worktree |
| `D:\agent-development-os-mission-control` | Yes | repo (worktree host) | `cursor/…` @ `942c42de…` | — | Host repo for the MC integration worktree (third MC tree) |
| `D:\ados-mission-control` | Yes | repo | `main` | `00b60fe4…` | **Mission Control V2** (canonical UI; user-selected folder) |
| `D:\ados-mission-control\ados-mission-control-update-package` | Yes | **not git** | — | — | Cursor-First planning package + campaigns/schemas |
| `D:\agent-development-os-orchestrator` | Yes | repo | `main` | `8ada4981…` | **Runtime / control plane** (leases, ledger, approvals) |
| `D:\ados-mission-control\docs` | Yes | (in V2 repo) | — | — | MC PRD/IA/data-model/API/security/roadmap |
| `D:\agent-development-os-orchestrator-source` | **No** | — | — | — | Known-stale path (correctly absent) |

Key identity observations:
- The **campaign's declared HEADs match reality** (`07053a29…` supervisor source, `942c42de…` MC integration). Good.
- The supervisor **source** tree (frozen, 1 commit) and the **runtime** tree contain **divergent copies of the same `tools/`** (e.g. `Test-InvokeCursorAgent.ps1` 16.7 KB vs 42.5 KB; `New-AgentRelayMessage.ps1` 5.3 KB vs 5.7 KB). Which is authoritative for a given tool is not declared.
- Runtime lease at audit time: `leaseId 25b0d21e…`, CLAUDE/PRIMARY/ACTIVE, `expiresAt 2026-07-18T17:37:42Z`, `heartbeatAt 16:37:42Z`. With `maxHeartbeatAgeSeconds=30`, the lease was **stale/expired at audit time** (transient runtime observation, not a code defect).

---

## 3. Audit coverage matrix

| Pass | Surface | Depth | Result |
|---|---|---|---|
| 0 | Identity/baseline (7 roots) | Full | Complete |
| 1 | Docs/requirements (package 00–12, MC docs, campaigns, schemas) | Full | Complete |
| 2 | Architecture | Full (source read) | Complete |
| 3 | Autonomy/orchestration | Full | Complete — loop gap found |
| 4 | Security/authorization | Full (lease gate, writer, adapter, middleware, redaction) | Complete |
| 5 | Reliability/recovery | High (code + config) | Complete |
| 6 | Code quality | High | Complete |
| 7 | Testing | Medium-High (inventory + mapping) | Tests **not executed** (read-only + no run budget) |
| 8 | Performance | Medium (static) | No benchmarks run |
| 9 | Product/UX/accessibility | Medium (code + specs; UI not rendered) | Screens not visually inspected |
| 10 | API/data/event model | High | Complete |
| 11 | Ops/observability | Medium | Complete |
| 12 | Docs/DX | Full | Complete |
| 13 | Feature-gap | Full | Complete |
| Adv. | Adversarial self-review | Full | Complete |

Not reviewed: live test execution, rendered UI, large-scale performance behavior, full 173 KB `approvals.jsonl` (approval `4161…` existence not independently confirmed within budget — see §24).

---

## 4. Requirements-traceability matrix (roadmap phases → status)

Source: `03-PHASED-IMPLEMENTATION-PLAN.md` (package) and `docs/08-PHASE-ROADMAP.md` (MC).

| Phase | Requirement | Impl location | Status |
|---|---|---|---|
| P0 | Canonical path reconciliation | `docs/SCOPE-RECONCILIATION-*`, `GATE-VERIFICATION-*` | PARTIAL / CONFLICTING (stale paths remain in config/README) |
| P1 | Versioned schemas | `update-package/schemas/*.json` | IMPLEMENTED_NOT_VERIFIED — **diverge from PS engine output** |
| P2 | Deterministic policy engine | `tools/AdosPolicy.psm1` | PARTIAL (no expiry, no kill switch, no file-pattern enforcement, no budget accounting) |
| P3 | Queue + state-transition + crash recovery | `tools/AdosSupervisorState.psm1` | PARTIAL (non-atomic claim; no replay/recovery) |
| P4 | Cursor-first execution loop | `adapters/Invoke-CursorAgent.ps1` + `tools/Invoke-AdosSupervisor.ps1` | PARTIAL — adapter strong; **supervisor does not invoke it** |
| P5 | Automatic remediation | `tools/AdosRemediation.psm1` | PARTIAL (contract builders only; not loop-driven) |
| P6 | Automatic Claude review | `AdosRemediation.psm1`, `Watch-ClaudeEvents.ps1` | PARTIAL (contract only; no dispatcher wiring) |
| P7 | Live event broker + 4-pane cockpit | `Write-OrchestrationEvent.ps1`, `Open-AdosOperationsCockpit.ps1`, `Invoke-VisibleAgentHost.ps1` | PARTIAL |
| P8 | Mission Control integration | `D:\ados-mission-control` V2 | IMPLEMENTED_NOT_VERIFIED (canonical MC worktree separate; not accepted) |
| P9 | Kill switch / quarantine | `Set-AdosCampaignControl` | PARTIAL (state helper exists; not enforced by policy engine) |
| P10 | Windows service / restart recovery | `Deploy-OrchestratorRuntime.ps1`, failover state | PARTIAL |
| P11 | Mission Control pilot | `campaigns/MC-PILOT-001*` | PLANNED (APPROVED on disk; not executed end-to-end) |
| P12 | Hardening/release | evidence/, SECURITY.md | PLANNED |
| MC | Read-only V2 cockpit | `D:\ados-mission-control` | IMPLEMENTED_AND_VERIFIED (tests+CI present; not re-run here) |

---

## 5. Architecture assessment (PASS 2)

**Strengths.** Clean control-plane vs project-plane separation is a real, enforced boundary, not a convention: Mission Control has *no* mutation route (405 at middleware), all control-plane mutation funnels through `_control_plane_writer.py` under a lease gate + write-lock + transaction journal, and execution leases reject cross-platform (Windows vs WSL) mutation. The event envelope (`Write-OrchestrationEvent.ps1`) is uniform, sequenced, redaction-aware, and itself lease-gated. Fail-closed is the pervasive default.

**Weaknesses.**
- **No composition layer.** The supervisor entrypoint validates policy and returns; there is no durable process that reads missions, claims, dispatches the adapter, verifies evidence, triggers remediation/review, and advances the FSM. The "autonomous loop" is architecture-on-paper. (FBL-ARCH-001)
- **Two divergent state machines.** `05-GOVERNANCE` defines a *task/mission* FSM (`RECEIVED→…→COMPLETED`); `AdosSupervisorState.psm1` implements a *campaign* FSM (`DRAFT→APPROVED→RUNNING→…`). Neither references the other, and the campaign schema's `status` enum matches *neither*. (FBL-ARCH-002 / FBL-CON-002)
- **Source vs runtime tool drift** with no declared authority creates split-brain maintenance risk. (FBL-ARCH-003)
- **Ownership of orchestration is ambiguous** across two APPROVED campaigns (FULL-IMPLEMENTATION vs MC-PILOT-001) with overlapping worktrees and different budgets. (FBL-GOV-001)

---

## 6. Product and feature assessment (PASS 9 summary)

Mission Control V2 delivers seven read-only views (`overview, projects, agents, tasks, approvals, timeline, routing-incidents`) plus campaigns/owner-gates/replay, each with explicit `LIVE|CACHED|MOCK|STALE|INFERRED|AUTHORITATIVE|UNAVAILABLE` labels and truthful empty states — an unusually honest UX for operational tooling. Client-side search/filter exists on tasks/approvals/timeline.

Missing product surfaces the roadmap itself calls for and that safe autonomy needs: an **owner-gate decision/approval-signing surface** (currently "no UI action" banners only — correct for V2, but the signing workflow lives nowhere), an **incident timeline / dead-letter view**, an **evidence diff viewer**, a **budget-forecast** panel, and **SSE reconnect** UX (server has heartbeats but no `Last-Event-ID` resume). See §15.

---

## 7. Security and authorization assessment (PASS 4)

**Genuinely strong, defensively.**
- Approval validation in `Invoke-CursorAgent.ps1` is thorough: approval must be found, `APPROVED`, `issuedBy=owner`, not expired, **scoped to task or worktree**, and **single-use consumption** checked against `approval-consumptions.jsonl`.
- Worktree identity is pinned on branch + HEAD + tree + git-common-dir + no-remote + tracked-clean; any mismatch fails closed before launch.
- Adapter uses `ProcessStartInfo.ArgumentList` (argv array) — **no shell string, no `Invoke-Expression`, no task-content interpolation** — a strong command-injection defense; `--force` is off by default and flagged DANGEROUS.
- Lease gate (`_lease_gate.py`) checks state, expiry, mutation margin, heartbeat age, and **platform-aware holder liveness** (Windows `tasklist` for Windows holders; refuses POSIX fallback so a coincidental Linux PID cannot impersonate a Windows holder). Writer enforces single-active-lease, holder credentials (leaseId+sessionId or holder-PID), host identity, CAS target hashes re-pinned under lock, control-char rejection, path-escape rejection, duplicate-event rejection, and atomic `os.replace` + `fsync`.
- Mission Control: 405 on non-safe methods, fail-closed Basic auth (503 if enabled-but-unconfigured), secret redaction before API/UI/log/persistence, path-confinement via `resolveWithinRoot`.

**Weaknesses / risks.**
- **Policy engine trusts booleans it does not compute** (`BudgetRemaining`, `EvidenceSufficient`, `IdentityMatch` are parameters with permissive defaults). Whoever calls it can pass `-BudgetRemaining $true`; the engine does no independent accounting. Combined with the missing expiry/kill-switch checks, the policy engine is weaker than the document implies. (FBL-SEC-001, FBL-POL-001)
- **`filePatterns` returned but never enforced** by the policy engine; write-root prefix is checked but per-file allowlist is not. (FBL-SEC-002)
- Redaction is regex/keyword-based (`lib/redaction.ts`): good coverage for PEM/API-key/bearer/connection-string/`C:\Users\…`, but novel secret shapes can slip; defense-in-depth only. (FBL-SEC-003, RISK)
- `constantTimeEqual` in `middleware.ts` is best-effort in JS (V8 string ops are not guaranteed constant-time). Low impact on loopback. (FBL-SEC-004, RISK)
- No public-key signing / signature canonicalization / nonce for owner approvals — approvals are file-status + single-use, not cryptographically signed. The roadmap names a "signed owner-approval interface" as future; until then approval authenticity rests on filesystem integrity. (FBL-SEC-005, GAP)

No exploit instructions are provided; all above are defensive observations.

---

## 8. Reliability and recovery assessment (PASS 5)

| Failure mode | Handling | Gap |
|---|---|---|
| Corrupt/empty lease | Fail closed (`read_lease` raises; `Read-ExecutionLease` throws) | — |
| Partial write | Atomic `os.replace`+`fsync` (writer); tmp+`Move-Item` (PS lease) | Queue claim (`Set-Content`) not tmp-swapped |
| Stale lease | Detected (heartbeat age, expiry, holder liveness) | — |
| Duplicate dispatch | Idempotency key + active-claim check | **Not atomic** — TOCTOU race between check and write |
| Crash/reboot recovery | Documented (05-GOVERNANCE §crash) | **Not implemented** — no replay/finalize/quarantine code in FSM module |
| Corrupt JSONL (MC) | Per-record isolation + warnings (`parseJsonLines`) | — |
| Source disappears (MC) | STALE cache recovery + UNAVAILABLE empty snapshot | — |
| Duplicate ledger event | `DUPLICATE_EVENT` rejection in writer | O(n) full-file scan per append (perf) |

Biggest reliability gap: **crash recovery is specified but not coded**, and the **non-atomic queue claim** undermines the "no duplicate dispatch" invariant the whole model depends on. (FBL-REL-001, FBL-REL-002)

---

## 9. Testing assessment (PASS 7)

**Present.** MC V2 has ~33 unit/security assertions across 10 spec files (`broker, io, normalization, redaction, security, schema-registry, data-quality, metrics, read-model, supervisor-projections`), 4 Playwright e2e specs (auth/live/mobile/unavailable), full CI (Node 22 lint/typecheck/unit/readonly-audit/schema/build/e2e + docker job). Supervisor source ships PS test files (`Test-AdosPolicy.ps1`, `Test-AdosSupervisorState.ps1`, `Test-AdosEventOrder.ps1`, `Test-AdosRemediation.ps1`, extensive `Test-InvokeCursorAgent.ps1`).

**Gaps.**
- No test asserts **schema conformance of the PowerShell policy-decision output** against `policy-decision.schema.json` — exactly why FBL-CON-001 went unnoticed.
- No **concurrency/idempotency race test** for `New-AdosQueueClaim` (two claimants, same task).
- No **crash-recovery** test (kill mid-dispatch, restart, assert no duplicate launch) — the Phase 3/10 exit criterion.
- No **campaign-expiry / kill-switch** policy tests (because the engine does not implement them).
- MC e2e **SSE reconnect** test still open (per BACKLOG).
- No accessibility (axe) automation on either MC tree (VALIDATION.md admits this).

Every P1 finding includes a required test.

---

## 10. Performance assessment (PASS 8)

Static observations only (no benchmarks run):
- `_control_plane_writer.append-jsonl` reads the **entire file** and scans **every existing line** for duplicates on each append; `event-ledger.jsonl` is already 261.9 KB and `approvals.jsonl` 173.5 KB. O(n) per event, O(n²) over a run. (FBL-PERF-001)
- MC `readJsonLines` tails the last ≤4 MB — good, bounded.
- `New-AdosQueueClaim` rewrites the whole array each claim — O(n) per claim.
- SSE rebuilds a **fresh full snapshot every `refreshMs`** (default 5 s) per connected client with no shared cache. (FBL-PERF-002)
- Event sequence counter uses a named mutex + counter file per event — correct but adds syscall overhead at volume.

Recommend benchmarks for ledger append and snapshot build before high-volume autonomy; none are measured today.

---

## 11. UX and accessibility assessment (PASS 9)

Strong truthful-state design and explicit provenance labels. Not visually rendered in this audit. Known/likely gaps: SSE reconnect UX, no automated a11y audit, owner-gate signing workflow absent, no incident/replay-diff visual surfaces. Severity conveyed by icon+text (not color alone) is claimed by construction but unverified by tooling. (FBL-UX-001..003)

---

## 12. Operations and observability assessment (PASS 11)

Structured JSONL event stream with uniform envelope, redaction, sequence ordering, and lease-gated writes is a solid observability spine. Failover state file, worktree registry, phase history, and evidence bundles exist. Missing for true unattended operation: **metrics/counters** (dispatch rate, remediation cycles, budget burn), **health/readiness endpoints for the supervisor** (MC has them; the supervisor process does not exist as a service yet), **alerting**, **dead-letter queue**, and a **support-bundle exporter**. (FBL-OPS-001..003)

---

## 13. Documentation and developer-experience assessment (PASS 12)

Documentation volume and quality are high (package 00–12, MC PRD/IA/data-model/API/security/roadmap, runbooks, gate-verification, completion reports). This is also where the **authority conflicts** live:
- **Validation waiver vs campaign JSON** (FBL-GOV-002, CONFLICT): `VALIDATION-WAIVED-PACKAGE-WIDE-20260718.md` (owner-verbatim) says all validations/gates non-blocking; `ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION.json` still lists 8 `requiredValidations`.
- **Stale path references** in `D:\ados-mission-control\README.md` (source-roots table) and `lib/config.ts` default (`D:\agent-development-os-orchestrator-source`, which does not exist). (FBL-DOC-001)
- **`00-README.md` still names the `D:\Topics\orchestrators\…` relocation target** that gate-verification found missing. (FBL-DOC-002)
- **Withdrawn signal reused:** `ADOS_CURSOR_FIRST_SUPERVISOR_V1_HANDOFF_READY` appears in `BACKLOG.md` as if actionable, though `COMPLETION-REPORT` explicitly withdraws it as an execution signal. (FBL-DOC-003)

---

## 14. Master deduplicated finding register

Severity = impact×likelihood; Confidence reflects directness of evidence. Effort XS/S/M/L/XL.

### P1 — blocks safe autonomous operation

**FBL-ARCH-001 — Autonomous loop not composed in code**
Class: VERIFIED GAP · Project: supervisor-source · Files: `tools/Invoke-AdosSupervisor.ps1` (returns after policy dry-run; refuses real launch); no orchestrator driving `adapters/Invoke-CursorAgent.ps1` → `AdosRemediation.psm1` → review → FSM.
Evidence: `Invoke-AdosSupervisor.ps1` throws on real launch and never calls the adapter; remediation/review modules only build contracts. Impact: the advertised owner→…→gate loop cannot run unattended. Confidence: High. Effort: L. Priority: P1.
Recommended change: implement a durable `Invoke-AdosSupervisorLoop` (service/Task-Scheduler host) that claims a mission, calls the policy engine, reserves budget, dispatches the adapter, verifies the evidence manifest, drives remediation/review per triggers, and advances the FSM; one real launch per authorized child task.
Acceptance: fixture mission runs end-to-end with no manual relay; crash mid-run resumes without duplicate launch. Tests: e2e loop + crash-recovery. Rollback: keep Shadow mode as default flag. Owner: platform lead.

**FBL-CON-001 — Policy-decision output does not conform to its schema**
Class: VERIFIED DEFECT · Files: `tools/AdosPolicy.psm1` vs `update-package/schemas/policy-decision.schema.json`.
Evidence: engine emits `{decision, reasonCode, campaignId, runtime, leaseState, …}`; schema *requires* `{decisionId, outcome, rationaleCode, evaluatedAt}` and forbids additional properties (`additionalProperties:false`). Engine also emits outcomes absent from the schema enum (`BLOCK_LEASE_INVALID`, `BLOCK_CONCURRENT_WRITER`, `BLOCK_STALE_PROJECTION`, `BLOCK_BUDGET_EXHAUSTED`). Impact: schema validation of the platform's own decisions fails; evidence pipeline cannot validate policy records. Confidence: High. Effort: M. Priority: P1.
Recommended change: reconcile — widen the schema enum and rename fields, or map engine output to the schema at the boundary; add a conformance test. Acceptance: every emitted decision validates. Tests: schema-conformance unit.

**FBL-CON-002 — Campaign `status` enum inconsistent across schema, FSM, and entrypoint**
Class: VERIFIED DEFECT · Files: `schemas/campaign.schema.json` (status enum: `PENDING, APPROVED, PAUSED, REVOKED, EXPIRED, COMPLETED`) vs `AdosSupervisorState.psm1` (transitions over `DRAFT, RUNNING, BLOCKED, QUARANTINED`) vs `Invoke-AdosSupervisor.ps1` (accepts `APPROVED, RUNNING, PAUSED` — `RUNNING` not in schema).
Impact: a campaign the supervisor considers dispatchable can be schema-invalid; FSM states cannot be persisted into a schema-valid campaign. Confidence: High. Effort: M. Priority: P1.
Recommended change: define one canonical campaign lifecycle; align schema enum, FSM, and entrypoint; separate campaign-status from run/task-status explicitly. Tests: FSM↔schema conformance.

**FBL-POL-001 — Policy engine omits campaign expiry and kill-switch enforcement**
Class: VERIFIED DEFECT · File: `tools/AdosPolicy.psm1`.
Evidence: `Get-AdosPolicyDecision` never reads `$Campaign.expiresAt` or `$Campaign.killSwitch`; `03/05` docs require expiry validation and Phase 9 requires kill-switch authority. Impact: an expired or killed campaign can still return `AUTO_EXECUTE_WITHIN_CAMPAIGN`. Confidence: High. Effort: S. Priority: P1. Quick win: **yes**.
Recommended change: add expiry check (fail closed past `expiresAt`) and kill-switch check (`killSwitch==true` → `DENY`/quarantine) as the first guards. Tests: expiry-block, kill-switch-block.

**FBL-REL-001 — Non-atomic queue claim allows duplicate-dispatch race**
Class: VERIFIED DEFECT · File: `tools/AdosSupervisorState.psm1` `New-AdosQueueClaim`.
Evidence: reads whole array, checks duplicate, `Set-Content` whole array — no lock/mutex/CAS; two concurrent claimants can both pass the active-claim check. Contradicts "atomic claim" invariant (05-GOVERNANCE) and Phase 3 exit. Impact: duplicate real launches under concurrency. Confidence: High. Effort: M. Priority: P1.
Recommended change: route the claim through the lease-gated `_control_plane_writer` (append-jsonl with duplicate rejection) or a named-mutex + CAS-hash swap; make the queue append-only JSONL, not an overwritten array. Tests: two-claimant concurrency + idempotency.

**FBL-REL-002 — Crash recovery specified but not implemented**
Class: VERIFIED GAP · Files: FSM module has no replay/finalize/quarantine; `05-GOVERNANCE §crash recovery` and Phase 10 require it. Impact: after crash/reboot, no code reconciles in-flight runs; risk of duplicate relaunch or orphaned claims. Confidence: High (absence). Effort: L. Priority: P1.
Recommended change: implement startup reconciliation (verify lease+kill switch, replay transitions, inspect in-flight processes/adapter evidence, finalize completed, quarantine ambiguous, never relaunch if a real launch may have occurred). Tests: kill-mid-dispatch restart.

**FBL-GOV-002 — Validation-waiver vs campaign `requiredValidations` conflict**
Class: DOCUMENTATION CONFLICT · Files: `docs/VALIDATION-WAIVED-PACKAGE-WIDE-20260718.md` vs `campaigns/ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION.json` (`requiredValidations` = 8 items). Impact: automated agent enforces validations; human following the waiver does not — divergent behavior on the same campaign. Confidence: High. Effort: S. Priority: P1. Quick win: **yes**.
Recommended change: make the machine-readable campaign the single source of truth — if validations are waived, set `requiredValidations: []` in the JSON (as MC-PILOT-001 already does) and reference the waiver in the campaign; otherwise revoke the waiver. Owner decision required.

**FBL-GOV-001 — Two APPROVED campaigns with overlapping scope**
Class: RISK/CONFLICT · Files: `ADOS-CURSOR-FIRST-SUPERVISOR-V1-FULL-IMPLEMENTATION.json` (budgets 12/8/8, writeRoots incl. update-package) and `MC-PILOT-001.json` (budgets 3/2/2, MC worktree). Both `status: APPROVED`. Impact: ambiguous which governs a given launch; budget/scope confusion. Confidence: High. Effort: S. Priority: P1. Quick win: **yes**.
Recommended change: declare precedence explicitly (e.g., MC-PILOT-001 supersedes for the pilot; FULL is future scope, set to `PENDING`).

### P2 — important reliability / security / UX / maintainability

**FBL-DOC-001 — Stale source-root defaults in MC config and README** — VERIFIED DEFECT · `lib/config.ts` defaults `sourceRoot` to `D:\agent-development-os-orchestrator-source` (does not exist) and `cursorWorktree` to `…-source-cursor`; `README.md` repeats them. Effort XS. P2. Quick win: **yes**. Fix: default to real paths or drop unused defaults; correct README.

**FBL-SEC-001 — Policy engine trusts caller-supplied correctness booleans** — RISK · `AdosPolicy.psm1` accepts `BudgetRemaining/EvidenceSufficient/IdentityMatch/…` with permissive defaults; no independent computation. Effort M. P2. Fix: compute inside or in a wrapper.

**FBL-SEC-002 — `filePatterns` not enforced** — VERIFIED GAP · patterns returned but only write-root prefix checked at policy time. Effort M. P2.

**FBL-ARCH-003 — Source vs runtime tool drift, no declared authority** — RISK · divergent `tools/` copies. Effort M. P2. Fix: declare source canonical + deploy runtime from it, or document the split.

**FBL-PERF-001 — O(n) JSONL append with full-file duplicate scan** — OPTIMIZATION · ledger 261.9 KB and growing. Effort M. P2. Fix: bounded duplicate window / index / rotation.

**FBL-DOC-002 — `00-README` names missing relocation target path** — CONFLICT · references absent `D:\Topics\orchestrators\…`. Effort XS. P2. Quick win: **yes**.

**FBL-DOC-003 — Withdrawn "HANDOFF_READY" signal reused as actionable** — CONFLICT · `BACKLOG.md` vs `COMPLETION-REPORT`. Effort XS. P2. Quick win: **yes**.

**FBL-CON-003 — Cursor adapter default `$CanonicalRepository` mismatches pilot worktree** — RISK · adapter default `D:\agent-development-os`; MC-PILOT worktree git-common-dir is `D:\agent-development-os-mission-control\.git`. Dispatch fails closed (safe) unless `-CanonicalRepository` is passed. Effort S. P2. Fix: derive canonical repo from the campaign's `canonicalWorktrees`.

**FBL-PERF-002 — SSE rebuilds full snapshot per client per interval** — OPTIMIZATION · `events/stream/route.ts` + `getMissionSnapshot()` each tick, no shared cache. Effort M. P2. Fix: shared snapshot cache fanned out to subscribers.

**FBL-OPS-001 — No supervisor metrics/health/readiness/alerting** — GAP · observability spine lacks counters and a supervisor health endpoint. Effort M. P2.

**FBL-UX-001 — SSE reconnect / Last-Event-ID resume missing** — GAP · server heartbeats only; no resumable stream. Effort S–M. P2.

### P3 — useful enhancements
- **FBL-SEC-003** Regex redaction is defense-in-depth only; add structured field allowlisting. XS–S.
- **FBL-SEC-004** JS `constantTimeEqual` not guaranteed constant-time; use `crypto.timingSafeEqual`. XS. Quick win.
- **FBL-OPS-002** No dead-letter queue for repeatedly-failing tasks. S–M.
- **FBL-OPS-003** No support-bundle exporter. S.
- **FBL-UX-002** No automated accessibility (axe) gate. S.
- **FBL-DX-001** No single "which tree is canonical" map for contributors. XS. Quick win.
- **FBL-TEST-001** Add schema-conformance + concurrency + crash-recovery + expiry/kill tests. M.

### P4 — optional / speculative
- **FBL-SEC-005** Cryptographically signed owner approvals (key pinning, canonicalization, nonce, expiry, count). L. Roadmap-named.
- **FBL-FEAT-*** see §15.

---

## 15. Missing-feature catalog (PASS 13)

| Feature | Justification | Class |
|---|---|---|
| Signed owner-approval interface (keys, nonce, canonicalization) | Approval authenticity | Required for safe autonomy |
| Supervisor orchestration loop as a service | Roadmap | Required |
| Crash-recovery / resumable checkpoints | Safe autonomy | Required |
| Kill-switch enforcement in policy engine | Safe autonomy | Required |
| Dead-letter queue + incident timeline | Ops | Operational |
| Evidence diff viewer + event replay UI | Differentiator | Useful |
| Budget/capacity forecasting panel | Ops | Useful |
| Provider health & cost routing | Ops (fallback runtimes exist) | Useful |
| Config-drift detector (source vs runtime tools) | Reliability | Useful |
| Prompt/version + model-output provenance registry | Auditability | Useful |
| Owner-gate signing workflow (write path, separately authorized) | Roadmap Phase 2 | Future scope |
| Accessibility preferences + axe gate | Compliance | Optional |
| Multi-host orchestration | Scale | Defer |

---

## 16. Quick wins (Top 10)

1. FBL-POL-001 — add expiry + kill-switch guards to policy engine (S).
2. FBL-GOV-002 — set `requiredValidations: []` in the FULL campaign or revoke the waiver (S).
3. FBL-GOV-001 — declare campaign precedence; set FULL to `PENDING` (S).
4. FBL-DOC-001 — fix stale `sourceRoot`/`cursorWorktree` defaults + README (XS).
5. FBL-DOC-002 — remove/annotate missing `Topics` relocation path in `00-README` (XS).
6. FBL-DOC-003 — mark withdrawn `HANDOFF_READY` in `BACKLOG.md` (XS).
7. FBL-SEC-004 — swap MC auth compare to `crypto.timingSafeEqual` (XS).
8. FBL-CON-003 — derive canonical repo from campaign, not hardcoded default (S).
9. FBL-DX-001 — one canonical-tree map doc (XS).
10. FBL-TEST-001 (partial) — add the policy-decision schema-conformance test (S).

---

## 17. P0 / P1 remediation plan

No P0. P1 sequence (each with test + rollback):
1. **FBL-POL-001** (expiry/kill) — smallest; unblocks trust in the gate.
2. **FBL-CON-001 / FBL-CON-002** — reconcile schema↔engine↔FSM; add conformance tests.
3. **FBL-REL-001** — atomic queue claim via lease-gated writer.
4. **FBL-GOV-001 / FBL-GOV-002** — owner decisions on campaign precedence + waiver.
5. **FBL-REL-002** — crash-recovery reconciliation.
6. **FBL-ARCH-001** — compose the supervisor loop (depends on 1–5).

---

## 18. 30 / 60 / 90-day roadmap

- **0–30d:** all quick wins (§16); expiry/kill enforcement; schema↔engine reconciliation + conformance tests; owner decisions on campaigns/waiver.
- **30–60d:** atomic queue claim; crash-recovery reconciliation; policy engine computes its own budget/identity/evidence; supervisor metrics/health endpoint; SSE reconnect.
- **60–90d:** compose end-to-end supervisor loop behind Shadow→Live flag; run MC-PILOT-001 end-to-end to `OWNER_ACTION_REQUIRED: Authorize local commit`; ledger append perf + rotation; dead-letter queue.

---

## 19. Longer-term recommendations

Signed owner-approval subsystem; evidence-diff + replay UI; provider health/cost routing; config-drift detector; capacity/budget forecasting; support-bundle export; accessibility gate; only then consider multi-host orchestration.

---

## 20. Dependency and sequencing graph

```
Quick wins (indep.) ─┐
FBL-POL-001 ─────────┼─▶ FBL-CON-001/002 ─▶ FBL-REL-001 ─▶ FBL-REL-002 ─▶ FBL-ARCH-001 (loop)
FBL-GOV-001/002 (owner) ─┘                                   ▲
FBL-SEC-001/002 ───────────────────────────────────────────┘
FBL-TEST-001 supports every code change above.
MC items (FBL-PERF-002, FBL-UX-001) are independent of the supervisor track.
```

---

## 21. Owner decisions required

1. **Which campaign governs** — FULL-IMPLEMENTATION vs MC-PILOT-001 (precedence + statuses). (FBL-GOV-001)
2. **Validation posture** — reflect the waiver in machine-readable `requiredValidations`, or revoke it. (FBL-GOV-002)
3. **Canonical tree declaration** — which supervisor `tools/` copy (source vs runtime) and which MC tree are authoritative. (FBL-ARCH-003, FBL-DOC-001)
4. **Approval authenticity roadmap** — commit to signed approvals or accept filesystem-integrity trust for now. (FBL-SEC-005)
5. **Lease recovery governance** — the runtime lease was stale at audit; confirm the governed reacquisition path (not silent edits). (observational)

---

## 22. Risks of taking no action

Autonomy cannot be safely enabled: an expired/killed campaign could still authorize execution; concurrent claims could double-launch; schema-invalid decisions break the evidence pipeline; contributors edit divergent tool copies; and a human vs agent will disagree on whether validations apply. The fail-closed posture currently *masks* these by refusing to run — the platform stays safe by staying idle, not by being correct.

---

## 23. Recommended next implementation unit

**FBL-POL-001 + FBL-CON-001** as one small, high-leverage unit: add campaign-expiry and kill-switch guards to `Get-AdosPolicyDecision`, align its output object to `policy-decision.schema.json` (or map at the boundary), and land a schema-conformance + expiry/kill test set. Smallest change that makes the policy gate trustworthy and its records valid — the precondition for everything downstream. Stop at `OWNER_ACTION_REQUIRED` for the campaign/waiver decisions.

---

## 24. Audit limitations and unreviewed surfaces

- Read-only: no tests executed, no UI rendered, no benchmarks; MC test/CI results taken from committed `VALIDATION.md`/CI config, not re-run.
- Existence/validity of approval `approval-4161dde85611494b986bbd5e4c5ba019` in the 173.5 KB runtime `approvals.jsonl` was **not independently confirmed** within budget (PowerShell probe timed out; file too large to fully ingest read-only). The campaign references it and the prompt asserts it; treat as context, not audited fact.
- Windows PowerShell MCP intermittently timed out; several checks used `.git` metadata and mounted-filesystem reads instead.
- `agent-development-os-orchestrator/state/approvals.jsonl` content, the third MC tree's `src/` internals, and `handoffs/**` runtime queues were sampled, not exhaustively read.
- Lease/runtime state is a point-in-time observation and may have changed.

Two consecutive review passes produced no new P0/P1 beyond those listed; the adversarial pass reclassified source/runtime tool drift from "defect" to RISK and confirmed the schema/FSM/policy divergences as real (not fixture artifacts).

---

## 25. Final quality scorecard (0–5, evidence-cited)

| Area | Score | Basis |
|---|---|---|
| Functional completeness | 2.5 | Components built; loop not composed (FBL-ARCH-001) |
| Architecture | 3.5 | Strong boundaries; missing composition + dual FSM |
| Security (defensive) | 4.0 | argv dispatch, lease gate, single-use approvals, redaction |
| Authorization integrity | 3.0 | Strong at adapter/writer; policy engine gaps (expiry/kill/filePatterns/trusted booleans) |
| Reliability | 3.0 | Atomic writes + fail-closed; non-atomic queue claim |
| Recovery | 2.0 | Lease recovery good; crash-recovery unimplemented |
| Test quality | 3.0 | Good MC coverage; missing conformance/concurrency/recovery/expiry tests |
| Observability | 3.0 | Uniform event spine; no metrics/health/alerts for supervisor |
| Performance | 3.0 | Bounded MC reads; O(n) ledger append, per-client snapshot |
| Maintainability | 3.0 | Clean modules; source/runtime drift, stale configs |
| Documentation | 3.0 | Rich but with authority conflicts + stale paths |
| Developer experience | 2.5 | No canonical-tree map; multiple similarly-named trees |
| UX | 3.5 | Honest states/labels; reconnect + signing surfaces missing |
| Accessibility | 2.5 | By-construction only; no automated audit |
| Autonomous-operation readiness | 2.0 | Safe only because idle; loop + recovery + policy gaps |

---

## Filtered lists

**Top 10 highest-risk findings:** FBL-ARCH-001, FBL-REL-001, FBL-POL-001, FBL-CON-001, FBL-CON-002, FBL-REL-002, FBL-GOV-002, FBL-GOV-001, FBL-SEC-001, FBL-CON-003.

**Top 10 highest-ROI improvements:** FBL-POL-001, FBL-GOV-002, FBL-CON-001, FBL-REL-001, FBL-DOC-001, FBL-CON-003, FBL-TEST-001, FBL-SEC-004, FBL-GOV-001, FBL-PERF-001.

**Top 10 quick wins:** see §16.

**Top 10 missing features:** supervisor loop-as-service; crash/resumable checkpoints; kill-switch enforcement in policy; signed approvals; dead-letter queue; evidence-diff/replay UI; config-drift detector; budget forecasting; provider health/cost routing; owner-gate signing workflow.

**Top 10 reliability improvements:** atomic queue claim; crash recovery; ledger rotation; per-file allowlist enforcement; SSE shared cache; dead-letter queue; drift detector; queue as append-only JSONL; supervisor health/readiness; duplicate-scan bounding.

**Top 10 security improvements:** expiry+kill guards; policy computes own budget/identity/evidence; enforce filePatterns; signed approvals; `crypto.timingSafeEqual`; structured redaction allowlist; canonical-repo from campaign; single-active-lease alerting; secret-scan CI on all trees; approval-scope regex hardening.

**Top 10 UX improvements:** SSE reconnect; owner-gate signing surface; incident timeline; evidence-diff viewer; budget panel; a11y audit; keyboard-nav verification; replay UI; stale-state clarity; empty-state copy review.

**Top 10 developer-experience improvements:** canonical-tree map; resolve source/runtime drift; align schema↔engine↔FSM; fix stale config defaults; conformance tests as guardrails; contributor setup for PS + Node; document the two-plane model; example end-to-end campaign; troubleshooting for fail-closed states; single backlog source of truth.

**Features to defer or reject:** multi-host orchestration (defer); any Mission Control mutation path (reject until separately authorized — correctly out of V2 scope); speculative provider auto-scaling (defer).

**Already implemented — do not duplicate:** read-only MC enforcement (405 + no mutation routes); redaction pipeline; fail-closed Basic auth; lease gate + write-lock + transaction journal; single-use approval consumption; argv-based (injection-safe) dispatch; per-record JSONL isolation + stale-cache recovery; CI (Node 22 lint/typecheck/unit/readonly/schema/build/e2e + docker).

---

**FABLE_PROJECT_AUDIT_COMPLETE**

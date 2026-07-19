# G0–G7 clearance status (workspace backlog)

**Updated:** 2026-07-18  
**Backlog task:** `ados-mission-control-v2-blocked-001`

## Verdict for the backlog gate

| Item | Status | Evidence |
|---|---|---|
| CANONICAL_PATHS_RECONCILED | Recorded | `docs/evidence/g0-g7-mc-pilot-001-20260718T150618Z/STATUS.json` (`exit: G0_G7_CLEARED`) |
| Campaign APPROVED + budgets | Recorded | `campaigns/MC-PILOT-001.json` + `OWNER-AUTH-MC-PILOT-001-20260718.json` |
| Write allowlist + pre-change hashes | Rebaselined | `campaigns/MC-PILOT-001-write-allowlist.json` |
| cursor-windows eligible | Recorded | G5 in STATUS.json (`AVAILABLE_SMOKE_VALIDATED`) |
| Git/source home declared | Recorded | G1/G7 in STATUS.json → live orchestrators MC worktree |
| Adapter dry-run tooling | Fixed | `_run-g0-g7-mc-pilot.ps1` now calls `Invoke-DelegatedAgent.ps1` with `TaskJson`/`TaskMarkdown`/…; contract `campaigns/MC-PILOT-001-G6-DRYRUN-CONTRACT.json` |
| Owner waiver | Active | `docs/VALIDATION-WAIVED-PACKAGE-WIDE-20260718.md` — G0–G7 **non-blocking** for implementation under this package |

## Still not authorized by this clearance

- Flipping package `executionAuthorization` for full Cursor-First Supervisor product scope
- Control-plane supervisor writes into `D:\agent-development-os-orchestrator` beyond existing pilot norms
- `commit` / `push` / `merge` / `deploy` (remain owner-gated / DENY per campaign)

## Live lease renewal (2026-07-19) — COMPLETE

Owner chat approval ("Approved, continue") → APPROVED disposition `approval-6372915cf7454516966e95695acddaf1` → execute `reacq-20260719a`.

| Field | Value |
|---|---|
| New lease | `b2001bb2-675b-4c7f-9c86-5958278ca71f` |
| Holder | PID alive; heartbeat advancing |
| Follow-on | State-preserving runtime deploy (27 files) including U1 schemas + repaired v3 reacquire tool |

Evidence: `docs/evidence/lease-reacq-request-20260719/COMPLETION.md`.

## Path authority (FBL-DOC-002 / FBL-DX-001)

- Canonical Mission Control V2: `D:\ados-mission-control` — see `../../docs/PATH-REGISTRY.md`.
- Stale relocation target `D:\Topics\orchestrators\…` is **not present** and must not be used in new approvals or scripts.
- Package `00-README.md` (local package tree) names the live-integration worktree and V2 paths instead of Topics.

## Operator note

Re-run the Windows-native pilot script only as diagnostics:

```powershell
pwsh -NoProfile -File .\docs\evidence\_run-g0-g7-mc-pilot.ps1
```

G0 fails under WSL by design (native Windows required).

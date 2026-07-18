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

## Operator note

Re-run the Windows-native pilot script only as diagnostics:

```powershell
pwsh -NoProfile -File .\docs\evidence\_run-g0-g7-mc-pilot.ps1
```

G0 fails under WSL by design (native Windows required).

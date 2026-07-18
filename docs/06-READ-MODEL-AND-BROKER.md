# Read Model and Broker

**Release:** 2.0 read-only resilience  
**Principle:** Raw ADOS state → Read-model service → normalized views → Mission Control UI

V2 keeps live normalization in memory and persists a redacted latest-snapshot cache plus per-source ingest watermarks in app-owned SQLite. It never writes to the external ADOS root.

## 1. Pipeline

```text
File watchers / pollers
        ↓
Schema / JSON parse
        ↓
Normalize + redact
        ↓
SQLite tables / views
        ↓
REST + SSE
```

### Ingest sources

| Watcher | Path |
|---------|------|
| Lease | `{ADOS}/state/orchestrator-lease.json` |
| Failover | `{ADOS}/state/orchestrator-failover-state.json` |
| Sessions | `{ADOS}/state/agent-sessions.json` |
| Ledger | `{ADOS}/state/event-ledger.jsonl` (tail) |
| Approvals stream | `{ADOS}/state/approvals.jsonl` |
| Approval files | `{ADOS}/handoffs/owner/approvals/**` |
| Handoffs | `{ADOS}/handoffs/**` |
| Worktree registry | `{ADOS}/state/worktree-registry.json` |
| Project state | `{ADOS}/state/project-state.json` |
| Cursor overlay | `{CURSOR_WT}/.agent-control/AGENT_LEASES.json`, `TASK_GRAPH.json` |
| Git OBSERVED | `git -C` status/worktree on known repos |
| Process OBSERVED | Windows process for lease `processId` |

Poll interval default: 2s for lease/failover; 1s ledger tail; 10s git/process.

## 2. SQLite tables (implemented V2 subset)

- `schema_meta(version)`
- `ingest_watermark(source, cursor_value, record_count, warning_count, observed_at)`
- `snapshot_cache(singleton, payload_json, persisted_at)`

The richer normalized tables and replay views remain future work. Transactions atomically replace the snapshot and upsert its watermarks.

## 3. Clock skew and heartbeat freshness

Align with ADOS/Cursor clock policy:

1. Never declare authoritative lease **expired** solely because WSL wall clock disagrees with lease timestamps.
2. Prefer: process liveness (PID match + start time when available) → ledger monotonic sequence → lease `expiresAt` on application clock → then informational skew (±30 minutes NOTICE).
3. Uncertain freshness ⇒ treat PRIMARY as active; surface `NOTICE` on SystemHealth.
4. Record `checkedAt` and `clockSource` (`wsl_date`, `windows_local`, `ados_file`, `filesystem_mtime`) on OBSERVED checks.

## 4. Conflict detectors

| Code | Severity | Rule |
|------|----------|------|
| `DUAL_PRIMARY` | CRITICAL | >1 authoritative PRIMARY claim |
| `PATH_OVERLAP` | BLOCKED | Two active writers exact path overlap |
| `DISPATCH_UNEXPECTED` | CRITICAL | `productionDispatch=ENABLED` without matching owner approval context |
| `LEASE_FILE_MISSING` | CRITICAL | Lease path unreadable |
| `PROCESS_DEAD` | ATTENTION/BLOCKED | Lease PID not alive (do not auto-supersede) |
| `HASH_MISMATCH` | ATTENTION | Evidence/index hash ≠ on-disk |
| `UNSIGNED_CANDIDATE` | NOTICE | Candidate commit unsigned when policy requires |
| `IGNORED_RESIDUE` | NOTICE | Known ignored control-plane evidence without index |
| `WORKER_WITHOUT_APPROVAL` | BLOCKED | Dispatch-like activity while frozen/disabled |
| `CURSOR_CLAIMS_LEASE` | CRITICAL | Overlay asserts acquire/PRIMARY (governance fail) |

## 5. Redaction

Strip or mask: `sk-`, `Bearer `, PEM blocks, connection strings, `.ssh` private material. Prefer dropping fields over partial reveal.

## 6. Failure behavior

- Partial ingest: keep last good rows; mark module `degraded`.
- Catastrophic ADOS root loss: serve the last cache only as `STALE`, `BLOCKED`, and `recoveredFromCache: true`; otherwise return an empty `UNAVAILABLE` snapshot.
- Never invent lease fields.

## 7. Parity with existing tools

Broker output should be reconcilable with:

- `tools/Show-OrchestratorDashboard.ps1`
- `tools/Show-OrchestratorStatus.ps1`

Document field-level parity in implementation notes during the Cursor build mission.

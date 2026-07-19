# Owner authorization — Mission Control Phase 3 controlled operations

**Status:** AUTHORIZED  
**Authorized at:** 2026-07-19 (owner chat directive: “Next phase”)  
**Scope:** `ados-mission-control-v2-roadmap-phase3-001`  
**Prerequisite:** Phase 2 owner commands may be enabled independently; Phase 3 does not imply unsigned approvals.

## Allowed

1. Enable `MISSION_CONTROL_PHASE3_COMMANDS=enabled` for loopback/staging Mission Control.
2. Expose POST routes that invoke allowlisted `scripts/ados-tools/*` adapters for:
   - approved-only worker dispatch **prepare/queue** (never without `APPROVED` disposition);
   - campaign pause/resume when backed by an `APPROVED` approval for that control action.
3. Append consumption + ledger events for every accepted operation.
4. Keep Cursor unable to acquire or inherit the orchestrator PRIMARY lease through Mission Control.

## Prohibited

- Dispatch with missing, PENDING, DENIED, REVOKED, expired, or over-consumed approvals.
- Direct `Invoke-CursorAgent.ps1` / `Launch-Cursor.ps1` references from `app/`, `components/`, or `lib/`.
- Silent production dispatch enablement (`dispatchEnabled` flip without approval).
- Lease transfer, Cursor PRIMARY promotion, push/merge/deploy from Mission Control.
- Phase 4 fleet/Prometheus (still deferred).

## Threat model (summary)

| Threat | Control |
|--------|---------|
| Unapproved dispatch | Tool reads `approvals.jsonl` disposition; fail-closed |
| Replay of single-use approval | Consumption ledger check before accept |
| Agent self-dispatch | `actor` must be `owner` |
| Lease takeover via MC | Tool refuses lease/PRIMARY mutations |
| Command injection | Argv-only allowlisted spawn |

## Rollback

Set `MISSION_CONTROL_PHASE3_COMMANDS=disabled` (default). Middleware returns `405 READ_ONLY_V2` for Phase 3 routes.

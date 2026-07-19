# Owner authorization — Mission Control Phase 6 controlled-ops completeness

**Status:** AUTHORIZED  
**Authorized at:** 2026-07-19 (owner chat directive: proceed / continue with next phase)  
**Scope:** `ados-mission-control-v2-roadmap-phase6-001` … `phase6-005`  
**Prerequisite:** V3 roadmap authorization (`docs/authorizations/v3-roadmap-20260719.md`). Independent of Phase 2/3/4 flags.

## Allowed

1. Enable `MISSION_CONTROL_PHASE6_COMMANDS=enabled` for loopback/staging Mission Control.
2. Expose POST routes that invoke allowlisted `scripts/ados-tools/*` adapters for:
   - approved validator run **prepare** (`run-approved-validator.mjs`);
   - approved integration request **file** (`create-integration-request.mjs`);
   - bounded review pickup **prepare** (`trigger-review-pickup.mjs`).
3. Append consumption + ledger events for every accepted operation.
4. Keep Cursor unable to acquire or inherit the orchestrator PRIMARY lease through Mission Control.
5. Never silently enable production dispatch.

## Prohibited

- Operations with missing, PENDING, DENIED, REVOKED, expired, or over-consumed approvals.
- Action-scope mismatch (e.g. DEPLOY approval used for VALIDATE).
- Direct `state/**` writes from Next.js `app/` / `components/` / `lib/` (tools only).
- Lease transfer, Cursor PRIMARY promotion, push/merge/deploy from Mission Control.
- Silent `dispatchEnabled` flip without owner approval.

## Threat model (summary)

| Threat | Control |
|--------|---------|
| Unapproved validate/integration/pickup | Shared approval-gate reads disposition; fail-closed |
| Wrong-scoped approval | Action matchers per tool |
| Replay of single-use approval | Consumption ledger check before accept |
| Agent self-dispatch | `actor` must be `owner` |
| Lease takeover via MC | Tool refuses lease/PRIMARY mutations |
| Command injection | Argv-only allowlisted spawn |

## Rollback

Set `MISSION_CONTROL_PHASE6_COMMANDS=disabled` (default). Middleware returns `405 READ_ONLY_V2` for Phase 6 routes.

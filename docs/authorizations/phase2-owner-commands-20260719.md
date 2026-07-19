# Owner authorization — Mission Control Phase 2 commands

**Status:** AUTHORIZED  
**Authorized at:** 2026-07-19 (owner chat directive: “Authorized”)  
**Scope:** `ados-mission-control-v2-roadmap-phase2-001` and `ados-mission-control-v2-roadmap-phase2-002`  
**Not authorized:** Phase 3 dispatch / worker launch (`roadmap-phase3-001`)

## Allowed

1. Enable `MISSION_CONTROL_PHASE2_COMMANDS=enabled` for loopback/staging Mission Control.
2. Expose POST command routes that invoke allowlisted ADOS tools / `scripts/ados-tools/*` adapters.
3. Append approval dispositions to `state/approvals.jsonl` and owner-gate decisions under `handoffs/owner/**` via those tools only.
4. Require Ed25519 owner signatures for owner-gate decisions (fail-closed without pinned public key).
5. Keep Basic-auth (when configured) in front of mutation routes.

## Prohibited

- Next.js writing `state/**` or `handoffs/**` directly from `app/`, `components/`, or `lib/` (except the existing SQLite cache adapter).
- Cursor/Claude/agent actors closing owner gates.
- Enabling Phase 3 dispatch, lease transfer, or runtime promotion from Mission Control.
- Holding owner private keys inside the Mission Control repository or container image.

## Threat model (summary)

| Threat | Control |
|--------|---------|
| Spoofed approve click | Basic auth + pinned Ed25519 for gate decides; approval dispositions require phase2 flag |
| Agent self-approve | Tool rejects non-`owner` actors; UI never labels agents as approvers |
| Path escape | Tools resolve under configured control-plane root only |
| Command injection | Argv-only spawn of allowlisted script names |
| Secret leakage | Redaction pipeline unchanged; signatures never logged in full |

## Rollback

Set `MISSION_CONTROL_PHASE2_COMMANDS=disabled` (default). Middleware returns `405 READ_ONLY_V2` for all mutation methods again.

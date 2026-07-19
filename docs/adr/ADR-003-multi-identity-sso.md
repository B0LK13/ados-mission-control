# ADR-003 — Multi-identity / SSO path (roles beyond single Basic user)

**Status:** Accepted (design only — 2026-07-19)  
**Context:** Backlog `ados-mission-control-v2-security-005`  
**Related:** `SECURITY.md`, `docs/10-V2-READ-MODEL-AUTH.md`, Phase 2 owner-gate Ed25519

## Decision

Mission Control staging today uses a single Basic identity (`MISSION_CONTROL_AUTH_MODE=basic`). Broader exposure requires a separately approved identity design. This ADR records the target multi-identity model **without implementing SSO in this change**.

### Roles

| Role | Intended capabilities | Notes |
|------|----------------------|-------|
| `readonly` | GET/SSE only | Default for observers; mutations always 405 |
| `operator` | Read + Phase 3/6 **prepare/file** when flags + APPROVED disposition allow | Cannot close owner gates or set approval dispositions |
| `owner` | Operator + Phase 2 approve/reject/withdraw/follow-up + owner-gate decide | Owner-gate decide still requires out-of-band Ed25519 over the challenge |

Roles are authorization labels inside Mission Control. They do **not** confer ADOS PRIMARY lease, dispatch enablement, or Cursor authority.

### SSO options (evaluated)

1. **OIDC / OAuth2 (preferred for non-loopback)** — reverse proxy or NextAuth-style callback; map IdP groups → roles above. Require HTTPS.
2. **mTLS client certs** — acceptable for private-network staging; map SAN/CN → role.
3. **Keep Basic** — loopback-only staging; migrate by dual-running Basic + OIDC until cutover.

### Explicit non-goals

- **Cursor (or any agent) becoming PRIMARY via IdP group membership.** Identity providers must never grant orchestrator lease, PRIMARY role, or silent dispatch.
- Storing owner private keys or long-lived refresh tokens in the Mission Control image/git tree.
- Replacing ADOS ledger dispositions with IdP claims (IdP authenticates humans; ADOS tools remain the write path).

### Threat model (summary)

| Threat | Control |
|--------|---------|
| IdP grants agent-as-owner | Role mapping deny-lists agent subjects; owner role requires human IdP claims + Phase 2 flag |
| Token replay / CSRF | HTTPS + short-lived tokens; retain loopback Host policy for mutations until cookie SameSite/CSRF tokens ship |
| Privilege escalation via group rename | Pin group→role mapping in env/config; fail closed on unknown groups |
| Cursor PRIMARY via SSO | Non-goal; lease files remain sole PRIMARY authority |

### Migration notes from Basic

1. Keep `MISSION_CONTROL_AUTH_MODE=basic` as the fail-closed loopback default.
2. Introduce `MISSION_CONTROL_AUTH_MODE=oidc` (future) behind owner authorization; require issuer, client id, and role-claim mapping env vars.
3. Dual-accept Basic and OIDC only during a timed cutover window; never weaken mutation allowlists during migration.
4. Owner-gate Ed25519 remains independent of SSO — SSO proves browser session; signature proves owner decision.

## Consequences

- No SSO implementation in the current release; this ADR unblocks a future auth package.
- Single Basic user limitation remains documented in `SECURITY.md` until an OIDC/mTLS package is authorized.
- Any implementation PR must update `SECURITY.md`, middleware, and negative tests before enabling non-loopback auth.

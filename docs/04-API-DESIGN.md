# API Design — ADOS Mission Control V2 / V3

**Base path:** `/api/v1`  
**Default mode:** Read-only observation  
**Auth (staging):** optional Basic (`MISSION_CONTROL_AUTH_MODE=basic`); health + metrics remain exempt  
**Mutation policy:** fail-closed unless an explicit phase flag is enabled; mutation POSTs also require loopback `Host` unless `MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS=enabled`

## 1. Conventions

- JSON responses; `Content-Type: application/json`
- Timestamps: ISO-8601 UTC
- Errors: `{ "error": { "code": string, "message": string, "details"?: object } }`
- Pagination: `?cursor=&limit=` on list endpoints (default limit 50, max 200; larger limits are clamped). Cursor is opaque base64url of `{ "o": <offset> }` into the snapshot list order (see `lib/api/pagination.ts`).
- Caching: `Cache-Control: no-store`; list responses emit a weak `ETag` and return `304` when `If-None-Match` matches
- Redaction: never return tokens, keys, connection strings (all JSON via `missionJson` / `missionCommandJson`)
- Authority header: `X-ADOS-Authority` is `read-only` for GET; phase command successes use `phase2-commands` / `phase3-commands` / `phase6-commands`

## 2. Read endpoints (always available)

### Snapshot & health

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/snapshot` | Full `MissionSnapshot` |
| GET | `/api/v1/health` | Broker + severity (also `/api/health`) |
| GET | `/api/v1/leases/primary` | Authoritative primary lease + observed liveness |
| GET | `/api/v1/workflow` | Protocol graph |
| GET | `/api/v1/timeline` | Evidence/audit chronology |
| GET | `/api/v1/routing-incidents` | Containment register |
| GET | `/api/v1/dead-letter` | Derived failure backlog |
| GET | `/api/v1/safety/alerts` | Active safety signals |
| GET | `/api/v1/events` | Ledger/event stream slice |
| GET | `/api/v1/events/stream` | SSE; resume is **full snapshot** (ADR-002 defers deltas) |
| GET | `/api/v1/replay` | Run chronology (query: campaignId, runId) |
| GET | `/api/v1/evidence-diff` | Compare two runs |
| GET | `/api/v1/support-bundle` | Diagnostic bundle metadata |

### Collections + detail

| Collection | Detail |
|------------|--------|
| `GET /api/v1/agents` | `GET /api/v1/agents/{agentId}` |
| `GET /api/v1/approvals` | `GET /api/v1/approvals/{approvalId}` |
| `GET /api/v1/tasks` | `GET /api/v1/tasks/{taskId}` |
| `GET /api/v1/projects` | `GET /api/v1/projects/{projectId}` |
| `GET /api/v1/handoffs` | `GET /api/v1/handoffs/{handoffId}` |
| `GET /api/v1/worktrees` | `GET /api/v1/worktrees/{repoId}` |
| `GET /api/v1/evidence` | `GET /api/v1/evidence/{evidenceId}` |
| `GET /api/v1/campaigns` | — |
| `GET /api/v1/owner-gates` | — |

Missing entities return `404` with `error.code` `NOT_FOUND` (or `UNAVAILABLE` when present but marked unavailable). Detail payloads are redacted. Mission Control never fabricates entities.

### Read-only evidence verify

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/evidence/verify?evidenceId=` | Recompute SHA-256; no mutation |

## 3. Opt-in mutation endpoints (fail-closed)

When the corresponding flag is **disabled**, middleware returns `405` with `READ_ONLY_V2` before route handlers run.

When enabled, mutation POSTs still require loopback `Host` (see §6) unless remote mutations are explicitly allowed.

### Phase 2 — owner commands (`MISSION_CONTROL_PHASE2_COMMANDS=enabled`)

Authorization packages: [`docs/authorizations/phase2-owner-commands-20260719.md`](authorizations/phase2-owner-commands-20260719.md)

| Method | Path | Tool path |
|--------|------|-----------|
| POST | `/api/v1/approvals/{id}/approve` | Allowlisted ADOS disposition tool |
| POST | `/api/v1/approvals/{id}/reject` | Allowlisted ADOS disposition tool |
| POST | `/api/v1/approvals/{id}/withdraw` | Allowlisted ADOS disposition tool |
| POST | `/api/v1/approvals/{id}/request-evidence` | Allowlisted ADOS follow-up tool (non-terminal) |
| POST | `/api/v1/approvals/{id}/request-corrections` | Allowlisted ADOS follow-up tool (non-terminal) |
| POST | `/api/v1/owner-gates/{gateId}/challenge` | Issue challenge for external Ed25519 sign |
| POST | `/api/v1/owner-gates/{gateId}/decide` | Verify signature → ADOS decide tool |

Owner-gate decide requires `MISSION_CONTROL_OWNER_PUBKEY_PATH`. Private keys never enter MC.

### Phase 3 — controlled operations (`MISSION_CONTROL_PHASE3_COMMANDS=enabled`)

Authorization: [`docs/authorizations/phase3-controlled-operations-20260719.md`](authorizations/phase3-controlled-operations-20260719.md)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/operations/dispatch` | Approved-only prepare/queue |
| POST | `/api/v1/operations/campaign-control` | Approved-only campaign control |

Cursor cannot acquire PRIMARY lease through these routes.

### Phase 4 — fleet observation (`MISSION_CONTROL_FLEET_MODE=enabled`)

Design: [`docs/adr/ADR-001-fleet-and-prometheus.md`](adr/ADR-001-fleet-and-prometheus.md)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/fleet` | Non-authoritative member probes |
| GET | `/api/v1/metrics` | Prometheus text; auth-exempt; no secrets/paths |

### Phase 6 — validate / integration / review (`MISSION_CONTROL_PHASE6_COMMANDS=enabled`)

Authorization: [`docs/authorizations/phase6-controlled-ops-20260719.md`](authorizations/phase6-controlled-ops-20260719.md)

| Method | Path |
|--------|------|
| POST | `/api/v1/operations/validate` |
| POST | `/api/v1/operations/integration-request` |
| POST | `/api/v1/operations/review-pickup` |

### Phase 7 — alerts (`MISSION_CONTROL_ALERTS=enabled`)

Authorization: [`docs/authorizations/phase7-alerting-20260719.md`](authorizations/phase7-alerting-20260719.md)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/alerts` | Active local rule hits |
| GET | `/api/v1/alerts/history` | Delivery history |
| GET | `/api/v1/alerts/digest` | Mobile digest |

Alerts never approve, dispatch, or transfer lease. Webhook URL must be HTTPS when configured.

## 4. Still not exposed (remain control-plane / 405)

These stay rejected by the read-only middleware (or are never routed):

- `POST /api/v1/agents/{id}/pause`
- `POST /api/v1/tasks/{id}/freeze`
- `POST /api/v1/workers/dispatch` (use Phase 3 `operations/dispatch` when authorized)
- `POST /api/v1/integration/fast-forward`
- Any endpoint that writes `state/**`, mutates leases, enables silent dispatch, or launches workers without APPROVED disposition

## 5. Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `ADOS_ROOT_UNAVAILABLE` / `READ_MODEL_UNAVAILABLE` | 503 | Cannot build read model |
| `NOT_FOUND` | 404 | Entity missing from current snapshot |
| `UNAVAILABLE` | 404 | Entity present but marked unavailable |
| `VALIDATION_ERROR` | 400 | Bad query/body |
| `READ_ONLY_V2` | 405 | Mutation blocked (flag off or non-allowlisted path) |
| `MUTATION_HOST_DENIED` | 403 | Mutation Host not loopback and remote not allowed |
| `AUTHENTICATION_REQUIRED` | 401 | Basic auth required |
| `AUTH_NOT_CONFIGURED` | 503 | Basic mode without secret |
| `REDACTION_BLOCKED` | 403 | Would expose secret-shaped data |

## 6. Mutation host / CSRF residual

```text
Browser / automation POST
  → middleware allowlist (phase flag)
  → loopback Host check (unless MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS=enabled)
  → route handler → allowlisted ADOS tool → audit ledger
```

Default staging remains loopback HTTP. Broader exposure requires HTTPS plus a separately approved identity design (see `SECURITY.md`).

## 7. Configuration (examples)

```text
ADOS_ORCHESTRATOR_ROOT=D:\agent-development-os-orchestrator
ADOS_SOURCE_ROOT=D:\agent-development-os-orchestrator-source
ADOS_CURSOR_WORKTREE=D:\agent-development-os-orchestrator-source-cursor
ADOS_PRODUCT_ROOT=D:\agent-development-os
MISSION_CONTROL_AUTH_MODE=disabled
# MISSION_CONTROL_PHASE2_COMMANDS=enabled
# MISSION_CONTROL_PHASE3_COMMANDS=enabled
# MISSION_CONTROL_FLEET_MODE=enabled
# MISSION_CONTROL_PHASE6_COMMANDS=enabled
# MISSION_CONTROL_ALERTS=enabled
# MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS=enabled
```

UI route alias: `/repos` redirects to `/worktrees` (observation only).

# API Design — ADOS Mission Control Phase 1

**Base path:** `/api/v1`  
**Mode:** Read-only  
**Auth (Phase 1 local):** single-operator trust on localhost; document future auth in Phase 2+

## 1. Conventions

- JSON responses; `Content-Type: application/json`
- Timestamps: ISO-8601 UTC
- Errors: `{ "error": { "code": string, "message": string, "details"?: object } }`
- Pagination: `?cursor=&limit=` (default limit 50, max 200)
- Caching: `ETag` = hash of contributing source file mtimes + sizes
- Redaction: never return tokens, keys, connection strings

## 2. Endpoints (Phase 1 — implement)

### `GET /api/v1/snapshot`
Home aggregate → `MissionSnapshot`.

### `GET /api/v1/health`
Liveness of broker + last ingest time + severity.

### `GET /api/v1/leases/primary`
Authoritative `LeaseView` from ADOS lease file + OBSERVED process liveness.

### `GET /api/v1/agents`
List `AgentCard[]`.  
`GET /api/v1/agents/{agentId}` detail.

### `GET /api/v1/approvals`
Query: `status`, `from`, `to`.  
`GET /api/v1/approvals/{approvalId}`

### `GET /api/v1/tasks`
Query: `status`, `owner`, `reviewer`.  
`GET /api/v1/tasks/{taskId}`

### `GET /api/v1/handoffs`
Query: `fromAgent`, `toAgent`, `lifecycleStage`.  
`GET /api/v1/handoffs/{handoffId}`

### `GET /api/v1/worktrees`
All known repos/worktrees.  
`GET /api/v1/worktrees/{id}`

### `GET /api/v1/evidence`
Query: `taskId`, `approvalId`, `agent`, `q`.  
`GET /api/v1/evidence/{evidenceId}`  
`POST /api/v1/evidence/{evidenceId}/verify-hash` — **read-only verify** (recompute SHA-256; no mutation)

### `GET /api/v1/events`
Query: `severity`, `agent`, `taskId`, `eventType`, `from`, `to`, `sequenceAfter`.  
`GET /api/v1/events/{sequence}`

### `GET /api/v1/safety/alerts`
Active `ConflictAlert[]`.

### `GET /api/v1/events/stream` (SSE)
Server-Sent Events:
- `event: snapshot` — periodic full/partial home delta
- `event: ledger` — new ledger lines
- `event: health` — severity changes  
Heartbeat comment every 15s.

### `GET /api/v1/workflow`
Graph nodes + edges for workflow view.

## 3. Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `ADOS_ROOT_UNAVAILABLE` | 503 | Cannot read orchestrator root |
| `LEASE_MISSING` | 503 | Authoritative lease file missing |
| `NOT_FOUND` | 404 | Entity missing |
| `VALIDATION_ERROR` | 400 | Bad query |
| `REDACTION_BLOCKED` | 403 | Would expose secret-shaped data |

## 4. Phase 2+ endpoints — DO NOT IMPLEMENT IN PHASE 1

These must return `501 Not Implemented` if routed:

- `POST /api/v1/approvals/{id}/approve`
- `POST /api/v1/approvals/{id}/reject`
- `POST /api/v1/approvals/{id}/withdraw`
- `POST /api/v1/agents/{id}/pause`
- `POST /api/v1/tasks/{id}/freeze`
- `POST /api/v1/workers/dispatch`
- `POST /api/v1/integration/fast-forward`
- Any endpoint that writes `state/**`, mutates leases, enables dispatch, or launches workers

## 5. Configuration

Environment (examples):

```text
ADOS_ORCHESTRATOR_ROOT=D:\agent-development-os-orchestrator
ADOS_SOURCE_ROOT=D:\agent-development-os-orchestrator-source
ADOS_CURSOR_WORKTREE=D:\agent-development-os-orchestrator-source-cursor
ADOS_PRODUCT_ROOT=D:\agent-development-os
MISSION_CONTROL_DB=./data/read-model.sqlite
```

## 6. Write path (documentation only — Phase 2)

```text
UI action → Approval API → Schema validation → ADOS PowerShell tool → Audit ledger
```

Phase 1 UI must not invoke write tools.

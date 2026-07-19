# Mission Control V2 architecture

## Purpose and boundary

Mission Control V2 is a Next.js 15 App Router read model over an external ADOS control plane. It has no command path back into ADOS.

```text
Authenticated browser UI / GET-only API / SSE
              |
        server-side broker
       /                 \
validated ingest      app-owned SQLite
normalization         snapshot + watermarks
       |                    |
/data/ados/{state,handoffs,evidence}:ro   /var/lib/mission-control:rw
```

Mission Control V2 provides authenticated, resilient visibility only. It does not authorize, approve, dispatch, or mutate ADOS operations.

## Runtime layers

1. `middleware.ts` rejects non-safe API methods before route handling and, when configured, applies fail-closed Basic authentication to UI/API requests except the two health probes.
2. `lib/broker/io.ts` resolves paths beneath the configured root, reads JSON/JSONL, preserves append order, isolates malformed records, and records duplicate-sequence or source warnings.
3. `lib/ingestion/schema-registry.ts` recognizes bounded legacy and V2 records, emitting structural warnings without dropping unrelated data.
4. `lib/broker/snapshot.ts` reconciles source records, correlates evidence metadata, and produces `MissionSnapshot` V2.
5. `lib/read-model/sqlite-store.ts` redacts and atomically stores only the latest snapshot and per-source watermarks beneath the app-owned data root.
6. `lib/redaction.ts` removes secret-shaped keys and values before API, UI, logs, or persistence.
7. `components/mission-control.tsx` renders seven views and exposes live/cache/stale state explicitly.

## Authority semantics

- Lease files and ledger dispositions are authoritative inputs.
- Process liveness, worktree inspection, and uncorroborated runtime records are observations.
- Diagnostic-only results remain `DIAGNOSTIC_ONLY` and cannot normalize to completed success.
- Approval file status remains visible separately from the authoritative disposition.
- Consumption, revocation, denial, supersession, and timestamp expiry have explicit precedence.
- A `READY` label is emitted only when the source is reachable, no blocking/critical signal exists, no approval is pending, no parse warning remains, and process liveness is acceptable or unobservable in the container.

## Pages

Live Command Deck routes (`components/mission-control.tsx` → `dashboardViews`):

- `/overview` — readiness + nine PRD operational questions
- `/projects`
- `/agents`
- `/tasks` — includes derived task dependency adjacency (snapshot `dependencies` only; never invents edges)
- `/approvals` — consequence panels; Approve/Reject/Withdraw when `MISSION_CONTROL_PHASE2_COMMANDS=enabled` (ADOS tool bridge only)
- `/campaigns` — table + budget burn/forecast panel (`lib/campaign-budgets.ts`; burn UNAVAILABLE without issuedAt)
- `/owner-gates` — Phase 2 signed challenge→decide workflow when pubkey pinned; else fail-closed
- `/workflow` — read-only graph from `workflowSummary` (GET `/api/v1/workflow`)
- `/handoffs` — GET `/api/v1/handoffs`
- `/worktrees` — GET `/api/v1/worktrees`
- `/evidence` — metadata browser (bodies not ingested)
- `/safety` — alert monitor
- `/timeline`
- `/routing-incidents`
- `/replay`
- `/evidence-diff` — GET `/api/v1/evidence-diff` compare two supervisor runs (never fabricates when a side is UNAVAILABLE)
- `/dead-letter` — GET `/api/v1/dead-letter` derived repeated failures / blocked / worker-unavailable / owner-disposition routing (never invents)

All lists use truthful empty/unavailable states. Tasks, approvals, timeline, handoffs, and evidence have client-side search and normalized-state/category filters.

## Refresh and failure isolation

REST and SSE share an in-process snapshot fan-out for the configured refresh window (`lib/broker/snapshot-cache.ts`) so each connected client does not rebuild the full read model independently. SSE frames include monotonic `id:` values so browsers can send `Last-Event-ID` on reconnect; resume still emits the latest full snapshot (never fabricated deltas).

**SSE delta resume decision (wont-fix for Phase-1 MVP):** true `Last-Event-ID` event-delta replay is intentionally not implemented. The read model is a coherent full snapshot; inventing missed per-event deltas would risk fabricated chronology. Operators should expect a full snapshot on reconnect (comment on resume is observational only). Revisit only if a bounded, test-proven delta protocol is designed that never fabricates gaps.

A malformed or unsupported record produces a warning without crashing unrelated views. A successful live ingest atomically updates the redacted SQLite cache and watermarks. If the root or authoritative lease later disappears, the last snapshot is returned only as `STALE`, `BLOCKED`, `recoveredFromCache: true`; if no cache exists, a truthful empty `UNAVAILABLE` snapshot is returned.

## Cursor-First visibility extensions

V2 extends the read model for supervisor observation without becoming a control plane:

- `lib/data-quality.ts` maps source/cache/stream state onto `LIVE|CACHED|MOCK|STALE|INFERRED|AUTHORITATIVE|UNAVAILABLE` (fixtures are always `MOCK`).
- Snapshot projections include `campaigns`, `ownerGates`, and `freshness`.
- GET `/api/v1/campaigns`, `/api/v1/owner-gates`, `/api/v1/replay`, `/api/v1/evidence-diff`, and `/api/v1/support-bundle` are read-only.
- Phase 2 (owner-authorized): POST `/api/v1/approvals/:id/{approve|reject|withdraw}` and POST `/api/v1/owner-gates/:id/{challenge|decide}` invoke allowlisted `scripts/ados-tools/*` only (see `docs/authorizations/phase2-owner-commands-20260719.md`). Default remains read-only (`MISSION_CONTROL_PHASE2_COMMANDS` unset/disabled).
- `GET /api/v1/support-bundle` returns a redacted diagnostics JSON download (no auth secrets, no mutation capability). The Command Deck footer exposes the same download for operators.
- Canonical trees and override env vars are documented in `docs/PATH-REGISTRY.md` (control-plane root, evidence/handoffs mounts, MC data root). Prefer that registry over inventing new roots.
- UI views `campaigns`, `owner-gates`, and `replay` show budgets, protected decisions, and GET-only supervisor-run chronology with explicit “no UI action” banners.
- The browser SSE client reconnects after stream failure; e2e covers disconnect → `DISCONNECTED` → `LIVE`.
- Owner pause/kill/resume remain control-plane tools only.

Planning artifacts and remaining supervisor units live under `ados-mission-control-update-package/` and require cleared readiness gates before control-plane writes.

## Future phase

## Phase 2 owner commands (authorized 2026-07-19)

When `MISSION_CONTROL_PHASE2_COMMANDS=enabled`:

- Middleware allowlists POST `/api/v1/approvals/{id}/approve|reject|withdraw` and `/api/v1/owner-gates/{id}/challenge|decide`.
- `lib/commands/ados-bridge.ts` spawns allowlisted `scripts/ados-tools/*` only (argv-safe). Next.js still does not write `state/**` directly.
- Approval dispositions append to `state/approvals.jsonl` + `event-ledger.jsonl`.
- Owner-gate decisions require a pinned `MISSION_CONTROL_OWNER_PUBKEY_PATH` and Ed25519 signature over canonical challenge bytes (fail-closed without keys).
- Default remains read-only (`PHASE2` unset/disabled → all mutations `405 READ_ONLY_V2`).
## Phase 3 controlled operations (authorized 2026-07-19)

When `MISSION_CONTROL_PHASE3_COMMANDS=enabled`:

- POST `/api/v1/operations/dispatch` prepare/queue only after `APPROVED` disposition (fail-closed otherwise).
- POST `/api/v1/operations/campaign-control` pause/resume with matching APPROVED approval.
- Cursor PRIMARY / lease transfer remains impossible through Mission Control.
- UI surface: `/operations`.

## Phase 6 controlled-ops completeness (authorized 2026-07-19)

When `MISSION_CONTROL_PHASE6_COMMANDS=enabled`:

- POST `/api/v1/operations/validate` prepares an approved validator run packet.
- POST `/api/v1/operations/integration-request` files an approved integration request.
- POST `/api/v1/operations/review-pickup` prepares bounded review pickup (no silent dispatch enablement).
- Cursor PRIMARY / lease transfer remains impossible through Mission Control.
- UI surface: `/operations` Phase 6 panel.

## Phase 7 alerting (authorized 2026-07-19)

When `MISSION_CONTROL_ALERTS=enabled`:

- `GET /api/v1/alerts` evaluates local rules (readiness, heartbeat, dead-letter, fleet, critical safety).
- Optional HTTPS webhook via `MISSION_CONTROL_ALERT_WEBHOOK_URL` (secret env optional); payloads redacted.
- History under Mission Control `dataRoot/alerts/` (never ADOS `state/**`).
- UI: `/alerts` (history + mobile digest). Digest API: `GET /api/v1/alerts/digest`.
- Grafana: external provisioning only — `docs/operations/GRAFANA-PROVISIONING.md`.

## V3 roadmap (authorized 2026-07-19)

See `docs/09-PHASE-ROADMAP-V3.md`. Phases 5–7 complete. Next: Phase 8 hardening. Authorization: `docs/authorizations/v3-roadmap-20260719.md`.

## Phase 4 fleet + metrics (authorized 2026-07-19)

When `MISSION_CONTROL_FLEET_MODE=enabled` and `MISSION_CONTROL_FLEET_CONFIG` points at a member registry:

- GET `/api/v1/fleet` probes configured members (local `controlPlaneRoot` or remote `healthUrl`).
- GET `/api/v1/metrics` exports Prometheus text counters (auth-exempt, non-authoritative).
- UI surface: `/fleet`. Rows are always `NON_AUTHORITATIVE`.
- Grafana dashboard JSON: `docs/grafana/mission-control-overview.json` (not a bundled Grafana server).
- ADR: `docs/adr/ADR-001-fleet-and-prometheus.md`.

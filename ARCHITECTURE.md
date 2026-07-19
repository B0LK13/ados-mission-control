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
- `/tasks`
- `/approvals` — consequence panels; Approve/Reject disabled (Phase 2)
- `/campaigns` — table + budget burn/forecast panel (`lib/campaign-budgets.ts`; burn UNAVAILABLE without issuedAt)
- `/owner-gates`
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

REST and SSE share an in-process snapshot fan-out for the configured refresh window (`lib/broker/snapshot-cache.ts`) so each connected client does not rebuild the full read model independently. SSE frames include monotonic `id:` values so browsers can send `Last-Event-ID` on reconnect; resume still emits the latest full snapshot (never fabricated deltas). A malformed or unsupported record produces a warning without crashing unrelated views. A successful live ingest atomically updates the redacted SQLite cache and watermarks. If the root or authoritative lease later disappears, the last snapshot is returned only as `STALE`, `BLOCKED`, `recoveredFromCache: true`; if no cache exists, a truthful empty `UNAVAILABLE` snapshot is returned.

## Cursor-First visibility extensions

V2 extends the read model for supervisor observation without becoming a control plane:

- `lib/data-quality.ts` maps source/cache/stream state onto `LIVE|CACHED|MOCK|STALE|INFERRED|AUTHORITATIVE|UNAVAILABLE` (fixtures are always `MOCK`).
- Snapshot projections include `campaigns`, `ownerGates`, and `freshness`.
- GET `/api/v1/campaigns`, `/api/v1/owner-gates`, `/api/v1/replay`, `/api/v1/evidence-diff`, and `/api/v1/support-bundle` are read-only.
- `GET /api/v1/support-bundle` returns a redacted diagnostics JSON download (no auth secrets, no mutation capability). The Command Deck footer exposes the same download for operators.
- Canonical trees and override env vars are documented in `docs/PATH-REGISTRY.md` (control-plane root, evidence/handoffs mounts, MC data root). Prefer that registry over inventing new roots.
- UI views `campaigns`, `owner-gates`, and `replay` show budgets, protected decisions, and GET-only supervisor-run chronology with explicit “no UI action” banners.
- The browser SSE client reconnects after stream failure; e2e covers disconnect → `DISCONNECTED` → `LIVE`.
- Owner pause/kill/resume remain control-plane tools only.

Planning artifacts and remaining supervisor units live under `ados-mission-control-update-package/` and require cleared readiness gates before control-plane writes.

## Future phase

A mutation phase requires a separate owner-authorized command service, idempotency, signed audit records, and independent authorization review. Release 2.0 deliberately does not implement the roadmap Phase 2 mutation scope.

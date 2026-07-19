# ADR-002 — SSE bounded delta protocol (design gate)

**Status:** Accepted — **defer implementation** (2026-07-19)  
**Context:** V3 P8-01 `ados-mission-control-v2-roadmap-phase8-001`  
**Related:** `app/api/v1/events/stream/route.ts`, `lib/broker/snapshot-cache.ts`, `ARCHITECTURE.md`

## Problem

SSE reconnect today sends a **full** `MissionSnapshot` after acknowledging `Last-Event-ID`. Large control planes make reconnect bandwidth expensive. A naive delta protocol that invents missed events would fabricate chronology and violate Mission Control freshness/authority invariants.

## Decision

1. **Keep full-snapshot resume as the production protocol.** On reconnect, emit the latest coherent snapshot (current behavior). `Last-Event-ID` remains observational only (comment/`:` resume line).

2. **Do not implement event-delta resume in this phase.** No implementation ticket is unblocked until a future ADR amendment proves a non-fabricating design against the rejection criteria below.

3. **Optional future protocol** (not authorized for code yet) may only ship if **all** gates pass:
   - Deltas are derived from a **monotone, server-owned sequence** of already-materialized snapshot digests (or field-level patches of the last successfully delivered snapshot), never from reconstructed ledger gaps.
   - If the server cannot prove continuity from the client’s `Last-Event-ID` to the current sequence, it **must** fall back to a full snapshot (never a partial invented stream).
   - Clients treat any gap, checksum mismatch, or unsupported patch schema as **full-snapshot required**.
   - Payloads remain redacted; authority/freshness labels cannot upgrade via patches.
   - Unit + e2e tests demonstrate reconnect after dropped frames without fabricated counters/events.

## Threat model

| Threat | Why it matters | Control (current / required) |
|--------|----------------|------------------------------|
| Fabricated chronology | Operator acts on events that never occurred | Full snapshot only; reject inventing missed ledger rows |
| Stale-as-live | Patch applied onto wrong base snapshot | Require matching base `sequence` + content digest before patch apply |
| Privilege upgrade via patch | INFERRED → AUTHORITATIVE | Patches cannot change authority enums except by full snapshot |
| Secret leakage in large SSE | Full snapshot already redacted; deltas must too | Same `redactValue` path as REST |
| Client desync | Partial apply leaves UI inconsistent | Fail closed → full snapshot |

## Rejection criteria (auto-reject proposals)

- Reconstructing missed `event-ledger.jsonl` rows from sparse IDs
- Client-side interpolation of heartbeats, approvals, or conflict cards
- “Best effort” deltas without digest/sequence continuity proof
- Removing full-snapshot fallback

## Consequences

- Reconnect bandwidth remains O(snapshot size); acceptable for loopback/staging V3.
- Shared snapshot fan-out (`getSharedMissionSnapshot`) remains the primary bandwidth control for concurrent SSE/REST clients.
- Future delta work needs a new authorization note amending this ADR to **Accepted — implement**.

## Acceptance note

Owner chat directive “Proceed” (2026-07-19) accepts this ADR as the design gate: **full-snapshot fallback retained; delta implementation deferred**.

# Phase 8 performance notes (P8-02)

**Date:** 2026-07-19  
**Scope:** Broker / fleet hot paths without authority or freshness regressions.

## Baseline (before)

- Fleet member probes ran **sequentially** (`for … await probeMember`).
- Owner approval JSON files under `handoffs/owner/approvals` were read **sequentially**.
- Snapshot fan-out already shared via `getSharedMissionSnapshot` (FBL-PERF-002).

## Change

- `buildFleetProjection` now uses `Promise.all(configs.map(probeMember))` so local/remote probes overlap.
- Approval-file ingest in `lib/broker/snapshot.ts` uses `Promise.all` over read+validate.
- No change to authority labels (`NON_AUTHORITATIVE`), readiness derivation, or redaction.

## After

- Unit suite remains green (`npm run test:unit`), including fleet probe assertions.
- Expected wall-clock improvement scales with member count and probe latency (I/O bound); single-member fleets are unchanged within noise.

## Non-goals

- No SSE delta protocol (deferred by ADR-002).
- No fabricated caching of lease authority across members.

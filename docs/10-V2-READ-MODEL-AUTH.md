# V2 read-model and staging-auth decision

## Scope

Release 2.0 hardens the deployed read-only application without crossing the ADOS command boundary. It adds versioned ingestion validation, an app-owned SQLite cache, stale recovery, Basic-auth staging protection, and evidence metadata correlation. It adds no approve, reject, withdraw, dispatch, runtime-promotion, or state-edit route.

## Persistence boundary

`lib/read-model/sqlite-store.ts` is the only application write adapter. It resolves `MISSION_CONTROL_DATA_ROOT`, creates `mission-control-v2.sqlite` there, and stores recursively redacted snapshots and ingest watermarks in one transaction. The container maps that path to `/var/lib/mission-control`; all ADOS mounts remain read-only.

When live ingest succeeds, cache status is `READY`. If the external source later disappears, the broker may serve the last cache only with:

- source mode `UNAVAILABLE` and `stale: true`;
- read-model status `STALE` and `recoveredFromCache: true`;
- readiness `BLOCKED` and risk `STALE_SOURCE`;
- a visible stale-cache safety alert.

No cache means a truthful empty unavailable snapshot.

## Authentication boundary

Basic mode protects the UI and read APIs. Configuration is fail-closed if the secret is absent. Health probes are exempt and return safe metadata only. The credential file is generated locally, ignored by Git/Docker build context, and never printed or copied into evidence.

Loopback HTTP remains mandatory. HTTPS and a stronger identity provider are prerequisites for any non-loopback exposure.

## Deferred authority scope

Roadmap Phase 2 owner mutations remain deferred. Implementing them requires explicit authorization, an ADOS-grade command adapter, idempotency, owner consequence panels, signed/append-only audit behavior, and an independent security review.

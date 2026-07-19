# Mission Control V2 security

## Read-only guarantee

Mission Control V2 is a GET-only observability cockpit by default. Owner-authorized Phase 2 command routes may approve/reject/withdraw and close owner gates only through allowlisted ADOS tools — never via raw `state/**` writes from Next.js. Phase 3 approved-only operations are opt-in via `MISSION_CONTROL_PHASE3_COMMANDS=enabled` and still cannot grant Cursor PRIMARY/lease. Phase 6 validate/integration/review-pickup is opt-in via `MISSION_CONTROL_PHASE6_COMMANDS=enabled` with the same APPROVED-only, no-lease invariants. Phase 7 alerting is opt-in via `MISSION_CONTROL_ALERTS=enabled` with optional HTTPS webhook env secrets — alerts never approve, dispatch, or transfer lease. Phase 4 fleet observation and Prometheus metrics (`MISSION_CONTROL_FLEET_MODE`, `GET /api/v1/metrics`) are non-authoritative and default off.

The guarantee is enforced in layers:

- `npm run verify:readonly` fails on ADOS write primitives, child-process launchers, or known dispatch adapters in `app`, `components`, and `lib`. Write/spawn exceptions: `lib/read-model/sqlite-store.ts` (app-owned cache), `lib/alerts/history-store.ts` (MC dataRoot alert history), and `lib/commands/ados-bridge.ts` (argv-only allowlisted tool spawn).
- `middleware.ts` rejects unsafe methods below `/api/*` with `405 READ_ONLY_V2`, except the Phase 2/3/6 POST allowlists when their respective flags are enabled.
- Runtime promotion and lease transfer routes do not exist. Phase 3 dispatch and Phase 6 validate/integration/review-pickup are prepare/file only behind their flags and require an APPROVED disposition. Fleet probes and Phase 7 alerts never approve, dispatch, or transfer lease. Alert webhook secrets stay in env; payloads are redacted.
- The container mounts ADOS `state`, `handoffs`, and `evidence` with `:ro`; a separate named volume is writable only at `/var/lib/mission-control`.
- The hardened container runs as UID/GID 1001, with all Linux capabilities dropped, `no-new-privileges`, a read-only root filesystem, and only small temporary filesystems for runtime cache.

## Path safety

The ADOS source root is server configuration, never a browser parameter. All derived paths pass through `resolveWithinRoot`; traversal outside the configured root raises `PATH_OUTSIDE_CONFIGURED_ROOT`. Route handlers do not accept client-provided filesystem paths and the UI does not expose arbitrary file browsing.

## Redaction

Redaction is applied recursively to normalized data and again to JSON responses (`lib/redaction.ts`). It covers:

- bearer/basic authorization values;
- API keys and common access-token formats;
- force-redacted object keys (password/token/secret/authorization/cookie/private-key and common affixes such as `clientSecret`, `refresh_token`);
- private-key blocks and password-bearing connection strings;
- secret-like query parameters;
- user-profile segments in Windows paths.

**High-risk envelopes** (support-bundle and similar diagnostics) additionally use structured field allowlisting via `redactHighRiskEnvelope`:

- Containers such as `credentials`, `headers`, `secrets`, `env`, `tokens`, and `cookies` are treated as high-risk.
- Inside those containers, only an explicit allowlist of diagnostic field names may retain values (still pattern-redacted).
- Unlisted fields become `[REDACTED_UNLISTED_FIELD]` so novel secret shapes cannot pass a regex-only filter.

Structured logs contain only counts, modes, safe event names, and health transitions. Raw approval/evidence contents are not logged. Evidence files are represented by bounded metadata, not served as arbitrary content.

The same recursive redaction runs before a snapshot is serialized to SQLite. Cache tests inject a bearer token and verify that the persisted payload contains only the redaction marker.

## Authentication

Set `MISSION_CONTROL_AUTH_MODE=basic`, `MISSION_CONTROL_AUTH_USER`, and a strong `MISSION_CONTROL_AUTH_SECRET`. When Basic mode is enabled but the secret is absent, protected requests fail closed with `503 AUTH_NOT_CONFIGURED`. Missing or invalid credentials receive `401` and a Basic challenge. `GET /api/health`, `GET /api/v1/health`, and `GET /api/v1/metrics` are exempt so probes/scrapers remain possible; none expose secrets or paths.

Basic credentials are encrypted only by the transport. V2 staging therefore remains loopback-only over HTTP. Any broader exposure requires HTTPS plus a separately approved identity and network authorization design.

## HTTP controls

The application emits content-type, frame, referrer, permissions, opener/resource, and Content Security Policy headers. Responses are `no-store` and identify `X-ADOS-Authority: read-only`.

## Deployment exposure

Authentication does not authorize public exposure. Staging still binds to `127.0.0.1` and must not be exposed through public DNS, a tunnel, host networking, or external ingress.

## Local auth credential file

Staging Basic auth credentials live only in `.mission-control-auth.env`, generated by `npm run auth:generate`. That file is gitignored and must never be committed, copied into evidence, or pasted into tickets. Rotate by deleting/moving the file, regenerating, and restarting staging.

## Secret scanning

`.secrets.baseline` is the committed detect-secrets baseline for this tree. The pre-commit hook runs without `|| true`:

```text
detect-secrets-hook --baseline .secrets.baseline $(git ls-files)
# or, after installing hooks:
pre-commit run detect-secrets --all-files
```

Baseline entries currently cover known test/fixture placeholders (e2e Basic secret, fixture hashes). Real credential introductions must fail the hook until intentionally baselined or removed.

## Verification

Run:

```text
npm run verify:readonly
npm run test:unit
npm run test:e2e
detect-secrets-hook --baseline .secrets.baseline $(git ls-files)
```

The suite additionally covers Basic-auth failure modes, versioned ingestion warnings, SQLite redaction/watermarks, stale recovery, evidence correlation, and authenticated browser access.

## V3 surfaces — threat model (Phases 5–7)

| Surface | Flag (default off unless noted) | Threat | Control |
|---------|----------------------------------|--------|---------|
| Conflict / risk / digests (Phase 5) | always-on read-only | Operator treats `INFERRED` as `AUTHORITATIVE` | Explicit freshness labels; scores never upgrade authority |
| Evidence hash verify | always-on GET | Path traversal / body exfil | Root-bound paths; `contentIngested: false` |
| Phase 6 validate/integration/pickup | `MISSION_CONTROL_PHASE6_COMMANDS` | Unapproved mutation | APPROVED disposition + action matchers + consumption ledger; argv-only tools |
| Phase 7 alert rules | `MISSION_CONTROL_ALERTS` | Alert-driven approve/dispatch | GET-only APIs; `mutationActions: []` |
| Phase 7 webhook | `MISSION_CONTROL_ALERT_WEBHOOK_URL` (+ optional secret) | Secret exfil / non-TLS delivery | HTTPS-only URL; env-only secret; redacted payloads |
| Fleet / metrics (Phase 4) | `MISSION_CONTROL_FLEET_MODE` | Fake PRIMARY via fleet | Rows always `NON_AUTHORITATIVE` |
| SSE resume | n/a | Fabricated chronology via deltas | Full-snapshot only — `docs/adr/ADR-002-sse-bounded-delta-protocol.md` |

**INFERRED vs AUTHORITATIVE:** Control-plane lease/disposition fields remain authoritative when sourced from ADOS state. Derived conflict cards, risk bands, approval digests, alert hits, and fleet probes are `INFERRED` / `NON_AUTHORITATIVE` / `OBSERVED` and must not be treated as owner decisions.

**Rollback flags:** unset or `disabled` for `MISSION_CONTROL_PHASE2_COMMANDS`, `MISSION_CONTROL_PHASE3_COMMANDS`, `MISSION_CONTROL_PHASE6_COMMANDS`, `MISSION_CONTROL_ALERTS`, `MISSION_CONTROL_FLEET_MODE`. Unset webhook URL/secret when disabling alerts.

## V3 surfaces (Phases 5–7)

See [`docs/security/V3-THREAT-MODEL.md`](docs/security/V3-THREAT-MODEL.md) for the compact threat matrix. Summary:

- **INFERRED vs AUTHORITATIVE:** Phase 5 conflict/risk/summary outputs are derived and must never render as authoritative lease/approval truth.
- **Phase 6 flags:** `MISSION_CONTROL_PHASE6_COMMANDS` defaults off; middleware returns `405 READ_ONLY_V2` for validate/integration/review-pickup when disabled. Tools refuse lease/PRIMARY mutations.
- **Phase 7 alerts:** `MISSION_CONTROL_ALERTS` defaults off. Optional `MISSION_CONTROL_ALERT_WEBHOOK_URL` must be HTTPS; `MISSION_CONTROL_ALERT_WEBHOOK_SECRET` stays env-only and is never committed. Webhook payloads are redacted and include empty `mutationActions`.
- **SSE deltas:** Deferred by [`docs/adr/ADR-002-sse-bounded-delta-protocol.md`](docs/adr/ADR-002-sse-bounded-delta-protocol.md); production resume remains full-snapshot.

## Known limitations

- The schema registry covers the ingested ledger/approval families; it is not a complete schema archive for every historical ADOS document.
- Secret detection is defense in depth, not a substitute for preventing secrets from entering operational summaries.
- V2 has one staging identity, not roles or SSO. Phase 2 mutations should stay behind Basic auth + loopback; CSRF hardening is a follow-up if browser exposure widens.
- Owner-gate decisions require a pinned Ed25519 public key (`MISSION_CONTROL_OWNER_PUBKEY_PATH`). Private keys must never enter the Mission Control image or git tree.

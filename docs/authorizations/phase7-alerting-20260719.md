# Owner authorization — Mission Control Phase 7 alerting

**Status:** AUTHORIZED  
**Authorized at:** 2026-07-19 (owner chat directive: Continue)  
**Scope:** `ados-mission-control-v2-roadmap-phase7-001` … `phase7-005`  
**Prerequisite:** V3 roadmap authorization (`docs/authorizations/v3-roadmap-20260719.md`).

## Allowed

1. Enable `MISSION_CONTROL_ALERTS=enabled` for loopback/staging Mission Control.
2. Evaluate local rules over readiness, heartbeat, dead-letter, fleet reachability, and critical safety.
3. Persist redacted alert history under Mission Control `dataRoot` (never ADOS `state/**`).
4. Optionally deliver HTTPS webhooks via `MISSION_CONTROL_ALERT_WEBHOOK_URL` (+ optional `MISSION_CONTROL_ALERT_WEBHOOK_SECRET`).
5. Document external Grafana scrape/import without bundling Grafana.

## Prohibited

- Default-on alerting (fail-closed when flag unset/disabled).
- Non-HTTPS webhook URLs.
- Committing webhook secrets or URLs with credentials.
- Approve / dispatch / lease-transfer actions via webhook callbacks or alert UI.
- Embedding secrets in metric or alert payloads.

## Threat model (summary)

| Threat | Control |
|--------|---------|
| Accidental public webhook | HTTPS-only URL check; env-only secret |
| Secret exfiltration in payload | `redactValue` + `safeSummary` |
| Alert-driven mutation | `mutationActions: []`; no POST mutation routes under `/api/v1/alerts` |
| Operator confusion about authority | `NON_AUTHORITATIVE` / `INFERRED` labels |

## Rollback

Set `MISSION_CONTROL_ALERTS=disabled` (default) and unset webhook env vars.

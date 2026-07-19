# V3 threat model note (Phases 5–7)

Companion to [`SECURITY.md`](../../SECURITY.md). Covers operator-intelligence, controlled-ops completeness, and alerting surfaces authorized by the V3 roadmap.

## Assets

- ADOS control-plane truth (lease, approvals, ledger)
- Owner credentials / webhook secrets
- Operator decision quality (not mistaking INFERRED for AUTHORITATIVE)

## Threats and controls

| Surface | Threat | Control |
|---------|--------|---------|
| Phase 5 risk/conflicts/summaries | Operator treats INFERRED as authority | Explicit freshness labels; UI copy; no mutation from intelligence panels |
| Phase 5 evidence verify | Content exfiltration via hash API | Metadata/hash only; `contentIngested: false` |
| Phase 6 tools | Unapproved validate/integration/pickup | Flag fail-closed; APPROVED disposition + action matchers; consumption ledger |
| Phase 6 tools | Cursor PRIMARY / lease via MC | Tools refuse LEASE/PRIMARY; prepare/file only |
| Phase 7 rules | Alerting used as silent mutate channel | GET-only evaluation; `mutationActions: []` in payloads |
| Phase 7 webhook | Secret leak / SSRF to mutate ADOS | Env-only secrets; HTTPS-only URL; redacted payloads; no callback approve/dispatch |
| Phase 7 history | Writing ADOS `state/**` | History under MC `dataRoot/alerts` only |
| Fleet/metrics | Cross-member authority inheritance | `NON_AUTHORITATIVE` / `authority="observed"` |
| SSE (future deltas) | Fabricated chronology | ADR-002: full-snapshot only until amend |

## Rollback flags

| Flag | Default |
|------|---------|
| `MISSION_CONTROL_PHASE2_COMMANDS` | disabled |
| `MISSION_CONTROL_PHASE3_COMMANDS` | disabled |
| `MISSION_CONTROL_PHASE6_COMMANDS` | disabled |
| `MISSION_CONTROL_FLEET_MODE` | disabled |
| `MISSION_CONTROL_ALERTS` | disabled |

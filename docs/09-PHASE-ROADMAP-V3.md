# Phase Roadmap V3 — ADOS Mission Control

**Status:** AUTHORIZED (2026-07-19)  
**Authorization:** [`docs/authorizations/v3-roadmap-20260719.md`](authorizations/v3-roadmap-20260719.md)  
**Predecessor:** Phases 1–4 complete (`docs/08-PHASE-ROADMAP.md`, classification `MISSION_CONTROL_V2_ROADMAP_PHASES_1_TO_4_MVP_COMPLETE`)

V3 raises Mission Control from “complete cockpit” to **operator intelligence + controlled-ops completeness + alerting**, without weakening authority invariants.

## Invariants (carry forward)

- Cursor cannot acquire or inherit ADOS PRIMARY lease through Mission Control.
- Default remains GET-only `READ_ONLY_V2` unless an explicit opt-in flag is enabled.
- Next.js never writes `state/**` directly; mutations only via allowlisted `scripts/ados-tools/*`.
- Fleet/metrics remain `NON_AUTHORITATIVE` / `authority="observed"`.
- Truthful `UNAVAILABLE` / `STALE` / `INFERRED` labels — never fabricate chronology or authority.

## Phase 5 — Operator intelligence (read-only)

**Status:** COMPLETE (2026-07-19) — `phase5-001`…`006` Done in backlog.

**Goal:** Help the owner decide faster without granting new mutation power.

| ID | Deliverable | Effort | Notes |
|----|-------------|--------|-------|
| P5-01 | Conflict detection upgrades | M | Done — `lib/conflicts.ts`; overview + `/safety` |
| P5-02 | Risk scoring (derived) | M | Done — `lib/risk-scoring.ts`; tasks/approvals/campaigns |
| P5-03 | Intelligent approval summaries | M | Done — `lib/approval-summary.ts`; no cloud LLM |
| P5-04 | Agent detail drawer | S | Done — read-only Agents detail panel |
| P5-05 | Evidence hash verify UI | S | Done — `GET /api/v1/evidence/verify` metadata only |
| P5-06 | Overview nine-question completeness | S | Done — nine chips + conflict overviewAnswer |

**Exit gate:** All P5 surfaces remain GET-only; inferred scores never render as `AUTHORITATIVE`. ✅

**Flag:** none (read-only enhancements always on once shipped).

## Phase 6 — Controlled operations completeness

**Status:** COMPLETE (2026-07-19) — `phase6-001`…`005` Done in backlog.

**Goal:** Finish Phase 3 gaps that were intentionally deferred (validators, integration requests, review pickups).

| ID | Deliverable | Effort | Notes |
|----|-------------|--------|-------|
| P6-01 | Approved validator run | L | Done — `POST /api/v1/operations/validate` |
| P6-02 | Approved integration request | L | Done — `POST /api/v1/operations/integration-request` |
| P6-03 | Bounded review pickup | M | Done — `POST /api/v1/operations/review-pickup` |
| P6-04 | Operations UI expansion | M | Done — `/operations` Phase 6 panel |
| P6-05 | Negative + audit tests | M | Done — `tests/phase6-commands.test.ts` + evidence package |

**Exit gate:** Impossible without owner approval; Cursor still cannot hold orchestrator lease; full audit trail. ✅

**Flag:** `MISSION_CONTROL_PHASE6_COMMANDS=enabled` (independent of Phase 2/3/4 flags).

## Phase 7 — Alerting & external ops hooks

**Status:** COMPLETE (2026-07-19) — `phase7-001`…`005` Done in backlog.

**Goal:** Notify operators of readiness/fleet/dead-letter signals without embedding secrets in metrics.

| ID | Deliverable | Effort | Notes |
|----|-------------|--------|-------|
| P7-01 | Alert rule engine (local) | M | Done — `lib/alerts/rules.ts` + `GET /api/v1/alerts` |
| P7-02 | Opt-in webhook notifier | M | Done — HTTPS-only webhook; redacted payloads |
| P7-03 | Alert history UI | S | Done — `/alerts` history panel |
| P7-04 | Grafana provisioning runbook | S | Done — `docs/operations/GRAFANA-PROVISIONING.md` |
| P7-05 | Mobile alert digest | S | Done — digest panel + `GET /api/v1/alerts/digest` |

**Exit gate:** Alerting default off; payloads redacted; never grant mutation/approve/dispatch via alerts. ✅

**Flag:** `MISSION_CONTROL_ALERTS=enabled` (+ webhook URL/secret via env, never committed).

## Phase 8 — Platform hardening & performance

**Status:** COMPLETE (2026-07-19) — `phase8-001`…`005` Done in backlog.

**Goal:** Make the cockpit safer and faster under sustained operator use.

| ID | Deliverable | Effort | Notes |
|----|-------------|--------|-------|
| P8-01 | SSE bounded delta protocol ADR | M | Done — ADR-002 accepted; delta implementation deferred |
| P8-02 | Snapshot/query performance | M | Done — parallel fleet/approval IO + PERF-NOTES |
| P8-03 | Fleet aggregation polish | S | Done — filters + last-probe age on `/fleet` |
| P8-04 | Threat model + SECURITY refresh | S | Done — SECURITY.md + `docs/security/V3-THREAT-MODEL.md` |
| P8-05 | E2E coverage for V3 surfaces | M | Done — `tests/e2e/v3-surfaces.spec.ts` |

**Exit gate:** No authority regression; typecheck + unit + readonly + e2e green. ✅

## Sequencing

```text
Phase 5 (intelligence) ──► Phase 6 (ops completeness) ──► Phase 7 (alerts)
                                      │
                                      └──► Phase 8 (hardening) may overlap late Phase 6/7
```

Recommended execution: complete Phase 5 before enabling Phase 6 in staging. Phase 7 may prototype after P5-01 conflict signals exist. Phase 8-01 (SSE ADR) can start anytime as design-only.

## Non-goals (V3)

- Cursor PRIMARY / lease transfer via Mission Control
- Silent production dispatch enablement
- Bundled Grafana/Prometheus servers inside the MC image
- Holding owner private keys in the MC repo or container
- Cross-fleet mutation or approve/dispatch from fleet/alert views
- Unbounded cloud LLM calls that exfiltrate control-plane paths/secrets

## Success metrics

| Metric | Target |
|--------|--------|
| Open V3 backlog items closed with evidence | 100% of authorized Phase tasks |
| Authority regressions | 0 (Cursor PRIMARY still impossible) |
| Unapproved Phase 6 action acceptance | 0 in negative tests |
| Alert payload secret leaks | 0 (redaction tests) |
| Unit + verify:readonly | pass on every phase tip |

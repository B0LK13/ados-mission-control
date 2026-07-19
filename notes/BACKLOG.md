<!-- BEGIN AUTO-GENERATED BACKLOG (source: /backlog/tasks.json) -->
# Backlog — ADOS Mission Control (Standalone, D:\ados-mission-control)

_Generated from the workspace-wide backlog at `/backlog/tasks.json`. Do not hand-edit between the markers; re-run `tools/write-per-project-backlogs.py` after updating the central backlog._

- **Project ID:** `ados-mission-control-v2`
- **Folder:** `ados-mission-control`
- **Type:** Next.js observability dashboard
- **Primary language:** TypeScript
- **Classification status:** confirmed
- **Maturity:** strong (overall score 3.6/5) → target: advanced
- **Summary:** Mission Control V2 roadmap Phases 1–4 MVP complete (2026-07-19): read-only cockpit + opt-in Phase 2 owner commands, Phase 3 approved-only ops, Phase 4 fleet/metrics. No open MC V2 backlog tasks.

## Open Tasks (0)

| Priority | Count |
|---|---|


<!-- END AUTO-GENERATED BACKLOG -->

## Deep analysis (2026-07-19)

Full write-up: [`docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md`](docs/audits/MC-V2-DEEP-ANALYSIS-2026-07-19.md).

**Verdict:** Phases 1–4 complete for the Mission Control V2 roadmap slice. Phase 3 approved-only ops and Phase 4 fleet/metrics ship behind opt-in flags; Cursor still cannot take PRIMARY lease via MC.

### Recommended next

1. ~~**Phase-1 module surface + hardening**~~ — done 2026-07-19.
2. ~~**roadmap-phase2-001/002**~~ — Approve/reject/withdraw + signed owner-gate workflow (done 2026-07-19).
3. ~~**roadmap-phase3-001**~~ — Controlled dispatch prepare/queue + campaign pause/resume (done 2026-07-19).
4. ~~**roadmap-phase4-001**~~ — Fleet observation + Prometheus/Grafana hooks (done 2026-07-19).
5. **Stop** — no open MC V2 roadmap items. Further advanced automation (risk scoring, mobile alerts) needs a new backlog item + owner authorization.

### Completed earlier (keep for history)

G0–G7 clearance, lease reacq, CI Node 22, campaigns/owner-gates/replay, Docker CI, package schemas, secrets baseline, timing-safe auth, SSE fan-out, PATH-REGISTRY, support-bundle, axe a11y, dead-letter, deps graph, evidence-diff, budget burn, redaction allowlist, keyboard e2e, Phase 2 owner commands, Phase 3 controlled operations, Phase 4 fleet + metrics.

**Classification:** `LIVE_UNSCOPED_AND_PUBLICATION_AUTHORIZED` (control-plane). Default remains GET-only; Phase 2/3/4 features are opt-in.

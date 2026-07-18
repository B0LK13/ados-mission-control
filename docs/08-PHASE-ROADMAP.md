# Phase Roadmap — ADOS Mission Control

> Release note: application version 2.0 ships read-only resilience, versioned ingestion, local cache recovery, and staging authentication. It does not implement the mutation capabilities listed under roadmap Phase 2; those still require explicit owner/ADOS authorization.

## Phase 1 — Read-only observability (current spec package)

**Deliverables:** PRD, IA, data model, API, screens, broker design, security, schemas, sample snapshot, Cursor implementation mission.

**Product capabilities (when built):**
- Agent cards, lease status, approvals list, timeline, task graph, worktrees, handoffs, evidence, safety monitor
- Home cockpit answering nine operational questions
- SSE live updates

**Exit gate:** Specs accepted by Owner + Claude PRIMARY review; sample snapshot schema-valid; implementation mission ready.

## Phase 2 — Owner approvals

- Approve / reject / withdraw with full consequence panels
- Generate signed approval records via ADOS PowerShell tools
- Request corrections / more evidence
- Full audit trail in ledger

**Exit gate:** Every UI mutation produces ADOS-grade approval + ledger event; no raw `state/*` edits from UI.

## Phase 3 — Controlled operations

- Trigger bounded review pickups
- Dispatch **approved** worker tasks only
- Pause/resume workflows
- Run validators
- Create integration requests

**Exit gate:** Dispatch remains impossible without owner approval; Cursor still cannot hold orchestrator lease.

## Phase 4 — Advanced automation

- Automated conflict detection upgrades
- Risk scoring
- Intelligent approval summaries
- Workflow replay / recovery assistant
- Cross-project fleet dashboard
- Mobile alerts
- Grafana / Prometheus integration

**Exit gate:** Fleet mode does not weaken single-project authority invariants.

## Non-goals across phases (unless contract changes)

- Cursor acquiring or inheriting ADOS PRIMARY lease through Mission Control
- Silent dispatch enablement
- Unaudited write paths into control-plane state

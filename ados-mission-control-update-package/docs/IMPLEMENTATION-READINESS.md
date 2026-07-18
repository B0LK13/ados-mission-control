# ADOS Cursor-First Supervisor — Implementation Readiness

**Status:** Planning package only. This document does not authorize full supervisor product execution.  
**Package:** `ados-mission-control-update-package` (`executionAuthorization: false`)  
**Date:** 2026-07-17 (path/clearance notes updated 2026-07-18)  
**Companion plan:** `docs/plans/2026-07-17-001-feat-cursor-first-supervisor-plan.md`

> **2026-07-18 clearance:** Pilot STATUS recorded `G0_G7_CLEARED` + `CANONICAL_PATHS_RECONCILED` under
> `docs/evidence/g0-g7-mc-pilot-001-20260718T150618Z/`. Owner waiver
> `docs/VALIDATION-WAIVED-PACKAGE-WIDE-20260718.md` makes G0–G7 **non-blocking** for package
> implementation work. See `docs/GATE-CLEARANCE-STATUS.md`. Commit/push/merge/deploy and
> control-plane supervisor product enablement remain owner-gated.

## Purpose

Close the gap between this planning package and a valid disk-backed ADOS campaign. No supervisor, adapter, or Mission Control mutation work starts until every gate below is green.

## Target repositories

| Role | Path (Windows) | Path (WSL) | Notes |
|------|----------------|------------|-------|
| Control plane | `D:\agent-development-os-orchestrator` | `/mnt/d/agent-development-os-orchestrator` | Supervisor, policy, dispatch, evidence |
| Canonical Mission Control implementation and pilot worktree | `D:\agent-development-orchestrator\orchestrators\agent-development-os-mission-control-cursor-live-integration` | `/mnt/d/agent-development-orchestrator/orchestrators/agent-development-os-mission-control-cursor-live-integration` | **Owner-declared canonical (post-Topics retirement).** |
| Superseded Topics path | `D:\Topics\orchestrators\…` | `/mnt/d/Topics/orchestrators/…` | Absent; retired — see `/mnt/d/backlog/TOPICS-ORCHESTRATORS-REMAP.md` |
| Noncanonical MC tree (planning host; not the pilot worktree) | `D:\ados-mission-control` | `/mnt/d/ados-mission-control` | Hosts this planning package |
| Planning package | This directory | `/mnt/d/ados-mission-control/ados-mission-control-update-package` | Specs/drafts only; not a runtime |

**2026-07-18 path note:** `CANONICAL_PATHS_RECONCILED` recorded in pilot STATUS with the live orchestrators MC worktree. Do not resurrect `Topics/orchestrators` paths.

Old path-bound approvals must never be silently reinterpreted against a relocated worktree.

## Mandatory first gate (before any write)

Copied from `04-CURSOR-MASTER-INSTRUCTION.md` and expanded for operators:

1. Verify native Windows execution (`pwsh`, Windows paths, registered launchers).
2. Verify orchestrator lease (`state/orchestrator-lease.json` held, heartbeat healthy).
3. Verify campaign status, expiry, scope, and budgets.
4. Verify canonical paths and repository identity (see checklist below).
5. Verify branch, HEAD, tree, common Git directory, status, and remotes.
6. Verify exact write allowlist and pre-change hashes.
7. Verify `cursor-windows` is production-eligible (`AVAILABLE_SMOKE_VALIDATED` or owner override).
8. Run the approved adapter dry run.
9. Stop on any mismatch.

## Canonical path reconciliation checklist

Exit classification: `CANONICAL_PATHS_RECONCILED`.

- [ ] Determine whether Mission Control relocation was move, copy, junction, or symlink.
- [ ] Validate Git worktree registration and common directory for each candidate.
- [ ] Compare reviewed file inventory and SHA-256 hashes across candidates.
- [ ] Search ADOS contracts, approvals, scripts, and evidence for stale old-path references.
- [ ] Owner-approved document declaring:
  - control-plane root
  - Mission Control UI root
  - pilot worktree root
  - evidence roots
- [ ] Invalidate or re-issue path-bound approvals that cite superseded paths.
- [ ] Update campaign example and any new campaign JSON to the declared paths only.

## Contract resolutions (planning defaults)

These resolve contradictions between package docs/schemas and live ADOS code. Implementers treat them as binding unless an owner gate changes them.

| Topic | Resolution |
|-------|------------|
| Campaign vs task | Add **campaign** and **mission** layers above existing task contracts (`config/schemas/task-contract.schema.json` 1.1.0). Do not replace task contracts. |
| Schema filenames | Package `live-event.schema.json` → broker events; add missing `mission-run`, `policy-decision`, `campaign-consumption` schemas in control plane. Prefer control-plane `config/schemas/` as runtime home; keep package copies as planning source. |
| `networkPolicy` shape | Campaign retains object `{ mode, allowlist }`. Child tasks store the same object (fix package child-task string shape during U1). |
| `allowedActions` vocabulary | Canonical kebab set from campaign example (`edit-allowlisted-files`, `bounded-remediation`, …). Map legacy short verbs at adapter boundary only. |
| Budget defaults | Product default 10/3/3 (Cursor/Claude/remediation). Pilot campaign uses 3/2/2. |
| Push/merge/deploy | Product default `OWNER_APPROVAL_REQUIRED`. Pilot campaign may set `DENY` for push/merge/deployment. |
| Script paths | Implement under control-plane `tools/` (runbook). Package `scripts/` remain stubs until copied/aligned. |
| Mission Control APIs | Remain **read-only**. Owner pause/kill/resume via control-plane tools, not Mission Control mutation APIs. |
| Mission Control base | Extend the **owner-declared canonical** Mission Control worktree only after G1. `D:\ados-mission-control` prototypes are not accepted integration. Port fail-closed patterns as authorized; do not rebuild on Phase 1 mock UI. |
| Claude review | New headless review dispatcher; Claude may not edit during review tasks. |
| Event stream | One redacted ordered stream consumed by terminal cockpit and Mission Control. Extend `state/event-ledger.jsonl` plus per-run `evidence/supervisor-runs/<campaign-id>/<run-id>/`. |

## Feature flags (shadow → live)

```text
ADOS_SUPERVISOR_ENABLED
ADOS_SUPERVISOR_SHADOW_MODE
ADOS_CURSOR_PRIMARY_ENABLED
ADOS_AUTO_REMEDIATION_ENABLED
ADOS_CLAUDE_REVIEW_ENABLED
ADOS_LIVE_EVENT_BROKER_ENABLED
ADOS_MISSION_CONTROL_LIVE_ENABLED
ADOS_COCKPIT_AUTO_OPEN
```

Default first enablement: shadow mode on, production dispatch off until acceptance.

## Pilot success definition

Campaign: Mission Control pre-commit closure on the reconciled worktree.

- No manual message relay between Cursor and Claude.
- Cockpit and Mission Control show consistent labeled state.
- Run is fully replayable from evidence + manifest.
- Exactly one owner gate: `OWNER_ACTION_REQUIRED: Authorize local commit`.
- Push, merge, deploy, runtime promotion, new dependencies, public distribution remain blocked.

## Authorization packet (owner must supply)

Before classification can leave package-handoff and become control-plane execution-ready:

1. Disk-backed campaign JSON (schema 1.0.0+) with `status: APPROVED`.
2. Owner approval ID referenced by the campaign.
3. Exact write allowlist and pre-change hashes.
4. Budgets, expiry, kill-switch initial state.
5. Declared canonical paths (reconciliation exit).
6. Explicit authorization to leave shadow mode for the pilot.

Until then, any implementer classification must remain planning/handoff, not production dispatch.

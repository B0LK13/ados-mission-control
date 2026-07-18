# Product Brief — ADOS Mission Control

**Codename UI:** The Black Agency Command Deck  
**Phase 1 focus:** Read-only observability

## Problem

ADOS already produces leases, approvals, handoffs, evidence, checkpoints, tasks, and agent results across JSON/JSONL files, Git worktrees, and processes. Operators must manually inspect directories, PowerShell dashboards, and chat transcripts to answer basic questions: who is PRIMARY, what is blocked, what needs approval, and whether the system is healthy.

## Solution

A single operational cockpit that:

1. Aggregates authoritative ADOS state through a **read-model broker**.
2. Presents agents, tasks, approvals, handoffs, worktrees, evidence, and events in one UI.
3. Makes the authority model **visible** (Claude PRIMARY; Cursor NON-AUTHORITATIVE).
4. Defers all mutations to Phase 2+ validated command APIs (never direct `state/*` writes).

## Who it is for

| Persona | Need |
|---------|------|
| Owner | See pending approvals, system health, risk, dispatch status at a glance |
| Operator (Cursor-assisted) | Navigate workflow without digging through folders |
| Claude PRIMARY | Consume consistent status; review proposed UI/impl without lease risk |

## Phase 1 outcomes

- Home dashboard answers the nine operational questions (agents, lease, tasks, blockers, approvals, conflicts, reviews, dispatch, health).
- Modules: Agent Operations, Workflow graph (read-only), Approval Center (read-only), Task graph, Handoff Queue, Repo/Worktree Map, Evidence Explorer, Timeline, Safety monitor.
- Owner Command Center shows **previews only** of future actions (no mutations).

## Explicit non-goals (Phase 1)

- Approve / reject / withdraw approvals
- Lease transfer or Cursor PRIMARY UI
- Enabling production dispatch
- Launching workers
- Push, merge, deploy
- Writing into ADOS `state/**` or mutating leases

## Success

An owner can open Mission Control and, within seconds, know who holds the lease, what is pending, and whether the system is NOMINAL—without opening raw JSON files.

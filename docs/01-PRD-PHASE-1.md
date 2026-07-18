# PRD — ADOS Mission Control Phase 1

**Version:** 1.0.0  
**Status:** EXECUTABLE STARTER  
**Product:** ADOS Mission Control (UI title: The Black Agency Command Deck)  
**Mode:** Read-only observability

## 1. Problem statement

The ADOS control plane already emits durable operational artifacts (leases, approvals, handoffs, evidence, event ledger, worktree registry, task contracts). There is no single human-facing surface that answers live operational questions without manual file inspection or PowerShell status scripts.

## 2. Goals

1. Provide a live **home cockpit** that answers the nine questions in §5.
2. Expose modules 1–9 from the product brief as **read-only** views backed by a brokered read model.
3. Make authority explicit: Claude PRIMARY; Cursor NON-AUTHORITATIVE; no lease acquisition path in UI.
4. Deliver schemas, APIs, and an executable Next.js starter with fixture and live-read modes.
5. Preserve ADOS invariants from `docs/ORCHESTRATOR-CONTRACT.md`.

## 3. Non-goals (Phase 1)

| Non-goal | Rationale |
|----------|-----------|
| Approve / reject / withdraw | Phase 2 |
| Dispatch enablement | Owner + PRIMARY only; not Phase 1 UI |
| Worker launch | Phase 3 |
| Lease transfer / Cursor PRIMARY | Forbidden by architecture unless contract changes |
| Direct writes to `state/*` | Broker + validated commands only (Phase 2+) |
| Multi-host fleet / mobile / Grafana | Phase 4 |

## 4. Personas

| Persona | Primary jobs |
|---------|----------------|
| **Owner** | Scan health, pending approvals, blockers, dispatch status |
| **Cursor operator** | Navigate agents, handoffs, evidence, conflicts (support role) |
| **Claude PRIMARY** | Independent review of Mission Control artifacts; remains lease holder |

## 5. Home-screen acceptance criteria

The home screen **must** answer, without secondary navigation:

1. Which agents are active?
2. Who holds the authoritative lease?
3. What is each agent doing?
4. Which tasks are blocked?
5. Which approvals require owner attention?
6. Are any paths or worktrees conflicting?
7. Which reviews or integrations are waiting?
8. Is production dispatch enabled?
9. Is the system healthy? (`NOMINAL` | `NOTICE` | `ATTENTION` | `BLOCKED` | `CRITICAL`)

## 6. Functional requirements by module

### 6.1 Agent Operations

Display live cards per agent (`claude`, `cursor`, `codex`/`kimi` as present in state):

- Name, role, session identity, process status (OBSERVED)
- Current task, repository/worktree, lease or worker registration
- Last heartbeat (from authoritative lease for PRIMARY; overlay labeled NON-AUTHORITATIVE for Cursor)
- Scope / permitted actions, blockers, recent actions
- Context age / session health when available

**Cursor card must show:**

```text
NON-AUTHORITATIVE
Review and planning support
Cannot acquire orchestrator lease
```

### 6.2 Visual workflow graph

Node-based view of Owner → Claude PRIMARY → Task Assignment → Cursor/Codex → Review → Claude Validation → Owner Integration → Integration.

Edge statuses: Pending, Acknowledged, Running, Blocked, Passed, Failed, Expired, Superseded.

Node click opens: request envelope, approval ID, commit/tree, paths, evidence, commands/exit codes, ledger sequences.

Phase 1: **read-only** graph derived from ledger + handoffs + project-state.

### 6.3 Approval Center

Cards must show approval ID, action, requesting agent, exact paths, risk, preconditions, exclusions, status, evidence links.

**No vague Approve button in Phase 1.** Show “Phase 2: Approve/Reject” as disabled preview with exact consequence text.

### 6.4 Task graph and table

Statuses: Backlog, Ready, Active, Review, Conditional, Blocked, Approved, Integrated, Superseded, Withdrawn.

Fields: owner, reviewer, dependencies, allowed/prohibited paths, worktree, commit, evidence, gates, blocker class.

Sources: Cursor `.agent-control/TASK_GRAPH.json` (non-auth overlay) + ADOS handoff task contracts + project-state WPs.

### 6.5 Handoff Queue

Observe existing per-agent handoff directories. Cursor specifically uses `handoffs/cursor/inbox` and `handoffs/cursor/completed` with synchronous sentinel capture through `Invoke-CursorAgent.ps1`.

Lifecycle: Request published → Worker unavailable → Acknowledged → In progress → Result received → Validated → Archived. These are normalized UI states, not new outbox/processed/failed directories.

### 6.6 Repository and Worktree Map

Show product + orchestrator-source (+ Cursor WT) trees: branch, HEAD, tree hash, dirty/untracked, owner, signature, remote, conflicts, prunable flags.

Sources: `worktree-registry.json` + live `git worktree list` / status (OBSERVED where live).

### 6.7 Evidence Explorer

Filter by task, approval, agent, session, commit, ledger sequence. Show SHA-256, tracked vs ignored, redaction, archive links, validation output, trust indicator.

### 6.8 Timeline / Event Ledger

Render `event-ledger.jsonl` with filters (agent, task, approval, severity, repo, lease, session, event type).

### 6.9 Safety and conflict monitor

Continuous flags: path overlap, dual PRIMARY, stale heartbeat (skew-aware), untracked blockers, hash mismatch, unsigned commits, unauthorized scripts, dispatch unexpectedly ENABLED, worker without approval, ignored residue.

Severities: `NOMINAL`, `NOTICE`, `ATTENTION`, `BLOCKED`, `CRITICAL`.

### 6.10 Owner command center (Phase 1 preview only)

List future actions (approve, reject, pause, freeze, authorize worker, authorize FF integration) as **disabled** cards showing exact consequences. No mutations.

## 7. Data and architecture requirements

- Brokered read model (see `06-READ-MODEL-AND-BROKER.md`).
- Schemas under `schemas/` must validate `examples/sample-home-snapshot.json`.
- Authority field on entities: `AUTHORITATIVE` | `NON_AUTHORITATIVE` | `OBSERVED`.
- Never mirror mutable ADOS lease heartbeats into Cursor overlay as authoritative.

## 8. Recommended stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15, React, TypeScript, Tailwind, shadcn/ui, Lucide, Framer Motion |
| API | Next.js Route Handlers (Phase 1) |
| Store | SQLite read model |
| Live updates | Server-Sent Events |
| Later | PostgreSQL for multi-host; FastAPI optional |

## 9. Success metrics

| Metric | Target |
|--------|--------|
| Time to identify PRIMARY lease holder | < 3 seconds on home |
| Pending approvals visible without file browse | 100% of `handoffs/owner/approvals` + ledger |
| False “lease expired” due to clock skew alone | 0 |
| Phase 1 UI write attempts to `state/**` | 0 |

## 10. Dependencies

- Live ADOS root: `D:\agent-development-os-orchestrator`
- Orchestrator contract: `agent-development-os-orchestrator-source/docs/ORCHESTRATOR-CONTRACT.md`
- Existing CLI parity: `Show-OrchestratorDashboard.ps1`, `Show-OrchestratorStatus.ps1`
- Cursor non-auth worktree overlay (labeled, not authoritative)

## 11. Open risks

| Risk | Mitigation |
|------|------------|
| WSL/Windows clock skew | Skew policy in broker; prefer process liveness + `expiresAt` on application clock |
| Ignored evidence under `evidence/` gitignore | Evidence index + on-disk scan |
| Dual control-plane copies (main vs Cursor WT) | Worktree map + conflict monitor |
| Stale CURRENT-STATE-HANDOFF narratives | Prefer lease + ledger + project-state |

## 12. Exit criteria for the Phase 1 starter

- [x] Spec package present under `/mnt/d/ADOS Mission Control`
- [ ] Sample snapshot validates against schemas
- [x] Owner authorized the Next.js starter build

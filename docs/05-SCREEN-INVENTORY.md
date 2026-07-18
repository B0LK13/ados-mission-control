# Screen Inventory — Phase 1

**Brand:** The Black Agency Command Deck  
**Product:** ADOS Mission Control

## S0 — Home (`/`)

**Purpose:** Answer the nine operational questions in one composition.

**Components:**
- `CommandDeckHeader` (brand + SYSTEM severity)
- `MetricStrip` (PRIMARY, ACTIVE AGENTS, APPROVALS, BLOCKERS)
- `LiveWorkflowStrip` (Owner → Claude → Cursor/Codex)
- `PendingApprovalsPanel`
- `RecentEventsPanel`
- `FooterRiskStrip` (Risk, Dispatch, Remote)

**Data:** `GET /api/v1/snapshot`  
**Empty:** no approvals / no alerts messages  
**Authority:** PRIMARY badge AUTHORITATIVE; Cursor chip NON-AUTHORITATIVE

## S1 — Agents (`/agents`)

**Components:** `AgentCardGrid`, `AgentDetailDrawer`  
**Data:** `GET /api/v1/agents`  
**Cursor card mandatory copy:** NON-AUTHORITATIVE · Cannot acquire orchestrator lease

## S2 — Workflow (`/workflow`)

**Components:** `WorkflowCanvas`, `NodeInspector`  
**Data:** `GET /api/v1/workflow`  
**Edges:** status colors for Pending…Superseded  
**Phase 1:** read-only; no drag-to-dispatch

## S3 — Approvals (`/approvals`)

**Components:** `ApprovalCardList`, `ApprovalConsequencePanel`  
**Data:** `GET /api/v1/approvals`  
**Must show:** willDo / willNotDo / paths / risk  
**Buttons:** Approve/Reject **disabled** with “Phase 2” tooltip

## S4 — Tasks (`/tasks`)

**Components:** `TaskDependencyGraph`, `TaskTable`  
**Data:** `GET /api/v1/tasks`  
**Columns:** id, status, owner, reviewer, paths, worktree, gates, blockers

## S5 — Handoffs (`/handoffs`)

**Components:** `HandoffQueue`, `LifecycleStepper`  
**Data:** `GET /api/v1/handoffs`  
**Filters:** from/to agent, lifecycle stage

## S6 — Repos (`/repos`)

**Components:** `RepoTree`, `WorktreeTable`, `DirtyFileList`  
**Data:** `GET /api/v1/worktrees`  
**Show:** clean/dirty, untracked, ignored residue, owner, remote none

## S7 — Evidence (`/evidence`)

**Components:** `EvidenceFilters`, `EvidenceTable`, `TrustIndicator`, `HashVerifyButton`  
**Data:** `GET /api/v1/evidence`, verify-hash POST (read-only recompute)

## S8 — Timeline (`/timeline`)

**Components:** `EventTimeline`, `EventFilters`, `EventDetail`  
**Data:** `GET /api/v1/events`, SSE `events/stream`

## S9 — Safety (`/safety`)

**Components:** `AlertList`, `SeverityBadge`, `DetectorLegend`  
**Data:** `GET /api/v1/safety/alerts`  
**Severities:** NOMINAL → CRITICAL

## S10 — Owner (`/owner`) Phase 1 preview

**Components:** `OwnerActionPreviewCard` (disabled)  
**Actions listed (no execution):** Approve, Reject, Request evidence, Pause agent, Freeze task, Authorize worker, Authorize FF integration, Withdraw approval, Archive workflow  
Each card shows exact consequences text.

## Shared components

- `AuthorityBadge`
- `SeverityChip`
- `LeaseExpiryCountdown` (skew-aware; never false-expire)
- `PathList`
- `CopyIdButton`
- `StaleSnapshotBanner`

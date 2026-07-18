# Data Model — ADOS Mission Control

**Phase:** 1 read model  
**Authority tags:** every entity carries `authority`: `AUTHORITATIVE` | `NON_AUTHORITATIVE` | `OBSERVED`

## 1. Entity overview

| Entity | Purpose |
|--------|---------|
| `MissionSnapshot` | Aggregated home payload |
| `SystemHealth` | Global severity + chips |
| `LeaseView` | PRIMARY lease projection |
| `AgentCard` | Per-agent operations card |
| `ApprovalCard` | Owner approval projection |
| `TaskNode` | Task graph node |
| `HandoffItem` | Agent-to-agent handoff |
| `WorktreeNode` | Repo/worktree map node |
| `EvidenceItem` | Evidence explorer row |
| `EventItem` | Ledger timeline row |
| `ConflictAlert` | Safety monitor alert |

JSON Schemas live in `../schemas/`.

## 2. Source mapping

| Entity field group | Raw source |
|--------------------|------------|
| LeaseView | `state/orchestrator-lease.json` |
| SystemHealth.dispatch / freezes | `state/orchestrator-failover-state.json` |
| AgentCard (ADOS sessions) | `state/agent-sessions.json` |
| AgentCard Cursor overlay | Cursor WT `.agent-control/AGENT_LEASES.json` → `NON_AUTHORITATIVE` |
| EventItem | `state/event-ledger.jsonl` |
| ApprovalCard | `state/approvals.jsonl` + `handoffs/owner/approvals/*.json` |
| HandoffItem | `handoffs/{claude,cursor,kimi,owner,wave-0}/**` |
| WorktreeNode | `state/worktree-registry.json` + live git (OBSERVED) |
| Project phase strip | `state/project-state.json` |
| TaskNode | Cursor `TASK_GRAPH.json` (NON_AUTHORITATIVE) + handoff task JSON |
| EvidenceItem | `evidence/**`, reports, package hashes |
| Process liveness | Windows process table for lease PID → OBSERVED |

## 3. Core types (logical)

### SystemHealth
- `severity`: NOMINAL | NOTICE | ATTENTION | BLOCKED | CRITICAL
- `dispatchEnabled`: boolean (from failover `productionDispatch`)
- `remoteConfigured`: boolean
- `riskLevel`: LOW | MEDIUM | HIGH | CRITICAL
- `primaryAgent`, `primaryLeaseId`
- `activeAgentCount`, `pendingApprovalCount`, `blockerCount`
- `snapshotAt`, `sourceHashes[]`

### LeaseView
- `leaseId`, `sessionId`, `orchestrator`, `mode`, `state`
- `hostIdentity`, `processId`
- `acquiredAt`, `heartbeatAt`, `expiresAt`
- `ownerApprovalRef`, `priorLeaseId`
- `authority`: always `AUTHORITATIVE` for ADOS lease
- `processLiveness`: OBSERVED `{ alive, checkedAt, startTimeUtc? }`
- **Invariant:** UI must not treat Cursor overlay as this object.

### AgentCard
- `agentId`, `displayName`, `role`, `authority`
- `sessionIdentity`, `status`, `frozen`
- `currentTask`, `worktree`, `branch`
- `registration` (lease id or worker registration)
- `heartbeatLabel` (humanized; PRIMARY from LeaseView)
- `permittedActions[]`, `prohibitedActions[]`
- `blockers[]`, `recentActions[]`
- Cursor-specific flags: `cannotAcquireOrchestratorLease: true`

### ApprovalCard
- `approvalId`, `action`, `status`, `issuedAt`, `expiresAt`
- `issuedBy`, `requestingAgent`, `justification`
- `target` (structured), `affectedPaths[]`
- `willDo[]`, `willNotDo[]`, `preconditions[]`, `riskLevel`
- `evidenceRefs[]`, `authority`: AUTHORITATIVE

### TaskNode
- `taskId`, `objective`, `status`, `owner`, `reviewer`
- `dependencies[]`, `allowedPaths[]`, `prohibitedPaths[]`
- `worktree`, `branch`, `commit`, `leaseId`
- `requiredGates[]`, `evidencePaths[]`, `blockerClass`
- `authority` (overlay vs handoff contract)

### HandoffItem
- `handoffId`, `fromAgent`, `toAgent`, `title`, `status`
- `path`, `sha256?`, `expiresAt?`, `taskId?`
- `lifecycleStage` enum

### WorktreeNode
- `repoId`, `pathWindows`, `pathWsl`, `role`
- `branch`, `head`, `tree`, `dirty`, `untracked[]`
- `ownerAgent?`, `prunable?`, `remote`, `signatureStatus`
- `authority`: mix of AUTHORITATIVE registry + OBSERVED git

### EvidenceItem
- `evidenceId`, `path`, `sha256`, `creator`, `createdAt`
- `relatedTaskId`, `relatedLeaseId`, `trackedState`
- `redactionStatus`, `trustFlags[]`

### EventItem
- `sequence`, `timestamp`, `eventType`, `severity`
- `summary`, `taskId`, `sessionId`, `orchestratorLeaseId`
- `actor`, `provider`, `content` (redacted), `authority`: AUTHORITATIVE

### ConflictAlert
- `alertId`, `severity`, `code`, `message`
- `relatedPaths[]`, `relatedAgents[]`, `detectedAt`
- `recommendedAction` (informational in Phase 1)

### MissionSnapshot
- Composes SystemHealth + LeaseView + AgentCard[] + ApprovalCard[] (pending) + EventItem[] (recent) + ConflictAlert[] + workflow summary

## 4. Invariants

1. Only one `LeaseView` with `authority=AUTHORITATIVE` and `mode=PRIMARY`.
2. Cursor cards never set `cannotAcquireOrchestratorLease` to false.
3. No entity may copy ADOS `heartbeatAt` into NON_AUTHORITATIVE overlay as live truth.
4. Maker ≠ checker on TaskNode when both present.
5. Secrets never appear in serialized snapshots (redaction required).

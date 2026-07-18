# Information Architecture — ADOS Mission Control

**UI brand:** The Black Agency Command Deck  
**Phase:** 1 (read-only)

## 1. Primary navigation

| Route | Label | Purpose |
|-------|-------|---------|
| `/` | Home | Cockpit: health, PRIMARY, agents, approvals, blockers, workflow strip |
| `/agents` | Agents | Agent Operations cards |
| `/workflow` | Workflow | Node graph + edge statuses |
| `/approvals` | Approvals | Approval Center |
| `/tasks` | Tasks | Graph + table |
| `/handoffs` | Handoffs | Inbox/outbox queue |
| `/repos` | Repos | Repository & worktree map |
| `/evidence` | Evidence | Evidence explorer |
| `/timeline` | Timeline | Event ledger |
| `/safety` | Safety | Conflict / risk monitor |
| `/owner` | Owner | Phase 1: read-only action previews |

Global chrome (all pages):

- Product mark: **ADOS Mission Control**
- Brand subtitle: **The Black Agency Command Deck**
- System health chip: severity enum
- PRIMARY chip: agent + lease id short
- Dispatch chip: `ENABLED` | `DISABLED`
- Authority reminder: Cursor NON-AUTHORITATIVE (cannot acquire lease)

## 2. Hierarchy

```text
Home
├── Agents → Agent detail (/agents/{agentId})
├── Workflow → Node detail drawer
├── Approvals → Approval detail (/approvals/{approvalId})
├── Tasks → Task detail (/tasks/{taskId})
├── Handoffs → Handoff detail (/handoffs/{handoffId})
├── Repos → Worktree detail (/repos/{repoId}/worktrees/{wtId})
├── Evidence → Evidence detail (/evidence/{evidenceId})
├── Timeline → Event detail (/events/{sequence})
├── Safety → Alert detail (/safety/{alertId})
└── Owner → Preview cards only (Phase 1)
```

## 3. Deep links

| Pattern | Resolves |
|---------|----------|
| `/approvals/{approvalId}` | Owner approval JSON + ledger refs |
| `/tasks/{taskId}` | Task node from overlay and/or handoff contract |
| `/events/{sequence}` | Single ledger event |
| `/leases/primary` | Redirect to Agents focused on PRIMARY |
| `/handoffs/{agent}/{name}` | File-backed handoff artifact |

Query params (common): `?severity=`, `?agent=`, `?taskId=`, `?from=`, `?to=`, `?q=`.

## 4. Home composition rules (first viewport)

One composition—not a dense multi-widget dashboard soup:

1. Brand / product name dominant.
2. One system status line (`SYSTEM: NOMINAL` etc.).
3. Four summary metrics: PRIMARY, ACTIVE AGENTS, APPROVALS pending, BLOCKERS.
4. Live agent workflow strip (Owner → Claude → Cursor/Codex).
5. Below fold / secondary: pending approvals list + recent events.
6. Footer strip: Risk, Dispatch, Remote.

Motion: subtle status pulse, workflow edge transitions, timeline insert—no decorative noise.

## 5. Empty / error / stale states

| State | Behavior |
|-------|----------|
| ADOS root unreachable | Full-page ATTENTION; show last successful snapshot age |
| Lease file missing | CRITICAL; block “healthy” claim |
| Partial module failure | Module-level error; rest of cockpit remains |
| Stale broker (> skew tolerance without process proof) | NOTICE on freshness; do not auto-expire PRIMARY |
| No pending approvals | Empty illustration + “None pending” |
| Cursor overlay absent | Agents still show Claude from ADOS; Cursor card OBSERVED/missing |

## 6. Authority badges (always visible)

| Badge | Meaning |
|-------|---------|
| `AUTHORITATIVE` | From ADOS lease / failover / ledger |
| `NON-AUTHORITATIVE` | Cursor overlay / local registration |
| `OBSERVED` | Process table, live git status |

Never present Cursor as PRIMARY or lease-capable.

## 7. Accessibility

- Keyboard nav for graph nodes and approval cards.
- Contrast for severity chips.
- Prefer text labels over color-only status.

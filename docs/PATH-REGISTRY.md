# Path registry — canonical trees (FBL-DX-001 / FBL-DOC-001)

Use this map when choosing roots, writing docs, or configuring Mission Control.  
Stale `D:\Topics\…` relocation targets are **not** canonical unless an owner gate redeclares them.

## Mission Control

| Role | Canonical path (Windows) | WSL mount |
| --- | --- | --- |
| **Mission Control V2 (this repo)** | `D:\ados-mission-control` | `/mnt/d/ados-mission-control` |
| Foundation / mock cockpit (separate) | `D:\agent-development-os-mission-control` | `/mnt/d/agent-development-os-mission-control` |
| Live-integration worktree (pilot) | `D:\agent-development-os-mission-control-cursor-live-integration` | `/mnt/d/agent-development-os-mission-control-cursor-live-integration` |
| Planning package (this repo subtree) | `D:\ados-mission-control\ados-mission-control-update-package` | same under `/mnt/d/…` |

Mission Control V2 is **read-only observability**. It is not a substitute for the control-plane supervisor and must not write `state/**`.

## ADOS control plane

| Role | Canonical path (Windows) | WSL mount |
| --- | --- | --- |
| **Runtime orchestrator** (leases, state, handoffs, evidence) | `D:\agent-development-os-orchestrator` | `/mnt/d/agent-development-os-orchestrator` |
| Orchestrator **source** (tools/schemas under Topics layout) | `D:\agent-development-orchestrator\orchestrators\agent-development-os-orchestrator-source` | `/mnt/d/agent-development-orchestrator/orchestrators/agent-development-os-orchestrator-source` |
| Cursor overlay worktree | `D:\agent-development-orchestrator\orchestrators\agent-development-os-orchestrator-source-cursor` | `/mnt/d/agent-development-orchestrator/orchestrators/agent-development-os-orchestrator-source-cursor` |
| ADOS product root | `D:\agent-development-os` | `/mnt/d/agent-development-os` |

Legacy bare trees that may still exist on disk but must **not** be preferred by new config:

- `D:\agent-development-os-orchestrator-source`
- `D:\agent-development-os-orchestrator-source-cursor`
- `D:\Topics\orchestrators\…` (missing / non-canonical relocation target)

`lib/config.ts` resolves live defaults with these preferences and skips the stale markers above.

## Environment overrides

| Variable | Meaning |
| --- | --- |
| `ADOS_CONTROL_PLANE_ROOT` / `ADOS_ORCHESTRATOR_ROOT` | Runtime control-plane root |
| `ADOS_SOURCE_ROOT` | Orchestrator source tree |
| `ADOS_CURSOR_WORKTREE` | Cursor overlay worktree |
| `ADOS_PRODUCT_ROOT` | ADOS product root |
| `MISSION_CONTROL_DATA_ROOT` | App-owned SQLite / cache (writable) |

## Authority reminder

- Claude remains PRIMARY when the live lease says so.
- Cursor is always NON-AUTHORITATIVE in Mission Control rendering.
- Control-plane mutation and supervisor activation remain outside this UI and require cleared owner gates / healthy lease.

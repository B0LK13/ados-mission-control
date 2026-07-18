# Cursor Mission — ADOS Mission Control Phase 1 Implementation

**Mission ID:** `MC-P1-IMPLEMENT-001`  
**Spec package root:** `D:\ADOS Mission Control` / `/mnt/d/ADOS Mission Control`  
**Mode after owner approval of specs:** Superseded by the owner-authorized executable starter in this package. Retained as historical planning context.

## 1. Objective

Bootstrap and implement **Phase 1 read-only** ADOS Mission Control (UI title: The Black Agency Command Deck) per the specs in this package:

- Home cockpit + modules Agents, Workflow, Approvals (read-only), Tasks, Handoffs, Repos, Evidence, Timeline, Safety
- Broker + SQLite read model + REST/SSE APIs
- No writes to ADOS `state/**`, no lease mutation, no dispatch enablement

## 2. Proposed app repository (create when authorized)

```text
D:\ados-mission-control\
```

Do **not** place the Next.js app inside the generated orchestrator or inside this spec folder unless Owner explicitly redirects.

## 3. Roles

| Role | Agent |
|------|-------|
| Implementer | Cursor (or Codex under Cursor task lease) |
| Independent reviewer | Claude PRIMARY |
| Approver of protected ops | Owner |

Maker ≠ checker. Cursor cannot self-approve.

## 4. Allowed paths (implementation phase)

When app repo exists:

- `ados-mission-control/**` (app source)
- Read-only consume: `D:\agent-development-os-orchestrator\**` (no writes)
- Read-only: Cursor WT `.agent-control` overlay as NON_AUTHORITATIVE input
- Spec package: `D:\ADOS Mission Control\**` (reference; avoid churn unless documenting gaps)

## 5. Prohibited

- Write `orchestrator-lease.json` or any ADOS `state/*`
- Acquire/renew/release/supersede orchestrator lease
- Enable production dispatch
- Launch workers
- Implement Phase 2 approve/reject routes as functional
- Push/merge/deploy without owner authorization
- Imply Cursor PRIMARY in UI copy

## 6. Stack

Next.js 15 · React · TypeScript · Tailwind · shadcn/ui · Lucide · Framer Motion · SQLite · SSE

## 7. Implementation sequence

1. Scaffold Next.js app with TypeScript + Tailwind + shadcn.
2. Implement config for ADOS roots (env).
3. Build ingest workers per `docs/06-READ-MODEL-AND-BROKER.md`.
4. Implement `GET /api/v1/*` read routes per `docs/04-API-DESIGN.md`.
5. Build Home per `docs/05-SCREEN-INVENTORY.md` S0 (brand-first Command Deck).
6. Build remaining Phase 1 screens.
7. Wire SSE.
8. Validate `examples/sample-home-snapshot.json` against schemas; add fixture mode.
9. Live mode against ADOS read-only paths.
10. Produce evidence pack: commands, exit codes, screenshots optional, hash list.

## 8. Acceptance gates

| Gate | Criteria |
|------|----------|
| G0 | Spec schemas validate sample snapshot |
| G1 | Home answers nine PRD questions from live or fixture snapshot |
| G2 | Cursor card shows NON-AUTHORITATIVE + cannot acquire lease |
| G3 | PRIMARY lease only from ADOS lease file |
| G4 | No code path writes ADOS `state/**` (grep + review) |
| G5 | Phase 2 mutation routes absent or hard `501` |
| G6 | Claude independent review PASS or CONDITIONAL |
| G7 | Owner acknowledgment before any network publish |

## 9. Evidence to collect

- `npm`/`pnpm` install + build exit codes
- Broker ingest log sample (redacted)
- `GET /api/v1/snapshot` response hash
- Schema validation output
- Grep proof of no state writers
- Reviewer verdict file path

## 10. Stop conditions

- Would require lease mutation or dispatch enablement
- Would write outside allowed app/spec paths
- Ambiguous path ownership with Claude-reserved files
- Owner or PRIMARY orders freeze

## 11. Handoff back to PRIMARY

Deliver implementation evidence to Claude for independent review. Do not claim production readiness without G6+G7.

---

**Spec package delivery status:** Specs created under `/mnt/d/ADOS Mission Control`.  
**This mission:** Execute only after Owner/PRIMARY acceptance of the Phase 1 spec package.

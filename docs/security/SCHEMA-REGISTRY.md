# Schema registry — ADOS input families

**Status:** Active (expanded 2026-07-19)  
**Code:** `lib/ingestion/schema-registry.ts`  
**JSON Schema archive:** `schemas/input/v2/*.schema.json`

## Principles

1. **Warn, never rewrite.** Invalid or unsupported-version records stay in the ingest stream as `INVALID_RECORD` warnings. Mission Control does not drop, invent, or “fix up” authoritative fields.
2. **No silent authority upgrades.** Schema acceptance does not change `AUTHORITATIVE` / `OBSERVED` / `NON_AUTHORITATIVE` labels — those come from broker normalization rules.
3. **Allowlisted families only.** Unknown document kinds are not silently mapped into lease/approval truth.

## Allowlisted families

| Kind | Typical sources | Required identity |
|------|-----------------|-------------------|
| `ledger-event` | `state/event-ledger.jsonl` | `sequence` or legacy `eventId` + event type |
| `approval-disposition` | `state/approvals.jsonl` | `approvalId` / `id` |
| `approval-consumption` | `state/approval-consumptions.jsonl` | `approvalId` / `id` |
| `approval-file` | `handoffs/owner/approvals/*.json` | `approvalId` / `id` |
| `orchestrator-lease` | `state/orchestrator-lease.json` | `leaseId` + orchestrator/provider |
| `agent-sessions` | `state/agent-sessions.json` | `sessions` object |
| `project-state` | `state/project-state.json` | non-empty object (soft) |
| `worktree-registry` | `state/worktree-registry.json` | `worktrees` array when present |
| `dispatch-state` | `state/wave-0-dispatch-state.json` | object (soft) |
| `task-contract` | `handoffs/*/inbox/*.json` | `taskId` / `id` |
| `campaign` | `state/campaigns/**`, `campaigns.jsonl` | `campaignId` / `id` |
| `owner-gate` | `owner-gates.jsonl`, `handoffs/owner/inbox` | `gateId` / `id` |

Supported `schemaVersion` values: `legacy-v1`, `1` / `1.0` / `1.0.0`, `1.1` / `1.1.0`, `2` / `2.0` / `2.0.0`. Others emit an unsupported-version warning.

## Validation entry points

- Live broker: `getMissionSnapshot()` in `lib/broker/snapshot.ts`
- Unit tests: `tests/schema-registry.test.ts`
- JSON Schema compile check: `npm run validate:schemas`

## Out of scope

Historical one-off ADOS documents outside the table above remain unregistered. They may still be parsed opportunistically by specialized loaders; they must not be treated as lease/approval authority solely because JSON parsed successfully.

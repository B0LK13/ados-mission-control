# Synchronous Dispatch Adaptation

**Decision:** Mission Control observes the existing ADOS dispatch protocol. It does not introduce a second asynchronous inbox/outbox/processed/failed lifecycle.

## Evidence from the live control plane

The existing implementation already defines:

- Task contracts under `handoffs\cursor\inbox\*.json`
- Results under `handoffs\cursor\completed\*.json` and `*.md`
- Contract validation through `config\schemas\task-contract.schema.json`
- Result validation through `config\schemas\task-result.schema.json`
- Synchronous worker invocation through `adapters\Invoke-CursorAgent.ps1`
- Structured acknowledgement sentinel `CURSOR_TASK_ACKNOWLEDGED`
- Structured completion sentinel `CURSOR_TASK_COMPLETED`

No Cursor outbox, processed, or failed directories are part of the current protocol.

## Mission Control lifecycle

```text
Task contract published to cursor/inbox
        ↓
Invoke-CursorAgent.ps1 starts an explicitly approved worker
        ↓
CURSOR_TASK_ACKNOWLEDGED is captured and validated
        ↓
Worker runs within its bounded contract
        ↓
CURSOR_TASK_COMPLETED is captured and validated
        ↓
Result JSON and Markdown appear in cursor/completed
        ↓
Independent checker validates the candidate
```

Mission Control Phase 1 observes those states from files and the event ledger. It does not invoke the adapter, consume an approval, launch Cursor, or write a handoff result.

## Maker/checker rule

An agent cannot independently certify its own candidate. Cursor-authored work requires a separate reviewer or certifier. The UI therefore displays implementer and independent reviewer as distinct task fields and never presents Cursor as the final authority over Cursor output.

## Starter read model

The starter normalizes a fresh snapshot in memory for each REST request and SSE update. This deliberately avoids introducing a local write-capable database during the first executable package. SQLite remains the planned Phase 1 persistence adapter once ingest watermarks, replay, and file-watch recovery are implemented.

## Safety boundary

The application source is audited for filesystem writers, child-process launchers, and references to dispatch adapters. Protected owner operations remain disabled previews. No raw ADOS state mutation route exists.

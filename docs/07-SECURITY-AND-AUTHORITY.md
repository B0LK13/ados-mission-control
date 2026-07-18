# Security and Authority — ADOS Mission Control

## 1. Contract alignment

Mission Control must obey `agent-development-os-orchestrator-source/docs/ORCHESTRATOR-CONTRACT.md`:

- Owner sets priorities and protected-action approvals.
- Active orchestrator (Claude PRIMARY) is sole control-plane writer and lease holder.
- Workers (Cursor/Codex/Kimi per contract roles) cannot acquire an orchestrator lease.
- Structured acknowledgments and evidence required; process start ≠ completion.

## 2. UI authority rules

| Rule | Requirement |
|------|-------------|
| PRIMARY display | Only from ADOS `orchestrator-lease.json` |
| Cursor badge | Always `NON-AUTHORITATIVE`; show “Cannot acquire orchestrator lease” |
| No handover UX | No “Become PRIMARY” / “Take lease” / “Transfer authority” actions in Phase 1–3 product UI |
| Overlay | Cursor `.agent-control` is support data; never authoritative for lease liveness |
| Self-approval | UI never presents Cursor as final approver of Cursor output |

## 3. Data protection

- Redact secrets in API and UI (tokens, PEM, connection strings).
- Do not render raw environment credential files.
- Evidence trust panel must not require downloading unredacted secrets.
- Logs: no authorization headers.

## 4. Trust indicator (Evidence)

Example high confidence:

```text
Evidence confidence: HIGH
✓ Commit signed
✓ Tree verified
✓ Independent review passed
✓ Package hash verified
✓ No scope violation detected
```

Missing checks lower confidence; never invent PASS.

## 5. Attack / misuse considerations

| Misuse | Mitigation |
|--------|------------|
| UI writes raw state | Phase 1 read-only; no write routes |
| Spoofed PRIMARY | Single AUTHORITATIVE lease source + process OBSERVED |
| Click-ops without audit | Phase 2 requires approval records via ADOS tools |
| Path escape in evidence viewer | Allowlist under ADOS + Cursor WT roots |

## 6. Local deployment trust

Phase 1 assumes trusted operator on localhost. Multi-user auth is Phase 4+.

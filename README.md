# ADOS Mission Control

**Interface:** The Black Agency Command Deck  
**Release:** 2.0.0 internal staging  
**Operating mode:** Authenticated, persistent read-only observability

ADOS Mission Control is a local operational cockpit for the Agent Development OS control plane. It turns authoritative leases, task contracts, approvals, handoffs, worktrees, evidence metadata, and the event ledger into one live view without writing to ADOS state.

> Mission Control V2 provides authenticated, resilient visibility only. It does not authorize, approve, dispatch, or mutate ADOS operations.

## Naming and related trees

| Tree | Role |
| --- | --- |
| `D:\ados-mission-control` / `/mnt/d/ados-mission-control` | **Canonical Mission Control V2** read-only UI + broker/SSE (this repository). |
| `Topics\orchestrators\agent-development-os-mission-control*` | Separate/older Mission Control experiments or live-integration worktrees. Not a substitute for this V2 tree unless an owner gate redeclares paths. |
| `ados-mission-control-update-package/` | Planning package for Cursor-First Supervisor V1 (`executionAuthorization: false` until G0–G7 clear). |

Cursor-First supervisor dispatch, policy, and kill switches belong in the ADOS control plane. This UI only observes campaigns, owner gates, budgets, and replay over GET APIs.

## Opening a run replay

Replay is **GET-only** and redacts secrets before returning event summaries.

```http
GET /api/v1/replay?campaignId=<campaignId>&runId=<runId>
```

- Reads `evidence/supervisor-runs/<campaignId>/<runId>/` under the configured control-plane root.
- Missing or out-of-root runs return `freshness: "UNAVAILABLE"` (HTTP 404) with an empty `events` list — never a fabricated timeline.
- Events are sorted by `timestamp`, then `sequence`.
- Example against a local fixture root:

```bash
ADOS_CONTROL_PLANE_ROOT=./tests/fixtures/ados \
  curl -s "http://127.0.0.1:3000/api/v1/replay?campaignId=campaign-replay-001&runId=run-replay-001"
```

## Local development

```powershell
Set-Location -LiteralPath 'D:\ados-mission-control'
npm install
npm run dev
```

Or launch with:

```powershell
& 'D:\ados-mission-control\scripts\Start-MissionControl.ps1' -Mode auto -Port 3000
```

Open `http://localhost:3000`.

### WSL + `/mnt/d` native-FS workaround

Next.js (Turbopack/webpack) and native addons such as `lightningcss` frequently hang or crash when the project lives on the Windows drive mounted at `/mnt/d/...` (9p/DrvFs). Prefer one of:

```bash
# Option A — work on a Linux-native clone (recommended)
rsync -a --exclude node_modules --exclude .next /mnt/d/ados-mission-control/ ~/src/ados-mission-control/
cd ~/src/ados-mission-control
npm ci
npm run dev

# Option B — build in /tmp then copy artifacts back if needed
cp -a /mnt/d/ados-mission-control /tmp/ados-mission-control
cd /tmp/ados-mission-control && rm -rf node_modules .next && npm ci && npm run build
```

If `lightningcss` / native binding errors appear after moving trees, delete `node_modules` and reinstall on the Linux filesystem (`npm ci`) so the correct platform binary is fetched. Prefer Windows-native `pwsh` + `D:\ados-mission-control` when you need the control-plane scripts that expect Windows paths.

## Internal staging

The preferred deployment is the hardened Compose configuration in `docker-compose.staging.yml`. It binds only to `127.0.0.1`, requires Basic authentication from an ignored secret file, mounts ADOS `state`, `handoffs`, and `evidence` read-only, and gives only the application-owned SQLite cache a writable volume.

Generate the local credential file once before staging:

```powershell
npm run auth:generate
```

If the Docker daemon is unavailable, use the documented production-process fallback:

```powershell
npm run build
npm run start:staging
```

The internal URL is `http://127.0.0.1:3100`; the safe health endpoint is `GET /api/health`. See `DEPLOYMENT.md` for Docker, verification, restart, and rollback instructions.

## Modes

| Mode | Behavior |
| --- | --- |
| `auto` | Reads the configured ADOS root and reports truthful unavailability when it cannot be reached. |
| `live` | Requires the configured ADOS root; reports degraded health when it is unavailable. |
| `fixture` | Uses `examples/sample-home-snapshot.json` for demonstrations and tests. |

Copy `.env.example` to `.env.local` only when the default `D:\` paths need to change.

## Authority invariants

- Claude remains the sole `PRIMARY` lease holder when the live lease says so.
- Cursor is always rendered `NON-AUTHORITATIVE` and cannot acquire the orchestrator lease.
- Mission Control never writes `state/**` from Next.js handlers; Phase 2 mutations go only through allowlisted `scripts/ados-tools/*`.
- Lease transfer, Cursor PRIMARY, push/merge/deploy remain forbidden. Phase 3 approved-only prepare/queue is opt-in via `MISSION_CONTROL_PHASE3_COMMANDS=enabled`.
- Approve/reject/withdraw and signed owner-gate decide are opt-in behind `MISSION_CONTROL_PHASE2_COMMANDS=enabled` (see `docs/authorizations/phase2-owner-commands-20260719.md`).
- Cursor dispatch is modeled from the existing synchronous `Invoke-CursorAgent.ps1` protocol: task contract in `handoffs\cursor\inbox`, live acknowledgement/completion sentinels, result in `handoffs\cursor\completed`.
- Cursor cannot independently certify its own output; the checker remains a separate agent.

## V2 capabilities

- Live home cockpit with primary lease, agents, approvals, blockers, dispatch, and system health
- Agent authority cards and workflow strip
- Task and handoff views aligned to current ADOS contracts
- Worktree registry and evidence metadata views
- Event timeline and safety alerts
- GET-only supervisor run replay UI at `/replay`
- Read-only REST endpoints under `/api/v1`
- Server-Sent Events at `/api/v1/events/stream` with client reconnect
- Versioned legacy/V2 ingestion validation with isolated per-record warnings
- Redacted SQLite snapshot cache and per-source ingest watermarks under `MISSION_CONTROL_DATA_ROOT`
- Blocked, visibly stale cache recovery when the external ADOS source disappears
- Basic-auth staging protection with fail-closed configuration and probe-safe health endpoints
- Metadata-only task/approval evidence correlation with explicit confidence and verification labels
- Fixture mode, schema validation, unit tests, lint, typecheck, build, and read-only source audit

## API

`snapshot`, `health`, `agents`, `approvals`, `tasks`, `handoffs`, `worktrees`, `evidence`, `events`, `events/stream`, `safety/alerts`, `workflow`, `campaigns`, `owner-gates`, `replay`, `evidence-diff`, `dead-letter`, and `support-bundle` are available below `/api/v1`.

When Phase 2 commands are enabled: `POST /api/v1/approvals/:id/{approve|reject|withdraw}` and `POST /api/v1/owner-gates/:id/{challenge|decide}`.

### Evidence diff (run compare)

```http
GET /api/v1/evidence-diff?campaignId=<id>&leftRunId=<id>&rightRunId=<id>
```

Compares two supervisor-run chronologies under one campaign. Secrets are redacted. If either run is missing, freshness is not `CACHED` and no fabricated structural entries are returned. UI: `/evidence-diff`.

### Support bundle (diagnostics)

`GET /api/v1/support-bundle` downloads a redacted JSON diagnostics pack (health, freshness, parse warnings, path configuration — never auth secrets). Use the footer **Download support bundle** control in the UI, or:

```bash
curl -fsS -OJ "http://127.0.0.1:3000/api/v1/support-bundle"
```

Canonical control-plane and mount paths are listed in `docs/PATH-REGISTRY.md`.

By default mutation routes return `405 READ_ONLY_V2`. Owner-authorized Phase 2 command routes are documented above and remain disabled unless explicitly enabled.

## Verify

```powershell
npm run verify
npm run test:e2e
npm run test:a11y
```

The verification runner executes schema validation, the read-only source audit, lint, type checking, 24 unit/security tests, and a production build as separate argv-based subprocesses. The independent Playwright command adds desktop/mobile/authentication integration checks plus an axe-core accessibility project (`live-a11y`) that fails on serious/critical WCAG violations for overview, tasks, campaigns, and replay.

## Documentation

- `ARCHITECTURE.md` — read-model boundaries, normalization, pages, and data flow
- `SECURITY.md` — read-only enforcement, redaction, mount policy, and limitations
- `DEPLOYMENT.md` — internal staging, health, restart, evidence, and rollback
- `docs/PATH-REGISTRY.md` — canonical trees and path overrides (use before inventing roots)
- `docs/` — detailed product and protocol specifications

## Package map

| Path | Purpose |
| --- | --- |
| `app/` | Next.js application and read-only API routes |
| `components/` | Command Deck interface |
| `lib/broker/` | Safe filesystem ingestion, normalization, and stale recovery |
| `lib/ingestion/` | Versioned input-schema registry |
| `lib/read-model/` | App-owned SQLite snapshot cache and watermarks |
| `schemas/` | Output and versioned input JSON Schemas |
| `examples/` | Fixture snapshot |
| `docs/` | PRD, architecture, security, screens, and roadmap |
| `missions/` | Original implementation mission |
| `scripts/` | Launcher and verification utilities |
| `tests/` | Broker and redaction tests |
| `evidence/verification/` | Foundation verification evidence |
| `evidence/deployment/` | Preserved V1 deployment evidence |
| `evidence/deployment-v2/` | V2 deployment evidence, screenshots, and SHA-256 manifest |

## Source roots

Canonical defaults (see workspace `docs/PATH-REGISTRY.md`). Stale bare
`D:\agent-development-os-orchestrator-source` paths must not be used.

| Purpose | Default path |
| --- | --- |
| Live orchestrator (runtime) | `D:\agent-development-os-orchestrator` |
| Orchestrator source | `D:\agent-development-orchestrator\orchestrators\agent-development-os-orchestrator-source` |
| Cursor overlay worktree | `D:\agent-development-orchestrator\orchestrators\agent-development-os-orchestrator-source-cursor` |
| ADOS product | `D:\agent-development-os` |

Cockpit identity: this tree is **Mission Control v2 (live broker)**. The foundation/mock cockpit lives at `D:\agent-development-os-mission-control`.

The detailed design remains in `docs/`. The synchronous-dispatch correction is recorded in `docs/09-SYNCHRONOUS-DISPATCH-ADAPTATION.md`.

## Known V2 limitations

- SQLite persists the latest redacted snapshot and ingest watermarks, not a full relational event history.
- Historical formats remain supported through a bounded legacy schema profile; new unsupported versions warn but do not crash the dashboard.
- Basic authentication is suitable for loopback staging. Any non-loopback exposure requires HTTPS and a separately approved identity/network design.
- Runtime promotion / live adapter launch from MC remain absent. Phase 2/3 command surfaces are off by default.

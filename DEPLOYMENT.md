# Mission Control V2 deployment

## Target

The initial staging target is local/internal only:

```text
http://127.0.0.1:3100
GET http://127.0.0.1:3100/api/health
```

No public DNS, Cloudflare, tunnel, OAuth, external ingress, Docker socket, privileged mode, or host networking is configured.

## Prerequisites

- Node.js 22.14 or newer and npm 11
- Docker Desktop with a reachable Linux daemon for the preferred container path
- Read access to the ADOS `state`, `handoffs`, and `evidence` directories
- A generated `.mission-control-auth.env` credential file

## Configuration

The server accepts `ADOS_CONTROL_PLANE_ROOT` (preferred) or the legacy `ADOS_ORCHESTRATOR_ROOT`. Browser requests cannot override these values.

Important values:

```text
MISSION_CONTROL_MODE=live
ADOS_CONTROL_PLANE_ROOT=/data/ados        # container
MISSION_CONTROL_REFRESH_MS=5000
MISSION_CONTROL_PERSISTENCE=sqlite
MISSION_CONTROL_DATA_ROOT=/var/lib/mission-control
MISSION_CONTROL_AUTH_MODE=basic
MISSION_CONTROL_AUTH_USER=owner
APP_VERSION=2.0.0
BUILD_ID=<immutable local build identifier>
```

## Preferred Docker deployment

From the application root:

```text
npm run auth:generate
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.staging.yml build --pull
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml ps
curl http://127.0.0.1:3100/api/health
```

### CI image smoke (no real ADOS mounts)

GitHub Actions job `docker-image` builds `Dockerfile` and runs a container with
`ADOS_CONTROL_PLANE_ROOT` pointing at a missing path and auth disabled, then
checks `GET /api/health` on loopback. That proves the image boots without
mounting production ADOS roots.

The Compose defaults mount:

```text
D:/agent-development-os-orchestrator/state    -> /data/ados/state:ro
D:/agent-development-os-orchestrator/handoffs -> /data/ados/handoffs:ro
D:/agent-development-os-orchestrator/evidence -> /data/ados/evidence:ro
mission-control-data                         -> /var/lib/mission-control:rw
```

Override `ADOS_STATE_HOST`, `ADOS_HANDOFFS_HOST`, and `ADOS_EVIDENCE_HOST` when the host locations differ. Do not mount the Docker socket or a broader host root.

## Production-process fallback

Use this only when the Docker daemon is unavailable:

```powershell
Set-Location -LiteralPath 'D:\ADOS Mission Control'
npm ci
npm run verify
npm run auth:generate
$env:MISSION_CONTROL_MODE = 'live'
$env:ADOS_CONTROL_PLANE_ROOT = 'D:\agent-development-os-orchestrator'
$env:APP_VERSION = '2.0.0'
$env:BUILD_ID = 'v2-local-staging'
npm run start:staging
```

This runs the optimized production build, not development mode. Keep the process attached to an internal supervisor if durable automatic restarts are required.

## Health and acceptance checks

The health payload contains only application status/version/build ID, authentication mode, source reachability/staleness, last successful refresh, parse-warning count, read-model status/backend, and the read-only flag. Health is intentionally credential-free for probes.

```text
curl http://127.0.0.1:3100/api/health
curl -u owner:<local-secret> -I http://127.0.0.1:3100/overview
curl -X POST -i http://127.0.0.1:3100/api/approvals/probe   # must return 405
```

For restart proof, stop and restart the exact staging process or run `docker compose ... restart`, then repeat the health check. A reachable source can still report blocked readiness; blocked ADOS state is a truthful application result, not an unhealthy web process.

## Evidence

V1 evidence remains under `evidence/deployment/`. V2 evidence is stored under `evidence/deployment-v2/` and includes command results, authentication/read-model checks, source/mount proof, health and restart results, seven authenticated screenshots, changed-file inventory, rollback instructions, and `SHA256SUMS.txt`.

## Rollback

Container rollback:

1. Preserve the current evidence directory.
2. Stop the service with `docker compose -f docker-compose.staging.yml down`. Do not add `--volumes` unless the local read-model cache is intentionally disposable.
3. Restore the previously approved image tag or application package.
4. Start it with the same loopback binding and read-only mounts.
5. Verify `/api/health` and the 405 mutation probe.

Production-process rollback:

1. Stop the process bound to port 3100.
2. Restore the previous application package from a known-good backup; this non-Git package has no branch rollback.
3. Run its recorded install/build checks.
4. Restart on `127.0.0.1:3100` and verify health.

Rollback never requires changing ADOS state because the application has no ADOS write path.

The ignored `.mission-control-auth.env` contains the local staging credential. Rotate it by stopping staging, moving the old file to a protected backup or deleting it intentionally, rerunning `npm run auth:generate`, and restarting. Never copy its contents into evidence.

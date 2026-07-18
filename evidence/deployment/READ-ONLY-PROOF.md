# Read-only proof

## Application enforcement

- `npm run verify:readonly`: PASS; no filesystem writer, child-process launcher, or dispatch adapter in application source.
- Unit/security suite: PASS 18/18, including traversal rejection, unsafe-method rejection, redaction, and safe error output.
- Live mutation probe: `POST /api/tasks/probe` returned HTTP 405 with `READ_ONLY_V1`, `Allow: GET, HEAD, OPTIONS`, and `X-ADOS-Authority: read-only`.
- The application uses `readFile`, `open(..., "r")`, `readdir`, `stat`, and `access`; it has no ADOS write API.

## Container mount definition

`docker compose -f docker-compose.staging.yml config --quiet` passed. The validated configuration mounts only:

- host ADOS `state` to `/data/ados/state:ro`;
- host ADOS `handoffs` to `/data/ados/handoffs:ro`;
- host ADOS `evidence` to `/data/ados/evidence:ro`.

It does not mount a Docker socket, host root, privileged mode, or host networking. The service root is read-only and capabilities are dropped.

## Active fallback

The Docker engine was unavailable, so the active staging process uses the mission-authorized local production fallback. OS-level bind-mount proof is therefore not applicable to the active Windows process. Its source is still read-only by construction and verified by the audit and live 405 probe. No test attempted a write against the real ADOS control plane.

# Read-only and authentication proof

- `npm run verify:readonly`: PASS. No ADOS writers, process launchers, or dispatch adapters were found; only the isolated app-owned SQLite cache adapter may write.
- ADOS Compose mounts: `/data/ados/state:ro`, `/data/ados/handoffs:ro`, `/data/ados/evidence:ro`.
- Application cache: separate `/var/lib/mission-control:rw` volume only.
- Anonymous protected request: HTTP 401 with Basic challenge.
- Authenticated protected request: HTTP 200.
- Unsafe API mutation probe: HTTP 405 with `Allow: GET, HEAD, OPTIONS`.
- Health probe: anonymous HTTP 200 with safe metadata only.
- Credential material recorded in evidence: false.
- No approval, dispatch, runtime-promotion, lease, ledger, task-contract, or other ADOS mutation route exists.

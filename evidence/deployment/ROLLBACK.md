# Rollback evidence

The canonical package is non-Git, so rollback does not use a fabricated branch or remote.

1. Stop the process bound to `127.0.0.1:3100`.
2. Preserve `evidence/deployment/` and its SHA-256 manifest.
3. Restore the previously approved package backup.
4. Run its clean install, lint, typecheck, tests, and production build.
5. Start it on the same loopback address with the same read-only configuration.
6. Verify `/api/health` and confirm an unsafe-method probe still returns 405.

For a later container deployment, stop with `docker compose -f docker-compose.staging.yml down`, restore the prior image tag, and start it with the same `:ro` mounts. ADOS state is not part of application rollback and must not be modified.

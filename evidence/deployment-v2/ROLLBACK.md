# V2 rollback

1. Stop the process bound to `127.0.0.1:3100` or run `docker compose -f docker-compose.staging.yml down` for a container deployment.
2. Preserve `evidence/deployment-v2/` and the ignored `.mission-control-auth.env` in a protected local location.
3. Restore the known-good V1 application package backup. This canonical package is non-Git, so there is no branch rollback.
4. The app-owned `data/mission-control-v2.sqlite` cache may be retained for forensics or removed intentionally while staging is stopped; it is never authoritative ADOS state.
5. Reinstall/build the restored package and bind it only to loopback.
6. Verify health, page rendering, redaction, and the HTTP 405 mutation probe.

Rollback never requires an ADOS state change.

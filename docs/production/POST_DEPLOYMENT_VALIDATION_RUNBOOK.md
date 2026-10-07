# Post-Deployment Validation Runbook

## Required checks

- health/readiness checks for API, worker, frontend and Nginx.
- tenant isolation smoke test for one allowed and one denied organization.
- Role navigation smoke test for admin, manager, technician, customer and vendor surfaces.
- One read-only report/search/calendar smoke check.
- One document download authorization smoke check.
- Monitoring dashboard check for request errors, queue lag, database errors and MinIO errors.
- rollback decision window remains open until evidence is reviewed.

## Exit criteria

Post-deployment validation passes only when all smoke checks pass and no critical alert fires during the observation window.

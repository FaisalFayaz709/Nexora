# Production Cutover Runbook

## Preconditions

- Complete pre-cutover freeze.
- Confirm source archive, manifest and release tag.
- Confirm backup exists and restore drill is valid.
- Confirm rollback window and rollback owner.
- Confirm communications owner and stakeholder notification path.

## Cutover steps

1. Freeze deployments except the approved release candidate.
2. Record current production versions and image tags.
3. Capture database and object-storage backup evidence.
4. Deploy only the approved container image tags.
5. Run health/readiness checks for web, API, worker, PostgreSQL, Redis, MinIO and Nginx.
6. Run post-deployment smoke checks.
7. Keep rollback window open until monitoring confirms stable behavior.

## Rollback window

Rollback window must stay open until the post-deployment validation checklist passes and the operations owner records the close decision.

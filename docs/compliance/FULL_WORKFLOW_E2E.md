# Full Workflow E2E Certification

## Purpose

capability gate converts the cumulative NEXORA ERP implementation into a production-blocking full workflow certification layer. It does not change the locked stack or replace the architecture. It defines the runtime proof that must exist before the system can be presented as operationally complete.

## Locked stack compliance

No stack replacement is introduced. full-workflow E2E continues to use:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma
- MinIO object storage
- Redis + BullMQ for side effects
- Docker + Nginx
- GitHub Actions

## Locked architecture compliance

full-workflow E2E keeps the existing module boundaries:

- frontend calls public API only;
- backend route/controller layer does not call Prisma directly;
- services use repositories/facades;
- cross-module synchronous coordination is through public facades;
- BullMQ remains for asynchronous side effects only;
- stock, finance, approval and critical workflow state stay transactional.

## Runtime scenario families

full-workflow E2E defines twelve production-blocking scenario families:

1. full-workflow E2E-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA
2. full-workflow E2E-IDENTITY-ORG-RBAC-MFA-SESSION-WORKFLOW
3. full-workflow E2E-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH
4. full-workflow E2E-PROCUREMENT-THREE-WAY-MATCH-TO-AP-JOURNAL-PAYMENT
5. full-workflow E2E-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST
6. full-workflow E2E-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE
7. full-workflow E2E-FIELD-SERVICE-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY
8. full-workflow E2E-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE
9. full-workflow E2E-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES
10. full-workflow E2E-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT
11. full-workflow E2E-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES
12. full-workflow E2E-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION

## Evidence output

Runtime execution writes evidence to:

```text
certification-output/full-workflow-e2e/
```

Required files include:

- `api-probes.json`
- `results.json`
- `manifest.json`
- console log captured by CI or local release operator

## Honest status

This implementation is source/static complete. It adds the E2E certification matrix, policy assertions, runtime runner, frontend certification center and release gate documentation. It does not claim production runtime completion until the runtime certification script is executed against a live Docker environment with real seeded data and all scenario evidence captured.

# PASS_22_TESTING_COMPLETION_FULL_LIFECYCLE

Pass 22 is the testing completion pass. It does not add new business scope. It proves that every completed scope from Pass 00 through Pass 21 has a test layer, runtime command, evidence location and production-blocking rule.

## Test layers locked by Pass 22

- `UNIT_BUSINESS_RULES`
- `REPOSITORY_POSTGRES_INTEGRATION`
- `FASTIFY_API_INTEGRATION`
- `CROSS_MODULE_WORKFLOW_INTEGRATION`
- `FRONTEND_COMPONENT_AND_HOOKS`
- `BROWSER_E2E_FULL_STACK`
- `SECURITY_ABUSE_AUTHORIZATION`
- `MIGRATION_SCHEMA_EVOLUTION`
- `PERFORMANCE_CRITICAL_PATHS`
- `BACKUP_RESTORE_OPERATIONAL_RECOVERY`

## Critical full-lifecycle scenarios

- `PASS22-LOGIN-CORE-PLATFORM`
- `PASS22-CUSTOMER-PROJECT-BOM-MATERIAL-REQUEST`
- `PASS22-PROCUREMENT-PR-RFQ-PO-GRN-STOCK`
- `PASS22-ASSET-INSTALLATION-QR-MAINTENANCE`
- `PASS22-TICKET-WORKORDER-SERVICE-PARTS-CLOSE`
- `PASS22-FINANCE-INVOICE-POST-PAYMENT-AGING`
- `PASS22-SUPPLIER-INVOICE-THREE-WAY-MATCH`
- `PASS22-DOCUMENT-MINIO-REPORT-WORKER`
- `PASS22-PORTAL-SCOPES-OFFLINE-SYNC`
- `PASS22-SECURITY-CROSS-TENANT-MAKER-CHECKER`
- `PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY`

## Runtime evidence rule

Source-only evidence is not enough. PASS_22 can only become `GO_TESTING_RUNTIME_CERTIFIED` after these commands run on a real dependency/runtime environment:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
RUN_INTEGRATION_TESTS=1 pnpm test
RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test
RUN_BROWSER_E2E=1 pnpm test:e2e:browser
SECURITY_SMOKE=1 pnpm security:smoke:certify
pnpm db:validate
pnpm db:migrate:deploy
pnpm db:seed
bash scripts/backup-restore-certify.sh
```

## No architecture drift rule

Tests must verify the approved Fastify `/api/v1` backend, Next.js frontend, shared browser-safe contracts, Prisma/PostgreSQL persistence, MinIO storage boundary, Redis/BullMQ side-effect queues, RBAC, tenant isolation, audit and transaction boundaries. They must not create a second Next.js business API or move stock, money, approval state or accounting state into asynchronous workers.

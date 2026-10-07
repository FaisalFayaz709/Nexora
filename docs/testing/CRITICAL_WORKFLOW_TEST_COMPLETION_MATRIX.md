# R18 Test Completion Matrix

Pass R18 converts the earlier source scaffolding into a test-completion plan that can be executed once the dependency lockfile and runtime services are available.

## Required test layers

| Layer | Source evidence | Runtime command | Production impact |
|---|---|---|---|
| Unit business rules | `*.service.test.ts`, shared contract tests | `pnpm test` | Blocks production |
| Repository/PostgreSQL integration | repository integration tests, schema tests | `RUN_INTEGRATION_TESTS=1 pnpm test` | Blocks production |
| Fastify API integration | module `*.integration.test.ts` suites | `RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test` | Blocks production |
| Cross-module workflow integration | `r18-critical-workflow-executable.integration.test.ts` | `RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test` | Blocks production |
| Frontend component/hooks | frontend policy/component tests | `pnpm --filter @nexora/frontend test` | Blocks production |
| Browser E2E full stack | Playwright source specs | `RUN_BROWSER_E2E=1 pnpm test:e2e:browser` | Blocks production |
| Security abuse/authorization | security-hardening tests and smoke scripts | `pnpm security:smoke:certify` | Blocks production |
| Migration/schema evolution | Prisma/migration scripts and database tests | `pnpm db:validate && pnpm db:migrate:deploy` | Blocks production |
| Performance critical paths | operations performance policy tests | `RUN_PERFORMANCE_SMOKE=1 pnpm performance:smoke` | Blocks pilot/scale signoff |
| Backup/restore recovery | backup/restore scripts/runbook | `pnpm backup-restore:certify` | Blocks production |

## Critical workflow scenarios

R18 requires runtime evidence for these scenario families before production readiness can be claimed:

1. `R18-PR-APPROVAL-RFQ-PO-GRN-STOCK`
2. `R18-PROJECT-BOM-MATERIAL-REQUEST-PROCUREMENT`
3. `R18-STOCK-RECEIPT-ASSET-INSTALLATION-QR`
4. `R18-TICKET-WORK-ORDER-SERVICE-PARTS-CLOSE`
5. `R18-INVOICE-APPROVAL-POST-PAYMENT-ALLOCATION`
6. `R18-SUPPLIER-INVOICE-THREE-WAY-MATCH-PAYMENT`
7. `R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT`
8. `R18-CROSS-TENANT-IDOR-MAKER-CHECKER`
9. `R18-DOCUMENT-MINIO-REPORT-WORKER-EXPORT`
10. `R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES`

## Honest completion rule

R18 source gates only prove that the test obligations, executable harnesses, browser-E2E sources and runtime evidence locations exist. They do **not** prove the application is production-ready. Production readiness still requires the lockfile, install, typecheck, test execution, Docker runtime, E2E proof and final compliance matrix.

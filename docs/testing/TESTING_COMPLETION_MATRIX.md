# PASS 22 — Testing Completion Matrix

Status: `PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME`

PASS 22 closes the blueprint testing obligation at source level. It defines the exact test layers, critical workflow scenarios, browser E2E surfaces and runtime evidence paths required before the project can move from HOLD to GO.

## Required test layers

| Layer | Required proof | Runtime command | Blocks production |
|---|---|---|---|
| `UNIT_BUSINESS_RULES` | Service/policy/contract tests for business rules | `pnpm test` | Yes |
| `REPOSITORY_POSTGRES_INTEGRATION` | Prisma repository + schema tests against PostgreSQL | `RUN_INTEGRATION_TESTS=1 pnpm test` | Yes |
| `FASTIFY_API_INTEGRATION` | Fastify inject/API tests for auth, validation, RBAC and commands | `RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test` | Yes |
| `CROSS_MODULE_WORKFLOW_INTEGRATION` | PR→approval→RFQ→PO→GRN→stock and ticket→WO→parts→close flows | `RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test` | Yes |
| `FRONTEND_COMPONENT_AND_HOOKS` | RHF/Zod forms, TanStack grids, API hooks and shell tests | `pnpm --filter @nexora/frontend test` | Yes |
| `BROWSER_E2E_FULL_STACK` | Playwright full-stack ERP, portal and technician PWA scenarios | `RUN_BROWSER_E2E=1 pnpm test:e2e:browser` | Yes |
| `SECURITY_ABUSE_AUTHORIZATION` | IDOR, privilege escalation, upload abuse, maker-checker and rate-limit smoke | `SECURITY_SMOKE=1 pnpm security:smoke:certify` | Yes |
| `MIGRATION_SCHEMA_EVOLUTION` | Prisma schema validation, migrations and seed on clean runtime DB | `pnpm db:validate && pnpm db:migrate:deploy && pnpm db:seed` | Yes |
| `PERFORMANCE_CRITICAL_PATHS` | Critical grids/commands smoke for stock, search, dashboards and reports | `RUN_PERFORMANCE_SMOKE=1 pnpm performance:smoke` | Pilot/scale signoff |
| `BACKUP_RESTORE_OPERATIONAL_RECOVERY` | PostgreSQL backup/restore evidence from Docker Compose runtime | `bash scripts/backup-restore-certify.sh` | Yes |

## Critical workflow scenarios

1. `PASS22-LOGIN-CORE-PLATFORM`
1. `PASS22-CUSTOMER-PROJECT-BOM-MATERIAL-REQUEST`
1. `PASS22-PROCUREMENT-PR-RFQ-PO-GRN-STOCK`
1. `PASS22-ASSET-INSTALLATION-QR-MAINTENANCE`
1. `PASS22-TICKET-WORKORDER-SERVICE-PARTS-CLOSE`
1. `PASS22-FINANCE-INVOICE-POST-PAYMENT-AGING`
1. `PASS22-SUPPLIER-INVOICE-THREE-WAY-MATCH`
1. `PASS22-DOCUMENT-MINIO-REPORT-WORKER`
1. `PASS22-PORTAL-SCOPES-OFFLINE-SYNC`
1. `PASS22-SECURITY-CROSS-TENANT-MAKER-CHECKER`
1. `PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY`

## PASS 22 honest gate

`PASS_22_TESTING_COMPLETION` is a source completion pass, not a fake runtime certificate. It remains `HOLD` until the lockfile, install, typecheck, lint, tests, migrations, seed, Docker runtime, browser E2E, security smoke, performance smoke and backup/restore evidence are generated on a real local/CI runtime.

## Evidence directory

Runtime proof must be saved under:

```text
certification-output/pass-22/runtime/
```

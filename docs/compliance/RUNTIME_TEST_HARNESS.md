# Runtime Test Harness

## Purpose

The runtime test harness provides shared fixtures, API clients, concurrency helpers, idempotency helpers and environment guards for executable ERP workflow validation. It does not itself certify individual business workflows.

## Harness components

- `backend/src/test/runtime-env.ts` — runtime environment guards and required variables.
- `backend/src/test/api-client.ts` — lightweight API client for runtime tests.
- `backend/src/test/db-fixtures.ts` — tenant, branch, user, role and permission fixtures.
- `backend/src/test/concurrency.ts` — concurrent command execution helper.
- `backend/src/test/idempotency.ts` — idempotency key and retry utilities.
- `backend/src/test/runtime-harness.smoke.test.ts` — harness smoke test.
- `backend/src/test/runtime-acceptance.ts` — acceptance helper used by runtime suites.

## Environment gates

- Normal `pnpm test` runs ordinary test suites.
- `RUN_INTEGRATION_TESTS=1` enables integration suites that need runtime services.
- `RUNTIME_CERTIFICATION=1` enables stricter release evidence behavior.

Required runtime variables include `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `NEXORA_API_BASE_URL`.

Use `pnpm runtime:test:preflight` (or the PowerShell variant) to run the harness smoke test. Runtime evidence is written under `certification-output/` and is not committed.

# Runtime Readiness

## Purpose

Runtime readiness ensures the repository can be certified with real dependencies, database services, containers, migrations, integration suites and release evidence without fabricating any result.

## Repository requirements

1. Runtime integration suites must not be skipped or contain placeholder assertions.
2. `RUN_INTEGRATION_TESTS=1` and `RUNTIME_CERTIFICATION=1` enable release-grade runtime suites.
3. A real `pnpm-lock.yaml` must already exist before frozen installation.
4. `pnpm runtime-readiness:check` verifies the repository-owned runtime prerequisites.
5. `pnpm verify:static` must pass before runtime certification.
6. CI executes the static capability gate chain.

## Lockfile rule

Do not fabricate `pnpm-lock.yaml`. Generate it with pnpm on a connected Node 22 environment and commit it exactly as produced.

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
```

## Release rule

The codebase is not production release-certified until `pnpm final:certify` succeeds with a real lockfile, required Docker services, migrations, tests, Prisma validation/generation and smoke checks.


## PASS M11 final runtime core-controls gate

`final-runtime-core-controls:check` is the repository-owned static/runtime-readiness gate that runs the locked source gates before final live certification. It is included in `verify:static` so CI and local checks cannot bypass the final runtime-readiness remediation gate.

This gate is intentionally not a substitute for `pnpm final:certify`. It confirms that the source, certification scripts, E2E evidence manifests and runtime readiness wiring are present. A production release still requires a real lockfile, frozen install, live PostgreSQL/Redis/MinIO/API/worker/web/nginx services, migrations, tests, build and final runtime acceptance logs.

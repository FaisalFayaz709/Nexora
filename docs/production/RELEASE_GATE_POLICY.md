# R20 Release Gate Policy

R20 makes CI/CD a blocking quality gate. The policy is intentionally strict because NEXORA is an enterprise ERP with stock, finance, approvals, audit and tenant isolation requirements.

## Required release evidence

Before tagging or deploying a release candidate, collect evidence for:

1. `pnpm install --frozen-lockfile`
2. `pnpm verify:static`
3. `pnpm format:check`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm db:validate`
7. `pnpm db:generate`
8. `pnpm db:migrate:status`
9. `pnpm test`
10. `pnpm build`
11. `pnpm audit --audit-level high`
12. `docker compose config`
13. `docker compose build web api worker`
14. `pnpm full-workflow:e2e:check`
15. `pnpm test:e2e:browser` or documented browser E2E runtime evidence
16. R19 Docker runtime certification evidence when moving beyond source-level review

## Non-negotiable blockers

- Missing `pnpm-lock.yaml`
- Direct Prisma access from backend routes/controllers
- Cross-module repository imports
- Raw frontend business fetch outside the central API client
- Next.js route handler owning ERP domain logic
- Raw table/grid implementation where TanStack Table is required
- Forms bypassing React Hook Form + Zod where create/edit/command forms are required
- Unbounded list endpoints or raw database filters from clients
- Missing tenant/branch/resource scope checks
- Stock, money, approval or critical work-order updates performed asynchronously as the source of truth
- Missing audit for high-risk mutations
- Failed CodeQL, Semgrep or dependency audit without an approved remediation ticket


## R21 final blueprint compliance audit

The final source gate is `node scripts/check-pass-r21-final-blueprint-compliance-audit.mjs --source-only`. It must run before any production GO decision is accepted.

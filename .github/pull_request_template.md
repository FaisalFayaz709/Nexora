## R20 locked compliance checklist

- [ ] I did not change the locked stack: Next.js, Fastify, PostgreSQL, Prisma, MinIO, Redis, BullMQ, Docker, GitHub Actions.
- [ ] Frontend API calls still go through the centralized API/query layer; no raw business fetch in pages/components.
- [ ] Next.js route handlers do not contain ERP business logic, Prisma access, MinIO SDK access, Redis queues or RBAC bypasses.
- [ ] Backend routes/controllers do not access Prisma directly.
- [ ] Cross-module backend collaboration uses public facades or domain events as allowed.
- [ ] Stock, finance, approval and critical work-order state changes are transactional.
- [ ] Tenant, branch, permission and resource-scope checks are preserved.
- [ ] New/changed frontend routes have screen contracts.
- [ ] Grids use TanStack Table where required.
- [ ] Forms use React Hook Form + Zod where required.
- [ ] Tests or source gates were updated for new behavior.
- [ ] The R20 hardened CI gate is expected to pass.

## Evidence

Paste local or CI evidence here:

```text
pnpm install --frozen-lockfile
pnpm verify:static
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

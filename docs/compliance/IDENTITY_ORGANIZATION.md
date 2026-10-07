# capability gate — Identity, Sessions, MFA, RBAC and Organization Completion

## Source of truth

capability gate continues from the established runtime foundation and keeps the locked implementation stack unchanged:
Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma,
MinIO, Redis + BullMQ, Docker Compose, Nginx and GitHub Actions.

## Scope completed in this implementation

- Authentication remains on the locked route catalog: login, MFA verify, refresh,
  logout, logout-all, current profile, active sessions and session revocation.
- Successful authentication updates `lastLoginAt` without exposing password hashes,
  refresh hashes, MFA secrets or storage credentials.
- Server-side session revocation remains auditable across the user's active
  organization memberships.
- Tenant resolution continues to use the authenticated membership and the
  `x-organization-id` header, not a request-body `organizationId`.
- RBAC remains canonical permission-key based and branch/resource scope is enforced
  inside services.
- A backend `UserManagementService` is added for tenant identity administration
  without inventing public HTTP routes outside the locked endpoint catalog.
- `RoleService` now supports listing roles, creating tenant roles, replacing role
  permissions, assigning roles and updating MFA-required role policy with audit.
- Organization branch and department APIs remain behind authentication, tenant
  resolution and permissions.
- Frontend navigation now exposes identity/organization foundation screens for branches,
  departments and active sessions.

## Explicit non-goals

- This implementation does not add non-blueprint external services.
- This implementation does not expose new public identity administration HTTP endpoints
  because the locked endpoint catalog only contains the authentication/session
  routes for Identity.
- This implementation does not certify runtime execution in the sandbox. Runtime proof still
  requires local dependency installation, Prisma generation/migration, Docker,
  PostgreSQL, Redis and MinIO.

## Locked architecture controls preserved

- Routes/controllers do not import Prisma or `@nexora/database`.
- Repositories own persistence queries.
- Services coordinate validation, authorization-sensitive scope decisions,
  transactions and audit.
- Cross-module access remains via module `index.ts`/facades.
- Shared contracts remain browser-safe and contain no server-only dependencies.
- Tenant-owned identity and organization queries are scoped by `organizationId`,
  with `branchId` where branch-restricted behavior applies.

## Runtime exit requirements

Before identity/organization can be called production complete, run these locally:

```bash
pnpm identity:check
pnpm architecture:check
pnpm contracts:check
pnpm db:validate
pnpm typecheck
pnpm test
pnpm docker:runtime:certify
```

Acceptance scenarios still required in runtime tests:

1. Login with valid credentials creates a revocable session and refresh cookie.
2. Privileged role requiring MFA cannot complete login without MFA enrollment.
3. Multiple active memberships require explicit tenant selection.
4. Tenant A user cannot read or mutate Tenant B branch/department data.
5. Branch-scoped users cannot create or update another branch's department data.
6. Session revocation invalidates later bearer-token usage.
7. Role permission changes and user status changes create audit records.

identity/organization explicitly preserves tenant resolution through authenticated membership context and `x-organization-id`.

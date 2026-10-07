# capability gate — Security Hardening

## Purpose

capability gate adds the production-blocking security hardening layer for NEXORA ERP. It does not replace the locked architecture or stack. It codifies the controls that must be proven before a production release candidate is accepted.

## Locked stack confirmation

No replacement technology is introduced. The project remains:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma persistence
- MinIO document/object storage
- Redis + BullMQ queues and schedulers
- Docker Compose + Nginx runtime
- GitHub Actions CI/CD

## Security control areas

security-hardening covers the following production-blocking controls:

1. Strong authentication, password hashing, privileged MFA, session revocation and rate limiting.
2. RBAC plus tenant, branch and resource scope checks inside backend services.
3. Cross-tenant IDOR and privilege escalation denial tests.
4. CSRF, secure cookies, security headers and TLS/Nginx boundary controls.
5. File-upload abuse prevention with size, MIME, extension, checksum, private bucket and tenant prefix checks.
6. SQL injection and XSS hardening through Zod validation, allowlisted filters/sorts and parameterized persistence.
7. Safe audit logging with request IDs, PII minimization and no secrets/tokens/passwords in logs.
8. Dependency and supply-chain scanning with frozen lockfile, pnpm audit, CodeQL, Semgrep and update monitoring.
9. Backup and restore controls with encryption, restricted access, retention policy and restore proof.
10. Idempotency and rate limits for retry-sensitive/high-cost endpoints.
11. A release gate that blocks production until security smoke and runtime certification evidence exists.

## Architecture preservation

security-hardening adds policies, tests, CI guardrails and a frontend visibility page. It does not add direct Prisma access in routes/controllers, does not add frontend imports from backend/database packages, does not introduce private cross-domain repository imports, and does not move stock, money, approval or accounting state to asynchronous jobs.

## Runtime status

This implementation is source/static complete. Full security completion still requires local runtime proof:

```bash
pnpm install --frozen-lockfile
pnpm architecture:check
pnpm contracts:check
pnpm security:check
pnpm audit --audit-level high
RUN_INTEGRATION_TESTS=1 SECURITY_SMOKE=1 pnpm test
pnpm docker:runtime:certify
```

## Production rule

No deployment should be called production-ready until the security-hardening security evidence catalog is satisfied and the results are attached to the full-workflow E2E/production-release certification artifacts.

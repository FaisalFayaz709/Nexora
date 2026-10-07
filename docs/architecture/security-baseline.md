# NEXORA ERP — Locked Security Baseline

| Area | Required control |
|---|---|
| Authentication | Strong password hashing; MFA for privileged users; lockout/rate limiting; session revocation |
| Password storage | Argon2id or bcrypt with project-standard parameters; never reversible encryption |
| Session | Server-side revocable session; hashed refresh token/session secret |
| MFA | TOTP initially for privileged roles; recovery codes hashed |
| Authorization | RBAC plus resource/branch/tenant scope checks inside services |
| Tenant isolation | `organizationId` server-enforced from authenticated membership/context |
| Input validation | Zod/route schema validation; allowlisted filters/sorts; bounded pagination |
| SQL injection | Prisma parameterization; raw SQL only reviewed + parameterized |
| XSS | React escaping/output encoding; CSP/security headers; sanitize rich text if introduced |
| CSRF | SameSite/CSRF controls for cookie-authenticated mutation endpoints |
| File uploads | MIME/extension checks, size limits, content sniffing, private buckets, optional malware scan |
| Secrets | Environment/secret manager; never shared/client bundle |
| Audit | Business audit logs for high-risk actions, without secrets |
| PII | Minimize fields; selected secret encryption; sensitive-access logging |
| Rate limiting | Login, MFA, reset, public/portal and high-cost endpoints |
| Idempotency | Payments, GRNs, retry-sensitive commands |
| Headers/TLS | Nginx TLS; HSTS where appropriate; CSP; frame/content-type/referrer policies |
| Dependency security | Lockfile; Dependabot/Renovate; package audit; CodeQL/Semgrep in CI |
| Backups | Encrypted; retention policy; restricted access; restore test |
| Maker-checker | High-risk creator cannot be sole approver |
| Portal scope | Customer/vendor identities restricted to linked records |

## Mandatory security acceptance tests

- Cross-tenant IDOR denial.
- Privilege-escalation denial.
- Branch/resource-scope enforcement.
- Upload abuse validation.
- Rate-limit behavior.
- Expired/revoked sessions rejected.
- Rotated/expired QR tokens do not grant unauthorized access.
- Same idempotency key does not create duplicate financial effect.

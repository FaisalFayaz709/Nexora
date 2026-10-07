# Security Hardening Checklist

- Secrets must be injected through environment/secret manager, never committed.
- Production cookies must be Secure + HttpOnly and SameSite configured.
- Public API must run behind HTTPS and Nginx/ingress rate limits.
- Database user should not have superuser privileges.
- MinIO bucket policies must deny anonymous object access.
- Presigned URLs must be short-lived and tenant-scoped.
- CI must run static gates, lint, typecheck, tests, Prisma validation and build.
- Critical mutation endpoints must write audit events.
- Cross-tenant IDOR tests must be part of release certification.
- Posted financial and stock records require reversal/correction flows, not direct mutation.

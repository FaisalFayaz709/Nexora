# PASS 21 Security Smoke Matrix

Status: SOURCE_LEVEL_RUNTIME_PENDING

This matrix defines the runtime evidence required before NEXORA can move from HOLD to GO for security hardening.

## Required runtime smoke checks

1. Unauthenticated `/api/v1/auth/me` must return 401 or 403.
2. Unauthenticated mutation probes such as `/api/v1/payments` must return 401, 403 or validation failure without side effects.
3. Cookie-authenticated mutation probes must fail closed when CSRF evidence is missing.
4. Cross-tenant IDOR probes must fail for documents, assets, invoices, projects and portal records.
5. Privilege escalation probes must fail for approval, payment posting, stock adjustment, role management and document external access.
6. Upload abuse probes must reject oversize files, mismatched MIME, blocked extensions, checksum mismatch and tenant-prefix escape.
7. Public/auth/high-cost endpoints must be rate limited.
8. Audit logs must redact passwords, access/refresh tokens, cookies, OTP/MFA secrets, CSRF tokens and API keys.
9. Dependency audit, CodeQL, Semgrep and lockfile policy must be available in CI evidence.
10. Backup and restore proof must cover PostgreSQL rows, document metadata, object references and restricted access.

## Production decision

Security status remains HOLD while any runtime evidence is absent. Source-level files, tests and scripts may pass, but final production GO requires local/Docker runtime proof.

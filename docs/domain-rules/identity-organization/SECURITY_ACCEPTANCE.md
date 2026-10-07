# Security Acceptance Matrix

| Control | Implementation |
|---|---|
| Strong password hashing | bcrypt adapter |
| Reversible password storage prohibited | no password encryption implementation |
| Session revocation | Session rows + `revokedAt` |
| Refresh secret storage | SHA-256 hash only; raw secret only in HttpOnly cookie |
| Refresh rotation | hash replaced on each successful refresh |
| Access token | short lifetime; user/session reference only |
| MFA | TOTP server verifier |
| Recovery codes | bcrypt-hashed one-time records |
| Rate limit | Redis fixed-window atomic script |
| Tenant resolution | membership verification; no body `organizationId` |
| Multiple memberships | verified tenant-selection hint required |
| RBAC | membership -> role -> role permission -> permission key |
| Branch scope | service/repository branch filter |
| Maker-checker | reusable policy rejects same maker/checker |
| Admin audit | role/permission/session changes audited |
| Organization audit | branch/department create/update audited |
| Cookie | HttpOnly, SameSite Strict, Secure in production |
| Cross-module access | Organization imports Identity public facade only |
| Direct Prisma in route/controller | none |

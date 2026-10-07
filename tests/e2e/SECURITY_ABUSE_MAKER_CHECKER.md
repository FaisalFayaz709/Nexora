# M19 Runtime/E2E Certification Scenarios

- M19-RUNTIME-CROSS-TENANT-IDOR-DENIAL: Organization A cannot read/update/delete Organization B records and an abuse audit event is written.
- M19-RUNTIME-CROSS-BRANCH-RESOURCE-DENIAL: branch-scoped user cannot access another branch's PO, asset, ticket, work order, payment or document.
- M19-RUNTIME-PRIVILEGE-ESCALATION-DENIAL: user missing permission cannot approve, post payment, post journal, adjust stock, share document or manage roles.
- M19-RUNTIME-MAKER-CHECKER-ENFORCED: maker/requester cannot be the checker for approvals, payments, journal posting, PO approval, stock variance or role administration.
- M19-RUNTIME-IDEMPOTENCY-PAYLOAD-HASH: same key/same body replays safely; same key/different body returns conflict.
- M19-RUNTIME-AUDIT-SECRET-PII-REDACTION: audit log stores safe summary and no password/token/cookie/OTP/private key/raw signature.
- M19-RUNTIME-AUTH-RATE-LIMIT-REVOCATION: login/reset/MFA brute-force is rate-limited and revoked refresh token cannot create a session.
- M19-RUNTIME-UPLOAD-ABUSE-DENIAL: oversize, MIME mismatch, extension mismatch, checksum mismatch and tenant-prefix escape are denied.
- M19-RUNTIME-SQLI-XSS-ALLOWLIST: malicious filters, sorts, search terms and HTML payloads are rejected or safely encoded.
- M19-RUNTIME-FRONTEND-WORKER-BYPASS-DENIAL: frontend and worker cannot mutate critical domain state outside backend commands.
- M19-RUNTIME-PRODUCTION-RELEASE-GATE: production release stays blocked while any security, restore or runtime certification evidence is missing.

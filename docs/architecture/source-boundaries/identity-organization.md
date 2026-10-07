# Source Boundary / Derived Implementation Choices

The source locks the authentication flow and security controls, but it does not print complete payload schemas for every Identity/Organization endpoint.

Therefore the implementation distinguishes source-derived rules from implementation-derived details.

## Source-derived

- Password storage: Argon2id or bcrypt.
- Optional MFA; TOTP initially for privileged roles.
- Recovery codes stored hashed.
- Server-side revocable session with hashed refresh token/session secret.
- Short-lived access credential carries identity/session reference, not authoritative permissions.
- Membership -> roles -> permissions.
- Permission is insufficient by itself; tenant/branch/resource scope also applies.
- Maker-checker for high-risk approval.
- `organizationId` comes from authenticated membership/context and is injected into tenant repository queries.
- Role/permission/session changes are audited.
- Login/MFA are rate-limited.
- Refresh/session cookie is secure HttpOnly.
- Identity and organization method/path signatures come from the locked endpoint catalog.

## Implementation-derived, explicitly documented

- `x-organization-id` is used only as a **tenant selection hint** when a user has multiple memberships. It never becomes authorization context by itself; the server verifies it against active membership. If there is one active membership it is auto-resolved.
- Access token TTL default = 15 minutes.
- Session TTL default = 30 days.
- MFA challenge TTL default = 5 minutes.
- Login default rate threshold = 5 attempts / 15 minutes.
- MFA default rate threshold = 10 attempts / 5 minutes.
- Refresh cookie name = `nexora_refresh`.
- Bcrypt default cost = 12.
- TOTP verification window = previous/current/next 30-second step.
- `MfaRecoveryCode` is a derived supporting table because the source requires hashed recovery codes but does not name their persistence entity.
- Organization create/update payload fields are derived from the source entity catalog and route semantics; they are marked implementation-derived in shared contracts.

These choices can be changed by explicit architecture/product decision without pretending they were verbatim values in the source PDF.

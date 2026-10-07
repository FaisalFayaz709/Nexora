# QR Security

- QR token is a high-entropy random opaque value.
- Database stores SHA-256(token), not the raw token.
- `/asset-qr/:token` hashes the supplied token before lookup.
- Lookup is tenant-scoped and requires authentication in the current internal-user phase.
- Token alone grants no authorization.
- `revokedAt` and `expiresAt` are checked.
- Rotation replaces the current token hash so the prior token immediately fails.
- Retirement revokes the current tag.
- Every successful resolve writes `ASSET_QR_RESOLVED` to the business audit log
  without recording the token.
- Portal-specific linked-customer authorization is added when the portal authorization layer is available; until then this route is internal authenticated tenant access only.

This satisfies the critical security case that expired/rotated tokens do not
grant access without inventing a public portal identity model early.

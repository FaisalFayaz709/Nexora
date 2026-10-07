# NEXORA ERP — Locked API Conventions

| Concern | Locked convention |
|---|---|
| Base path | `/api/v1` |
| Transport | HTTPS JSON REST; multipart only where direct API upload is required |
| Content type | `application/json` |
| Authentication | Short-lived access credential + secure HttpOnly refresh/session cookie |
| Tenant context | Resolved from authenticated membership; client cannot arbitrarily override `organizationId` |
| Authorization | Permission key + branch/resource scope checks |
| IDs | UUID in API paths; human business numbers are separate searchable fields |
| Pagination | `page` + `pageSize` for ERP grids; cursor for timelines/events where appropriate |
| Sorting | `sort=field:asc,field2:desc`, allowlisted per endpoint |
| Filtering | Explicit query filters; no raw DB-expression input |
| Status changes | Explicit command endpoints: `/submit`, `/approve`, `/receive`, `/post`, `/close`, etc. |
| Idempotency | `Idempotency-Key` required/recommended for payments, GRNs, invoice posting and retry-sensitive commands |
| Errors | Stable `code` + `message` + `details` + `requestId` |
| Validation | Shared Zod structural contracts; server may extend for auth/business constraints |
| Docs | OpenAPI from route schemas at controlled `/docs` endpoint |
| Versioning | Breaking changes use `/v2` or controlled compatibility migration; no silent breaking response changes |

## Standard response envelopes

### Single resource

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

### List

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 241,
    "requestId": "..."
  }
}
```

### Error

```json
{
  "error": {
    "code": "PURCHASE_REQUEST_INVALID_STATE",
    "message": "Purchase request cannot be approved from DRAFT state.",
    "details": { "currentStatus": "DRAFT" },
    "requestId": "req_..."
  }
}
```

## Contract-fidelity rule

The endpoint catalog, method, route, purpose, explicit permission and notes are treated as locked.
Where the PDF gives an exact payload/schema example, preserve it.
Where the PDF does **not** enumerate a full request/response field schema, do **not invent a conflicting "locked" schema in baseline freeze**; preserve the endpoint semantics and derive shared Zod contracts during implementation from the specification's entity/business rules.

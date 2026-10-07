# Backend Core Controls

This directory contains cross-cutting controls required by the locked NEXORA blueprint. Domain modules may use these helpers, but they must still own their business rules and persistence through their own service/repository boundaries.

## Required command pipeline

Authenticated command endpoints must preserve this sequence:

1. Authenticate request.
2. Resolve tenant membership.
3. Check module enablement, where the module is feature-gated.
4. Check permission key.
5. Validate payload through shared/server Zod contracts.
6. Enforce resource/branch scope in service/repository reads.
7. Execute critical changes in one PostgreSQL transaction.
8. Persist audit and domain event records before commit where they describe the same critical change.
9. Use BullMQ only after commit for email, notifications, PDFs, exports, analytics or webhooks.

## Forbidden shortcuts

- Do not trust `organizationId` from request bodies as authorization context.
- Do not let controllers or routes call Prisma.
- Do not patch statuses freely from the frontend.
- Do not move stock, money, approval state, or accounting postings to queues when they can be committed transactionally.
- Do not create business numbers outside the transaction-safe number sequence service.

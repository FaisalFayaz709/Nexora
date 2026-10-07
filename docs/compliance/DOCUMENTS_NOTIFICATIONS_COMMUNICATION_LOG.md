# capability gate — Documents, Notifications and Communication Log

## Purpose

capability gate completes the operational evidence and communication layer required by the NEXORA blueprint. It strengthens document metadata, document links, versioning, access logs, expiry notification policy, notification fan-out, reliable email outbox records and communication history without changing the locked stack or modular-monolith architecture.

## Locked stack compliance

This implementation keeps the approved stack unchanged:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma persistence
- MinIO private object storage through StorageService
- Redis + BullMQ for async/scheduled delivery work
- Docker Compose, Nginx and GitHub Actions

No NestJS, Express, MongoDB, Firebase, Supabase, Sequelize, TypeORM or microservice extraction is introduced.

## documents/communications scope

| Control | Required outcome |
|---|---|
| documents/communications-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT | Documents can be linked to employees, customers, vendors, projects, contracts, POs, invoices, assets, work orders, tickets and maintenance records through tenant-scoped DocumentLink rows. |
| documents/communications-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG | New versions preserve prior evidence; retention, expiry and access actions are logged for audit. |
| documents/communications-MINIO-ONLY-THROUGH-STORAGE-SERVICE | Business modules never call MinIO directly; upload/download URLs are produced only by StorageService. |
| documents/communications-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE | Business events can create deduped notifications; read/read-all actions remain tenant/user scoped. |
| documents/communications-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE | Email dispatch starts from an EmailOutbox row and an idempotent BullMQ job after transactional state commits. |
| documents/communications-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY | Emails, SMS, portal/manual messages and failures are traceable to business subjects for audit and dispute handling. |
| documents/communications-COMMUNICATION-ATTACHMENTS-REFERENCE-DOCUMENTS-NOT-OBJECT-SECRETS | Communication attachments reference Document IDs only; buckets, object keys, credentials and presigned URLs are not exposed. |
| documents/communications-DOCUMENT-EXPIRY-SCAN-EVENT-TO-NOTIFICATION | Expiring contracts, warranties, certifications and insurance documents can produce notification/email jobs. |
| documents/communications-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION | Queues remain limited to delivery, notifications, document scan/export and webhooks; critical stock/money/approval state remains synchronous. |

## Transaction boundary

Document metadata creation, version creation, subject link creation, audit events and business-event outbox entries are committed together in PostgreSQL. BullMQ is used only for delivery side effects after commit.

## Files added or changed

- `shared/src/contracts/documents-notifications/document-notification-communication-manifest.ts`
- `backend/src/modules/documents-notifications/document-notification-policy.ts`
- `backend/src/modules/documents-notifications/document-notification-policy.test.ts`
- `backend/src/modules/documents-notifications/documents-notifications.integration.test.ts`
- `frontend/src/modules/documents-notifications/documents-notifications-workbench.tsx`
- `frontend/src/app/documents-notifications/page.tsx`
- `worker/src/processors/document-notification-delivery-policy.ts`
- `scripts/check-operations-platform.mjs`

## Runtime rule

capability gate is source/static complete only when `pnpm verify:static`, `pnpm architecture:check` and `pnpm contracts:check` pass. Runtime completion still requires local dependency install, Prisma validation/migration, Docker runtime and executable workflow tests.

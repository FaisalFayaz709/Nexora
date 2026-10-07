# Redis/BullMQ Worker

## Purpose

The implementation replaces the previous logging-only worker bootstrap with a real BullMQ runtime backed by Redis. It keeps the locked NEXORA architecture unchanged and implements the queue foundation required before completing documents, notifications, finance, maintenance, reports, webhooks and scheduled automation.

## Locked stack preserved

No stack substitution is introduced. The worker remains inside the single TypeScript monorepo and uses:

- TypeScript
- Redis
- BullMQ
- Existing Docker Compose `worker` service
- Existing PostgreSQL/Prisma system of record for domain state in domain implementations
- Existing MinIO storage boundary for document/report artifacts in domain implementations

No NestJS, Express, MongoDB, TypeORM, Sequelize, Firebase or microservice extraction is introduced.

## Queue catalog

The centralized queue names are defined in `shared/src/constants/queue-names.ts` and re-used by the worker/backend producer boundary:

- `document.generate.invoice`
- `email.send`
- `notification.create`
- `maintenance.scan`
- `contract.expiry.scan`
- `invoice.overdue.scan`
- `report.export`
- `webhook.deliver`
- `document.scan`

## What was implemented

- Real Redis connection factory with BullMQ-compatible `maxRetriesPerRequest: null`.
- BullMQ `Queue`, `Worker` and `QueueEvents` registration for all required queues.
- Runtime lifecycle with graceful shutdown on `SIGINT` and `SIGTERM`.
- Job retry and retention defaults.
- Zod payload validation for every queue.
- Required idempotency keys in tenant jobs.
- Scheduled registrations for:
  - hourly maintenance scan
  - daily contract expiry scan
  - daily invoice overdue scan
- Backend-side `QueueProducer` boundary for enqueueing approved async work after transactions commit.
- Environment variables for concurrency, attempts, backoff, scheduler enablement, email delivery toggle and webhook delivery toggle.

## Transaction safety rule

Do not move stock, money or approval state asynchronously. Queues may be used for email, notifications, document generation, report exports, analytics, external webhooks and scans. Critical stock, invoice balance, payment, tax, bank reconciliation, approval and accounting effects must remain inside PostgreSQL transactions owned by the relevant domain module.

## Current honest status

The implementation is source/static complete. It provides a real BullMQ worker foundation and payload validation. Some processors intentionally return `deferred` because concrete renderers, SMTP/webhook adapters, maintenance scan database queries, report exporters and document scanners belong to domain implementations.

This implementation must not be described as full production job completion. Runtime proof still requires local dependency install, Redis, Docker Compose and the runtime certification commands from the implementation gate.

## Dependent capabilities

After the current implementation, continue to identity/organization Identity, Sessions, MFA and Organization. The queue foundation will be reused by later passes for notifications, emails, invoice PDFs, maintenance generation, report export and webhooks.

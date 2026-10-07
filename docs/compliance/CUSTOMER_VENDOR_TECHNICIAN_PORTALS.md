# capability gate — Customer Portal, Vendor Portal and Technician PWA

capability gate completes the external and field-user workspace layer required by the NEXORA blueprint.

## Locked blueprint alignment

portal preserves the locked stack and architecture: Next.js, Fastify + TypeScript, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx/GitHub Actions, and the domain-first modular monolith.

## Scope

portal covers:

- Customer portal dashboard, projects, contracts, sites, assets, tickets, work orders, maintenance schedule, invoices, payments, warranties and documents.
- Customer approval of completed work with auditable customer signature evidence.
- Vendor portal dashboard, RFQs, submitted quotations, purchase orders, delivery schedule, GRNs, rejected items, invoices, payments, performance and documents.
- Technician PWA workspace for assigned jobs, QR scanning, customer details, navigation, photos, spare parts, status updates, customer signature, service report and offline command queue.
- Offline field-mode baseline: tenant-scoped commands, assigned-technician scope and idempotent replay by clientCommandId.

## Controls

- `portal-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE`
- `portal-VENDOR-PORTAL-LINKED-VENDOR-SCOPE`
- `portal-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE`
- `portal-PORTAL-TOKEN-NEVER-BYPASSES-AUTHORIZATION`
- `portal-QR-ASSET-RESOLUTION-AUTHORIZED`
- `portal-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED`
- `portal-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE`
- `portal-PORTAL-ACTIONS-AUDITED`
- `portal-PORTAL-PERMISSION-FILTERED-DOCUMENTS-INVOICES-PAYMENTS`
- `portal-NO-CROSS-TENANT-PORTAL-DATA`

## Security boundary

A portal actor is never authorized by a route name, a portal token, a presigned document URL or a QR token alone. The request must resolve authenticated identity, organization membership, linked portal subject and resource scope. Customer portal actors are linked to exactly their customer resources; vendor portal actors are linked to exactly their vendor resources; technician PWA actors are limited to assigned work orders and applicable branch scope.

## Document and offline boundary

Photos, signatures and attachments use Document upload intent and StorageService-backed MinIO objects. Offline commands remain a replay mechanism only; they cannot bypass service state transitions, tenant scope, assignment scope, stock transactions, audit or idempotency.

## Runtime proof still required

This implementation is source/static complete. Local runtime certification must still prove linked-customer/vendor filtering, assigned-technician command authorization, QR token authorization, document evidence creation, offline idempotency and portal audit logs with executable API/browser tests.

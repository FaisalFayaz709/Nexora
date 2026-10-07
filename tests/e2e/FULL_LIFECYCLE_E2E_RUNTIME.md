# M20 Full Lifecycle E2E Runtime Scenarios

The following runtime scenarios must run against the real Docker Compose stack, real PostgreSQL database, real Fastify API, and browser frontend before production certification.

- M20-RUNTIME-CUSTOMER-CONTRACT-PROJECT-TO-FINANCE-HAPPY-PATH
- M20-RUNTIME-THREE-WAY-MATCH-TO-PAYMENT-IDEMPOTENCY
- M20-RUNTIME-STOCK-LEDGER-SERIAL-ASSET-INSTALLATION
- M20-RUNTIME-TICKET-SLA-WORKORDER-SERVICE-REPORT-ASSET-HISTORY
- M20-RUNTIME-PREVENTIVE-MAINTENANCE-GENERATES-ONE-WORKORDER
- M20-RUNTIME-DOCUMENT-NOTIFICATION-REPORT-EXPORT-EVIDENCE
- M20-RUNTIME-PORTAL-PWA-OFFLINE-REPLAY-SCOPE
- M20-RUNTIME-ABUSE-MAKER-CHECKER-PRODUCTION-BLOCKER

Every scenario must record before/after snapshots, request/response traces, audit rows, relevant ledger rows, and the release evidence manifest checksum.

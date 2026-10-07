# Source of Truth

Primary source:

- **NEXORA ERP — Complete Software Architecture, Database, API & Implementation Specification**
- Base document version: **1.0**
- Base document date: **28 August 2026**
- Commercial Completeness Addendum: **Version 1.1** (Appendix F)
- Frontend Implementation Completion Addendum: **Version 1.2** (Appendix G, dated 08 September 2026)
- Archived source filename in this repository: `docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf`
- Total pages: **90**

This repository baseline is derived from that document. It is not a replacement for the source PDF.

## Source hierarchy

1. Source PDF text, diagrams, tables and addenda, including Appendix F and Appendix G.
2. Locked decisions captured in the repository compliance baseline.
3. Remediation-pass implementation artifacts and certification outputs.
4. Developer convenience choices.

If a future implementation artifact conflicts with the source specification, the implementation artifact is wrong unless the specification was explicitly amended.

## R0 rebase decision

Earlier repository documents referenced an older **82-page** source baseline. That is no longer sufficient. The active build target is the latest **90-page** blueprint that includes Appendix G.

Appendix G is mandatory scope. It requires, at minimum:

- shadcn/ui primitive components under `frontend/src/components/ui`;
- NEXORA-owned reusable wrappers under `components/app`, `components/data`, `components/forms`, `components/feedback` and `components/workflow`;
- React Hook Form plus Zod resolver for all create, edit and command forms;
- TanStack Table for ERP grids and list screens;
- TanStack Query through centralized API/query hooks;
- complete list/create/detail/edit and command workflows for editable aggregate roots;
- screen-by-screen route contracts;
- route-group shell enforcement for ERP, portal and technician pages;
- a Fastify backend endpoint for `POST /api/v1/portal/technician/offline-sync`;
- no second business API in Next.js route handlers.

No later pass can mark frontend, portal/PWA, E2E or production readiness complete until Appendix G is implemented and tested.

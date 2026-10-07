# Definition of Done

Static implementation provides:
- permissions and module-feature guard on every Procurement endpoint;
- tenant and branch scope;
- vendor approval governance for RFQ/quotation/PO;
- PR and PO maker-checker controls;
- canonical state-command validation;
- audit records on critical mutations;
- NumberSequence-controlled PR/RFQ/PO/GRN numbers;
- GRN idempotency;
- PO/PO-item row locks and receipt tolerance;
- InventoryFacade use instead of cross-domain persistence;
- serial/batch/cost-layer receipt integration;
- deterministic quotation comparison;
- route schemas/OpenAPI metadata;
- frontend read workspaces for PR/RFQ/PO/GRN.

Runtime DoD is still not certified in the current tool environment. PostgreSQL/Fastify/browser execution remains mandatory.

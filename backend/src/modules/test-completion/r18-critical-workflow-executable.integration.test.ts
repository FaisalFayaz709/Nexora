import { executableWorkflowSuite, type ExecutableWorkflowScenario } from '../../test/executable-workflow-scenario.js';

const scenarios: readonly ExecutableWorkflowScenario[] = [
  {
    scenarioId: 'R18-PR-APPROVAL-RFQ-PO-GRN-STOCK',
    title: 'Purchase request approval to RFQ, purchase order, goods receipt and stock ledger workflow',
    lockedBlueprintRequirement: 'Procurement, approval and goods receipt must update approval state, GRN, stock balance, stock ledger and audit within controlled command endpoints and PostgreSQL transactions.',
    preconditions: ['Runtime seed creates organization, branch, requester, approver, vendor, products, warehouse and project material need fixtures.'],
    steps: [
      { id: 'R18-PR-CREATE', method: 'POST', path: '/api/v1/purchase-requests', allowedStatuses: [200, 201] },
      { id: 'R18-PR-SUBMIT', method: 'POST', path: '/api/v1/purchase-requests/r18-pr-001/submit', allowedStatuses: [200, 202] },
      { id: 'R18-PR-APPROVE', method: 'POST', path: '/api/v1/purchase-requests/r18-pr-001/approve', allowedStatuses: [200] },
      { id: 'R18-PR-CREATE-RFQ', method: 'POST', path: '/api/v1/purchase-requests/r18-pr-001/create-rfq', allowedStatuses: [200, 201] },
      { id: 'R18-PO-CREATE', method: 'POST', path: '/api/v1/purchase-orders', allowedStatuses: [200, 201] },
      { id: 'R18-PO-APPROVE', method: 'POST', path: '/api/v1/purchase-orders/r18-po-001/approve', allowedStatuses: [200] },
      { id: 'R18-GRN-RECEIVE', method: 'POST', path: '/api/v1/goods-receipts', allowedStatuses: [200, 201], idempotencyKey: 'r18-grn-receive-001' },
      { id: 'R18-STOCK-LEDGER-READ', method: 'GET', path: '/api/v1/inventory/ledger?referenceType=GOODS_RECEIPT&referenceId=r18-grn-001', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-GRN-STOCK-TRANSACTION-ATOMICITY', description: 'GRN item, PO received quantity, stock balance, stock transaction and audit rows are committed together.', querySubject: 'GoodsReceipt' },
    ],
    securityAssertions: ['The PR approver cannot be an unauthorized user and tenant/branch scope is enforced.'],
    auditAssertions: ['PURCHASE_REQUEST_APPROVED and GOODS_RECEIPT_RECEIVED audit events exist.'],
  },
  {
    scenarioId: 'R18-PROJECT-BOM-MATERIAL-REQUEST-PROCUREMENT',
    title: 'Project BOM creates material requirement and procurement handoff without cross-module boundary violations',
    lockedBlueprintRequirement: 'Project demand must flow to procurement through approved facades while preserving tenant scope, activity timeline and material traceability.',
    preconditions: ['Runtime seed provides a customer, contract, project, products and project manager role.'],
    steps: [
      { id: 'R18-PROJECT-CREATE', method: 'POST', path: '/api/v1/projects', allowedStatuses: [200, 201] },
      { id: 'R18-BOM-UPSERT', method: 'POST', path: '/api/v1/projects/r18-project-001/bom', allowedStatuses: [200, 201] },
      { id: 'R18-BOM-APPROVE', method: 'POST', path: '/api/v1/projects/r18-project-001/bom/r18-bom-001/approve', allowedStatuses: [200] },
      { id: 'R18-MATERIAL-REQUEST', method: 'POST', path: '/api/v1/projects/r18-project-001/material-request', allowedStatuses: [200, 201] },
      { id: 'R18-PROJECT-TIMELINE', method: 'GET', path: '/api/v1/projects/r18-project-001/timeline', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-PROJECT-MATERIAL-TRACE', description: 'MaterialRequirement references the originating Project/BOM and is visible in the project activity timeline.', querySubject: 'MaterialRequirement' },
    ],
    securityAssertions: ['A user without project.update cannot approve BOM or create material requirement.'],
    auditAssertions: ['Project BOM approval and material request creation are audited.'],
  },
  {
    scenarioId: 'R18-STOCK-RECEIPT-ASSET-INSTALLATION-QR',
    title: 'Received serialized stock becomes installed asset with QR lifecycle history',
    lockedBlueprintRequirement: 'Asset installation must consume or link the correct serialized stock item, create asset history and keep QR access authorized.',
    preconditions: ['Runtime seed includes serialized product stock received into a warehouse and a target customer site.'],
    steps: [
      { id: 'R18-ASSET-REGISTER', method: 'POST', path: '/api/v1/assets/register-from-stock', allowedStatuses: [200, 201] },
      { id: 'R18-ASSET-INSTALL', method: 'POST', path: '/api/v1/assets/r18-asset-001/install', allowedStatuses: [200] },
      { id: 'R18-ASSET-QR-ROTATE', method: 'POST', path: '/api/v1/assets/r18-asset-001/qr/rotate', allowedStatuses: [200] },
      { id: 'R18-ASSET-HISTORY', method: 'GET', path: '/api/v1/assets/r18-asset-001/history', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-SERIAL-ASSET-LINK', description: 'SerialNumber points to the installed Asset and is no longer available stock after installation.', querySubject: 'SerialNumber' },
    ],
    securityAssertions: ['Rotated/expired QR token does not bypass authenticated asset authorization.'],
    auditAssertions: ['ASSET_INSTALLED and ASSET_QR_ROTATED audit events exist.'],
  },
  {
    scenarioId: 'R18-TICKET-WORK-ORDER-SERVICE-PARTS-CLOSE',
    title: 'Ticket to work order completion consumes parts and writes service history',
    lockedBlueprintRequirement: 'Work-order completion must include service report, parts consumption, stock transaction, asset/service history and audit in one transaction where critical state changes occur.',
    preconditions: ['Runtime seed provides customer site, asset, technician profile, spare part stock and SLA policy.'],
    steps: [
      { id: 'R18-TICKET-CREATE', method: 'POST', path: '/api/v1/tickets', allowedStatuses: [200, 201] },
      { id: 'R18-WORK-ORDER-CREATE', method: 'POST', path: '/api/v1/work-orders', allowedStatuses: [200, 201] },
      { id: 'R18-WORK-ORDER-ASSIGN', method: 'POST', path: '/api/v1/work-orders/r18-wo-001/assign', allowedStatuses: [200] },
      { id: 'R18-WORK-ORDER-START', method: 'POST', path: '/api/v1/work-orders/r18-wo-001/start', allowedStatuses: [200] },
      { id: 'R18-SERVICE-REPORT-CREATE', method: 'POST', path: '/api/v1/work-orders/r18-wo-001/service-report', allowedStatuses: [200, 201], idempotencyKey: 'r18-service-report-001' },
      { id: 'R18-WORK-ORDER-COMPLETE', method: 'POST', path: '/api/v1/work-orders/r18-wo-001/complete', allowedStatuses: [200], idempotencyKey: 'r18-wo-complete-001' },
    ],
    databaseAssertions: [
      { id: 'R18-PARTS-STOCK-ASSET-HISTORY', description: 'Service report parts create stock transactions and asset/service history before the work order closes.', querySubject: 'WorkOrder' },
    ],
    securityAssertions: ['Only the assigned technician or authorized dispatcher can complete assigned technician workflow commands.'],
    auditAssertions: ['WORK_ORDER_COMPLETED and PARTS_CONSUMED audit events exist.'],
  },
  {
    scenarioId: 'R18-INVOICE-APPROVAL-POST-PAYMENT-ALLOCATION',
    title: 'Customer invoice approval, posting and idempotent payment allocation',
    lockedBlueprintRequirement: 'Invoice status, balances, payment allocation and journal postings must remain transactional and retry-safe.',
    preconditions: ['Runtime seed provides customer, project, chart of accounts, financial period and approver.'],
    steps: [
      { id: 'R18-CUSTOMER-INVOICE-CREATE', method: 'POST', path: '/api/v1/customer-invoices', allowedStatuses: [200, 201] },
      { id: 'R18-CUSTOMER-INVOICE-SUBMIT', method: 'POST', path: '/api/v1/customer-invoices/r18-inv-001/submit', allowedStatuses: [200] },
      { id: 'R18-CUSTOMER-INVOICE-APPROVE', method: 'POST', path: '/api/v1/customer-invoices/r18-inv-001/approve', allowedStatuses: [200] },
      { id: 'R18-CUSTOMER-INVOICE-POST', method: 'POST', path: '/api/v1/customer-invoices/r18-inv-001/post', allowedStatuses: [200], idempotencyKey: 'r18-inv-post-001' },
      { id: 'R18-PAYMENT-CREATE', method: 'POST', path: '/api/v1/payments', allowedStatuses: [200, 201], idempotencyKey: 'r18-payment-001' },
      { id: 'R18-RECEIVABLES-READ', method: 'GET', path: '/api/v1/finance/receivables', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-INVOICE-BALANCE-JOURNAL', description: 'Payment allocation changes invoice balance and journal lines exactly once for a reused idempotency key.', querySubject: 'PaymentAllocation' },
    ],
    securityAssertions: ['A user without invoice.post/payment.create cannot post invoice or payment.'],
    auditAssertions: ['INVOICE_POSTED and PAYMENT_POSTED audit events exist.'],
  },
  {
    scenarioId: 'R18-SUPPLIER-INVOICE-THREE-WAY-MATCH-PAYMENT',
    title: 'Supplier invoice three-way match to payable and supplier payment',
    lockedBlueprintRequirement: 'Supplier invoice matching must compare PO, GRN and invoice, preserve matchStatus separately and block/flag variance before payment.',
    preconditions: ['Runtime seed provides approved PO, accepted GRN, supplier invoice and AP accounts.'],
    steps: [
      { id: 'R18-SUPPLIER-INVOICE-CREATE', method: 'POST', path: '/api/v1/supplier-invoices', allowedStatuses: [200, 201] },
      { id: 'R18-SUPPLIER-INVOICE-MATCH', method: 'POST', path: '/api/v1/supplier-invoices/r18-sinv-001/match', allowedStatuses: [200] },
      { id: 'R18-SUPPLIER-INVOICE-APPROVE', method: 'POST', path: '/api/v1/supplier-invoices/r18-sinv-001/approve', allowedStatuses: [200] },
      { id: 'R18-SUPPLIER-PAYMENT-CREATE', method: 'POST', path: '/api/v1/payments', allowedStatuses: [200, 201], idempotencyKey: 'r18-supplier-payment-001' },
      { id: 'R18-PAYABLES-READ', method: 'GET', path: '/api/v1/finance/payables', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-AP-MATCH-STATUS-SEPARATION', description: 'SupplierInvoice.matchStatus stores the three-way result while canonical invoice status remains a canonical lifecycle state.', querySubject: 'SupplierInvoice' },
    ],
    securityAssertions: ['Variance payment is denied without explicit override permission and audit.'],
    auditAssertions: ['SUPPLIER_INVOICE_MATCHED and SUPPLIER_PAYMENT_POSTED audit events exist.'],
  },
  {
    scenarioId: 'R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT',
    title: 'Technician PWA offline sync rejects stale/conflicting replays and accepts assigned commands once',
    lockedBlueprintRequirement: 'Technician offline sync must enforce tenant, branch and assigned-technician scope with idempotent client command handling.',
    preconditions: ['Runtime seed provides assigned technician, device id, work order and offline command batch fixtures.'],
    steps: [
      { id: 'R18-OFFLINE-SYNC-FIRST', method: 'POST', path: '/api/v1/portal/technician/offline-sync', allowedStatuses: [200, 207], idempotencyKey: 'r18-offline-sync-batch-001' },
      { id: 'R18-OFFLINE-SYNC-REPLAY', method: 'POST', path: '/api/v1/portal/technician/offline-sync', allowedStatuses: [200, 207], idempotencyKey: 'r18-offline-sync-batch-001' },
      { id: 'R18-WORK-ORDER-READ', method: 'GET', path: '/api/v1/work-orders/r18-wo-offline-001', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-OFFLINE-DEDUPE-ATOMICITY', description: 'The same organization/device/clientCommandId causes one accepted effect and repeat submissions are replayed without duplicate state changes.', querySubject: 'OfflineSyncCommand' },
    ],
    securityAssertions: ['Wrong tenant, branch or technician commands are rejected and audited.'],
    auditAssertions: ['TECHNICIAN_OFFLINE_SYNC_APPLIED and TECHNICIAN_OFFLINE_SYNC_REPLAYED audit events exist.'],
  },
  {
    scenarioId: 'R18-DOCUMENT-MINIO-REPORT-WORKER-EXPORT',
    title: 'Document upload intent, complete upload, authorized download and report export worker proof',
    lockedBlueprintRequirement: 'MinIO access must be mediated by backend StorageService and report/document side effects must use worker queues after commit.',
    preconditions: ['Runtime seed provides document subject, MinIO bucket, report template and worker connection.'],
    steps: [
      { id: 'R18-DOCUMENT-UPLOAD-INTENT', method: 'POST', path: '/api/v1/documents/upload-intent', allowedStatuses: [200, 201] },
      { id: 'R18-DOCUMENT-COMPLETE-UPLOAD', method: 'POST', path: '/api/v1/documents/complete-upload', allowedStatuses: [200, 201] },
      { id: 'R18-DOCUMENT-DOWNLOAD', method: 'GET', path: '/api/v1/documents/r18-doc-001/download-url', allowedStatuses: [200] },
      { id: 'R18-REPORT-EXPORT', method: 'POST', path: '/api/v1/reports/exports', allowedStatuses: [200, 201, 202], idempotencyKey: 'r18-report-export-001' },
      { id: 'R18-REPORT-EXPORT-READ', method: 'GET', path: '/api/v1/reports/exports/r18-report-job-001', allowedStatuses: [200] },
    ],
    databaseAssertions: [
      { id: 'R18-DOCUMENT-REPORT-EVIDENCE', description: 'Document metadata, document version and report execution link to stored objects without exposing MinIO secrets.', querySubject: 'Document' },
    ],
    securityAssertions: ['Users cannot download or presign documents outside tenant/subject permission scope.'],
    auditAssertions: ['DOCUMENT_UPLOADED and REPORT_EXPORT_REQUESTED audit/domain events exist.'],
  },,
  {
    scenarioId: 'R18-CROSS-TENANT-IDOR-MAKER-CHECKER',
    title: 'Cross-tenant IDOR, maker-checker and portal scope abuse tests are denied',
    lockedBlueprintRequirement: 'Tenant isolation, resource scope and maker-checker controls must be enforced by backend services rather than hidden only in the frontend.',
    preconditions: ['Runtime seed provides two organizations, a high-risk approval request, portal identities and out-of-scope resource identifiers.'],
    steps: [
      { id: 'R18-CROSS-TENANT-AUDIT-DENIAL', method: 'GET', path: '/api/v1/audit-logs/r18-foreign-audit-log', allowedStatuses: [403, 404] },
      { id: 'R18-CROSS-TENANT-ASSET-DENIAL', method: 'GET', path: '/api/v1/assets/r18-foreign-asset', allowedStatuses: [403, 404] },
      { id: 'R18-MAKER-CHECKER-SELF-APPROVAL-DENIAL', method: 'POST', path: '/api/v1/approvals/r18-self-created-approval/approve', allowedStatuses: [400, 403, 409] },
      { id: 'R18-PORTAL-OUT-OF-SCOPE-DENIAL', method: 'GET', path: '/api/v1/work-orders/r18-other-technician-work-order', allowedStatuses: [403, 404] },
    ],
    databaseAssertions: [
      { id: 'R18-SECURITY-DENIAL-AUDIT', description: 'Denied cross-tenant and maker-checker operations produce auditable security events without leaking protected data.', querySubject: 'AuditLog' },
    ],
    securityAssertions: ['Forbidden and not-found responses must not disclose whether the foreign tenant resource exists.'],
    auditAssertions: ['SECURITY_SCOPE_DENIED and MAKER_CHECKER_DENIED audit events exist where configured.'],
  },
  {
    scenarioId: 'R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES',
    title: 'Frontend shell, forms, grids and command-state behavior has API and browser runtime evidence',
    lockedBlueprintRequirement: 'Frontend pages must use route-group shells, centralized Fastify API calls, TanStack grids, React Hook Form plus Zod and consistent loading/empty/error/forbidden/conflict states.',
    preconditions: ['Runtime stack serves the Next.js frontend and Fastify API with seeded authenticated users for ERP, portal and technician route groups.'],
    steps: [
      { id: 'R18-FRONTEND-AUTH-ME', method: 'GET', path: '/api/v1/auth/me', allowedStatuses: [200, 401] },
      { id: 'R18-FRONTEND-SEARCH', method: 'GET', path: '/api/v1/search?q=r18', allowedStatuses: [200, 401, 403] },
      { id: 'R18-FRONTEND-CALENDAR', method: 'GET', path: '/api/v1/calendar', allowedStatuses: [200, 401, 403] },
      { id: 'R18-FRONTEND-OFFLINE-SYNC-CONTRACT', method: 'POST', path: '/api/v1/portal/technician/offline-sync', allowedStatuses: [200, 207, 400, 401, 403], idempotencyKey: 'r18-frontend-offline-contract' },
    ],
    databaseAssertions: [
      { id: 'R18-FRONTEND-STATE-EVIDENCE', description: 'Browser E2E artifacts prove route shells, DataTable grids, RHF/Zod command forms and denied-state behavior without frontend-only critical state mutation.', querySubject: 'BusinessEvent' },
    ],
    securityAssertions: ['Frontend evidence must show UI permission gates while backend API remains authoritative.'],
    auditAssertions: ['Frontend command execution evidence includes requestId and backend audit/domain event correlation where mutation is accepted.'],
  }
];

executableWorkflowSuite('R18 critical workflow runtime test completion scenarios', scenarios);

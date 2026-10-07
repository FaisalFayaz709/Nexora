import { FrontendWorkflowCompletionManifest } from '@nexora/shared';
import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C15 Frontend workflow completion acceptance',
  requirements: [
    {
      name: 'C15-END-TO-END-LIFECYCLE-UI-COVERS-CUSTOMER-PROJECT-PROCUREMENT-STOCK-ASSET-FINANCE',
      evidence: 'Browser user can navigate one connected command workbench covering customer/project start, BOM/material requirement, procurement/RFQ/PO/GRN, inventory stock/serials, asset install/QR, field service/maintenance, finance match/post/pay and documents/reports/portals.',
    },
    {
      name: 'C15-FRONTEND-CALLS-API-ONLY-NO-BACKEND-DATABASE-IMPORTS',
      evidence: 'Static frontend import scan finds no imports from backend, database, Prisma, MinIO SDK, BullMQ, Redis or server-only packages. Frontend uses apiRequest and public /api/v1 routes only.',
    },
    {
      name: 'C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS',
      evidence: 'Workflow buttons call explicit command endpoints such as /submit, /approve, /create-rfq, /send, /receive, /inspect, /install, /complete, /match and /post instead of free status PATCH shortcuts.',
    },
    {
      name: 'C15-IDEMPOTENCY-KEYS-FOR-GRN-PAYMENT-IMPORT-EXPORT-RETRY-SENSITIVE-COMMANDS',
      evidence: 'Retry-sensitive frontend commands attach an Idempotency-Key and visible key field; repeating the same command locally must not duplicate GRN, payment, import, export or posting effects.',
    },
    {
      name: 'C15-TANSTACK-QUERY-CACHING-INVALIDATION-AFTER-MUTATIONS',
      evidence: 'After every mutation the workflow UI invalidates the affected TanStack Query keys declared by the shared manifest.',
    },
    {
      name: 'C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE',
      evidence: 'Workflow command metadata exposes requiredStatus and requiredPermission, and the runtime UI disables or blocks actions that the authenticated tenant/branch/resource scope cannot perform.',
    },
    {
      name: 'C15-DOCUMENTS-PHOTOS-SIGNATURES-USE-STORAGE-UPLOAD-INTENT',
      evidence: 'Document/photo/signature UI starts with /documents/upload-intent or complete-upload and does not browser-write directly to MinIO without backend authorization.',
    },
    {
      name: 'C15-CRITICAL-STOCK-MONEY-APPROVAL-MUTATIONS-ARE-API-COMMANDS-NOT-FRONTEND-SHORTCUTS',
      evidence: `The command catalog has ${FrontendWorkflowCompletionManifest.commandCatalog.length} commands and none route critical stock, finance or approval mutations through frontend async worker shortcuts.`,
    },
  ],
});

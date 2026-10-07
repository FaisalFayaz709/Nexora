import { describe, expect, it } from 'vitest';
import { FrontendWorkflowCommandCatalog } from '@nexora/shared';
import {
  assertDestructiveConfirmation,
  assertEndToEndLifecycleCoverage,
  assertFrontendUsesPublicApiOnly,
  assertIdempotencyHeader,
  assertNoAsyncCriticalMutationBypass,
  assertPortalPwaOfflineSurface,
  assertSharedContractUsage,
  assertStatusPermissionGate,
  assertStorageUploadIntentForDocuments,
  assertTanStackInvalidation,
  assertWorkflowCommandEndpoint,
} from './frontend-workflow-policy.js';

const command = FrontendWorkflowCommandCatalog.find((item) => item.id === 'purchase-request-approve')!;

describe('C15 frontend workflow completion policy', () => {
  it('C15-FRONTEND-CALLS-API-ONLY-NO-BACKEND-DATABASE-IMPORTS', () => {
    expect(() => assertFrontendUsesPublicApiOnly({ sourceFile: 'frontend/src/modules/workflows/page.tsx', importPath: '../core/api-client' })).not.toThrow();
    expect(() => assertFrontendUsesPublicApiOnly({ sourceFile: 'frontend/src/modules/workflows/page.tsx', importPath: '@nexora/database' })).toThrow('C15-FRONTEND-CALLS-API-ONLY-NO-BACKEND-DATABASE-IMPORTS');
  });

  it('C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS', () => {
    expect(() => assertWorkflowCommandEndpoint(command)).not.toThrow();
    expect(() => assertWorkflowCommandEndpoint({ method: 'GET', endpointTemplate: '/purchase-requests' })).toThrow('C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS');
  });

  it('C15-IDEMPOTENCY-KEYS-FOR-GRN-PAYMENT-IMPORT-EXPORT-RETRY-SENSITIVE-COMMANDS', () => {
    expect(() => assertIdempotencyHeader({ command, idempotencyKey: 'c15-pr-approve-1' })).not.toThrow();
    expect(() => assertIdempotencyHeader({ command, idempotencyKey: null })).toThrow('C15-IDEMPOTENCY-KEYS-FOR-GRN-PAYMENT-IMPORT-EXPORT-RETRY-SENSITIVE-COMMANDS');
  });

  it('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE', () => {
    expect(() => assertStatusPermissionGate({ command, currentStatus: 'SUBMITTED', permissions: ['purchase_request.approve'], tenantResolved: true, resourceScopeResolved: true })).not.toThrow();
    expect(() => assertStatusPermissionGate({ command, currentStatus: 'DRAFT', permissions: ['purchase_request.approve'], tenantResolved: true, resourceScopeResolved: true })).toThrow('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE');
  });

  it('C15-DESTRUCTIVE-HIGH-RISK-ACTIONS-REQUIRE-EXPLICIT-CONFIRMATION', () => {
    expect(() => assertDestructiveConfirmation({ command, confirmationAccepted: true })).not.toThrow();
    expect(() => assertDestructiveConfirmation({ command, confirmationAccepted: false })).toThrow('C15-DESTRUCTIVE-HIGH-RISK-ACTIONS-REQUIRE-EXPLICIT-CONFIRMATION');
  });

  it('C15-TANSTACK-QUERY-CACHING-INVALIDATION-AFTER-MUTATIONS', () => {
    expect(() => assertTanStackInvalidation({ command, invalidatedQueryKeys: ['purchase-requests', 'approvals', 'rfqs'] })).not.toThrow();
    expect(() => assertTanStackInvalidation({ command, invalidatedQueryKeys: ['purchase-requests'] })).toThrow('C15-TANSTACK-QUERY-CACHING-INVALIDATION-AFTER-MUTATIONS');
  });

  it('C15-FORMS-USE-SHARED-ZOD-CONTRACTS-OR-MANIFESTED-PAYLOAD-SHAPES', () => {
    expect(() => assertSharedContractUsage({ command, payloadShapeKnown: true })).not.toThrow();
    expect(() => assertSharedContractUsage({ command, payloadShapeKnown: false })).toThrow('C15-FORMS-USE-SHARED-ZOD-CONTRACTS-OR-MANIFESTED-PAYLOAD-SHAPES');
  });

  it('C15-DOCUMENTS-PHOTOS-SIGNATURES-USE-STORAGE-UPLOAD-INTENT', () => {
    const documentCommand = FrontendWorkflowCommandCatalog.find((item) => item.id === 'document-upload-intent')!;
    expect(() => assertStorageUploadIntentForDocuments(documentCommand)).not.toThrow();
    expect(() => assertStorageUploadIntentForDocuments({ ...documentCommand, endpointTemplate: '/minio/browser-put' })).toThrow('C15-DOCUMENTS-PHOTOS-SIGNATURES-USE-STORAGE-UPLOAD-INTENT');
  });

  it('C15-CRITICAL-STOCK-MONEY-APPROVAL-MUTATIONS-ARE-API-COMMANDS-NOT-FRONTEND-SHORTCUTS', () => {
    expect(() => assertNoAsyncCriticalMutationBypass(command)).not.toThrow();
    expect(() => assertNoAsyncCriticalMutationBypass({ ...command, endpointTemplate: '/jobs/approve-purchase-request' })).toThrow('C15-CRITICAL-STOCK-MONEY-APPROVAL-MUTATIONS-ARE-API-COMMANDS-NOT-FRONTEND-SHORTCUTS');
  });

  it('C15-END-TO-END-LIFECYCLE-UI-COVERS-CUSTOMER-PROJECT-PROCUREMENT-STOCK-ASSET-FINANCE and C15-PORTAL-PWA-OFFLINE-SYNC-SURFACE-PRESENT', () => {
    assertEndToEndLifecycleCoverage(['CRM_AND_PROJECT_START', 'PROJECT_BOM_AND_MATERIAL_REQUIREMENT', 'PROCUREMENT_RFQ_PO_GRN', 'INVENTORY_STOCK_SERIAL_BATCH', 'ASSET_INSTALLATION_QR_WARRANTY', 'FIELD_SERVICE_AND_MAINTENANCE', 'FINANCE_MATCH_POST_PAY', 'DOCUMENTS_REPORTS_PORTALS']);
    assertPortalPwaOfflineSurface('DOCUMENTS_REPORTS_PORTALS', ['Customer Portal', 'Vendor Portal', 'Technician PWA', 'Offline Queue']);
  });
});

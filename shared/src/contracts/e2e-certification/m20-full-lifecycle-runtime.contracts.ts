import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';
import { E2ECertificationScenarioIds } from './e2e-certification-manifest';

export const MISSING_PASS_M20_SOURCE_PREFLIGHT_FULL_LIFECYCLE_E2E =
  'MISSING_PASS_M20_SOURCE_PREFLIGHT_FULL_LIFECYCLE_E2E' as const;

export const M20LifecycleSegments = [
  'CUSTOMER_CONTRACT_PROJECT_INITIATION',
  'PROJECT_BOM_MATERIAL_REQUIREMENT',
  'PROCUREMENT_RFQ_PO_GRN',
  'INVENTORY_STOCK_LEDGER_SERIAL_BATCH',
  'ASSET_INSTALLATION_QR_WARRANTY',
  'SERVICE_TICKET_SLA_WORK_ORDER',
  'MAINTENANCE_PREVENTIVE_CORRECTIVE',
  'FINANCE_INVOICE_JOURNAL_PAYMENT',
  'DOCUMENT_NOTIFICATION_REPORT_EXPORT',
  'PORTAL_PWA_OFFLINE_APPROVAL',
  'SECURITY_ABUSE_MAKER_CHECKER',
  'RELEASE_EVIDENCE_MANIFEST',
] as const;
export type M20LifecycleSegment = (typeof M20LifecycleSegments)[number];

export const M20ControlIdSchema = z.enum([
  'M20-FULL-LIFECYCLE-HAPPY-PATH',
  'M20-CUSTOMER-CONTRACT-PROJECT-CONTINUITY',
  'M20-PROJECT-BOM-MATERIAL-REQUIREMENT-CONTINUITY',
  'M20-PROCUREMENT-RFQ-PO-GRN-CONTINUITY',
  'M20-INVENTORY-LEDGER-SERIAL-BATCH-CONTINUITY',
  'M20-ASSET-INSTALLATION-QR-WARRANTY-CONTINUITY',
  'M20-SERVICE-TICKET-SLA-WORKORDER-CONTINUITY',
  'M20-MAINTENANCE-PREVENTIVE-CORRECTIVE-CONTINUITY',
  'M20-FINANCE-INVOICE-JOURNAL-PAYMENT-CONTINUITY',
  'M20-DOCUMENT-NOTIFICATION-REPORT-EVIDENCE',
  'M20-PORTAL-PWA-OFFLINE-REPLAY-EVIDENCE',
  'M20-SECURITY-ABUSE-MAKER-CHECKER-EVIDENCE',
  'M20-TRANSACTION-ROLLBACK-NO-PARTIAL-STATE',
  'M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST',
]);
export type M20ControlId = z.infer<typeof M20ControlIdSchema>;

export const M20RuntimeProofStatusSchema = z.enum([
  'NOT_STARTED',
  'READY_TO_RUN',
  'PASSED',
  'FAILED',
  'BLOCKED',
]);
export type M20RuntimeProofStatus = z.infer<typeof M20RuntimeProofStatusSchema>;

export const M20LifecycleProofRowSchema = z.object({
  segment: z.enum(M20LifecycleSegments),
  controlId: M20ControlIdSchema,
  scenarioId: z.enum(E2ECertificationScenarioIds),
  commandChain: z.array(NonEmptyStringSchema).min(1),
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  criticalInvariants: z.array(NonEmptyStringSchema).min(1),
  runtimeRequired: z.literal(true),
  blocksProduction: z.literal(true),
});
export type M20LifecycleProofRow = z.infer<typeof M20LifecycleProofRowSchema>;

export const M20LifecycleEvidenceSchema = z.object({
  runId: NonEmptyStringSchema,
  organizationId: NonEmptyStringSchema,
  branchId: NonEmptyStringSchema,
  customerId: NonEmptyStringSchema,
  contractId: NonEmptyStringSchema,
  projectId: NonEmptyStringSchema,
  bomId: NonEmptyStringSchema,
  materialRequirementId: NonEmptyStringSchema,
  purchaseRequestId: NonEmptyStringSchema,
  rfqId: NonEmptyStringSchema,
  supplierQuotationId: NonEmptyStringSchema,
  purchaseOrderId: NonEmptyStringSchema,
  goodsReceiptId: NonEmptyStringSchema,
  stockTransactionId: NonEmptyStringSchema,
  serialNumberId: NonEmptyStringSchema,
  assetId: NonEmptyStringSchema,
  qrTokenHashPrefix: NonEmptyStringSchema,
  serviceTicketId: NonEmptyStringSchema,
  workOrderId: NonEmptyStringSchema,
  serviceReportId: NonEmptyStringSchema,
  maintenancePlanId: NonEmptyStringSchema,
  maintenanceExecutionId: NonEmptyStringSchema,
  supplierInvoiceId: NonEmptyStringSchema,
  journalEntryId: NonEmptyStringSchema,
  paymentId: NonEmptyStringSchema,
  documentId: NonEmptyStringSchema,
  notificationId: NonEmptyStringSchema,
  reportExecutionId: NonEmptyStringSchema,
  auditTraceId: NonEmptyStringSchema,
});
export type M20LifecycleEvidence = z.infer<typeof M20LifecycleEvidenceSchema>;

export const M20RuntimeRunResultSchema = z.object({
  runId: NonEmptyStringSchema,
  startedAt: NonEmptyStringSchema,
  finishedAt: NonEmptyStringSchema,
  status: M20RuntimeProofStatusSchema,
  passedScenarioIds: z.array(z.enum(E2ECertificationScenarioIds)),
  failedScenarioIds: z.array(z.enum(E2ECertificationScenarioIds)),
  skippedScenarioIds: z.array(z.enum(E2ECertificationScenarioIds)),
  evidenceFiles: z.array(NonEmptyStringSchema).min(1),
  evidenceManifestChecksum: NonEmptyStringSchema,
});
export type M20RuntimeRunResult = z.infer<typeof M20RuntimeRunResultSchema>;

export const M20LifecycleProofRows = [
  {
    segment: 'CUSTOMER_CONTRACT_PROJECT_INITIATION',
    controlId: 'M20-CUSTOMER-CONTRACT-PROJECT-CONTINUITY',
    scenarioId: 'C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH',
    commandChain: ['create customer', 'create customer site', 'create contract', 'create project'],
    requiredEvidence: ['customer row', 'contract row', 'project row', 'audit trace'],
    criticalInvariants: ['Project belongs to the same tenant/branch/customer/contract chain', 'No organizationId is accepted from client payload'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'PROJECT_BOM_MATERIAL_REQUIREMENT',
    controlId: 'M20-PROJECT-BOM-MATERIAL-REQUIREMENT-CONTINUITY',
    scenarioId: 'C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH',
    commandChain: ['create BOM', 'approve BOM', 'create material requirement', 'reserve or request material'],
    requiredEvidence: ['approved BOM', 'material requirement', 'project costing snapshot'],
    criticalInvariants: ['Only approved BOM drives material demand', 'Project cost source references are immutable'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'PROCUREMENT_RFQ_PO_GRN',
    controlId: 'M20-PROCUREMENT-RFQ-PO-GRN-CONTINUITY',
    scenarioId: 'C17-PROCUREMENT-THREE-WAY-MATCH-TO-AP-JOURNAL-PAYMENT',
    commandChain: ['approve PR', 'create RFQ', 'invite vendors', 'submit quotation', 'select quotation', 'create PO', 'approve PO', 'receive GRN'],
    requiredEvidence: ['PR approval', 'RFQ invite', 'selected quote', 'PO', 'GRN accepted quantities'],
    criticalInvariants: ['PO originates from selected quote and approved PR', 'GRN cannot over-receive PO quantity'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'INVENTORY_STOCK_LEDGER_SERIAL_BATCH',
    controlId: 'M20-INVENTORY-LEDGER-SERIAL-BATCH-CONTINUITY',
    scenarioId: 'C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST',
    commandChain: ['post GRN', 'write stock transaction', 'update balance', 'register serial/batch', 'reserve/issue stock'],
    requiredEvidence: ['stock transaction ledger', 'stock balance before/after', 'serial/batch register'],
    criticalInvariants: ['Stock ledger is append-only', 'Balance cannot go negative under concurrency'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'ASSET_INSTALLATION_QR_WARRANTY',
    controlId: 'M20-ASSET-INSTALLATION-QR-WARRANTY-CONTINUITY',
    scenarioId: 'C17-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE',
    commandChain: ['create asset from serial', 'install asset at customer site', 'create QR token hash', 'start warranty', 'schedule maintenance'],
    requiredEvidence: ['asset history', 'QR hash prefix', 'warranty record', 'maintenance plan'],
    criticalInvariants: ['Raw QR token is never persisted', 'Installed asset traces to serialized stock'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'SERVICE_TICKET_SLA_WORK_ORDER',
    controlId: 'M20-SERVICE-TICKET-SLA-WORKORDER-CONTINUITY',
    scenarioId: 'C17-FIELD-SERVICE-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY',
    commandChain: ['create ticket', 'apply SLA', 'create work order', 'assign technician', 'record onsite visit', 'submit service report'],
    requiredEvidence: ['ticket SLA snapshot', 'work-order state trace', 'technician assignment', 'service report'],
    criticalInvariants: ['Only assigned technician can progress work order', 'Completion requires service report evidence'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'MAINTENANCE_PREVENTIVE_CORRECTIVE',
    controlId: 'M20-MAINTENANCE-PREVENTIVE-CORRECTIVE-CONTINUITY',
    scenarioId: 'C17-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE',
    commandChain: ['scan due maintenance', 'generate work order once', 'close maintenance execution', 'roll next schedule'],
    requiredEvidence: ['due schedule', 'generated work order', 'maintenance execution', 'next schedule'],
    criticalInvariants: ['Due scan is discover-only', 'Concurrent generation creates one work order'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'FINANCE_INVOICE_JOURNAL_PAYMENT',
    controlId: 'M20-FINANCE-INVOICE-JOURNAL-PAYMENT-CONTINUITY',
    scenarioId: 'C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE',
    commandChain: ['three-way match supplier invoice', 'create payable', 'post balanced journal', 'pay supplier idempotently', 'reverse by reversal entry only'],
    requiredEvidence: ['match result', 'payable row', 'balanced journal', 'payment idempotency proof', 'reversal pair'],
    criticalInvariants: ['Journal lines balance', 'Retry does not duplicate payment side effects'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'DOCUMENT_NOTIFICATION_REPORT_EXPORT',
    controlId: 'M20-DOCUMENT-NOTIFICATION-REPORT-EVIDENCE',
    scenarioId: 'C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT',
    commandChain: ['upload evidence document', 'download authorized file', 'emit notification', 'export report'],
    requiredEvidence: ['document version', 'access log', 'notification recipient log', 'report export artifact'],
    criticalInvariants: ['Storage goes through backend StorageService', 'Worker handles side effects only'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'PORTAL_PWA_OFFLINE_APPROVAL',
    controlId: 'M20-PORTAL-PWA-OFFLINE-REPLAY-EVIDENCE',
    scenarioId: 'C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES',
    commandChain: ['customer approval', 'vendor acknowledgement', 'technician offline command replay', 'resolve conflicts'],
    requiredEvidence: ['portal activity log', 'offline sync result', 'payload hash replay proof'],
    criticalInvariants: ['Portal scope cannot escape linked customer/vendor/technician resource', 'Offline duplicate command cannot change payload'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'SECURITY_ABUSE_MAKER_CHECKER',
    controlId: 'M20-SECURITY-ABUSE-MAKER-CHECKER-EVIDENCE',
    scenarioId: 'C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES',
    commandChain: ['attempt IDOR', 'attempt self-approval', 'attempt missing permission mutation', 'verify audit'],
    requiredEvidence: ['403/404 traces', 'maker-checker rejection', 'audit log'],
    criticalInvariants: ['Abuse cases are denied and audited', 'High-risk commands require maker-checker where configured'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    segment: 'RELEASE_EVIDENCE_MANIFEST',
    controlId: 'M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST',
    scenarioId: 'C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION',
    commandChain: ['collect scenario outputs', 'checksum evidence manifest', 'block production on any failed/skipped scenario'],
    requiredEvidence: ['full lifecycle result JSON', 'evidence manifest checksum', 'release decision'],
    criticalInvariants: ['Zero skipped critical scenarios', 'Zero failed critical scenarios'],
    runtimeRequired: true,
    blocksProduction: true,
  },
] as const satisfies readonly M20LifecycleProofRow[];

export const M20RuntimeRequiredScenarios = [
  'M20-RUNTIME-CUSTOMER-CONTRACT-PROJECT-TO-FINANCE-HAPPY-PATH',
  'M20-RUNTIME-THREE-WAY-MATCH-TO-PAYMENT-IDEMPOTENCY',
  'M20-RUNTIME-STOCK-LEDGER-SERIAL-ASSET-INSTALLATION',
  'M20-RUNTIME-TICKET-SLA-WORKORDER-SERVICE-REPORT-ASSET-HISTORY',
  'M20-RUNTIME-PREVENTIVE-MAINTENANCE-GENERATES-ONE-WORKORDER',
  'M20-RUNTIME-DOCUMENT-NOTIFICATION-REPORT-EXPORT-EVIDENCE',
  'M20-RUNTIME-PORTAL-PWA-OFFLINE-REPLAY-SCOPE',
  'M20-RUNTIME-ABUSE-MAKER-CHECKER-PRODUCTION-BLOCKER',
] as const;

export const M20FullLifecycleManifest = {
  pass: 'M20',
  name: 'Full Lifecycle E2E Runtime Certification Preflight',
  marker: MISSING_PASS_M20_SOURCE_PREFLIGHT_FULL_LIFECYCLE_E2E,
  lockedArchitectureUnchanged: true,
  noStackReplacement: true,
  runtimeCertificationRequiredBeforeProduction: true,
  lifecycleSegmentCount: M20LifecycleProofRows.length,
  requiredRuntimeScenarioCount: M20RuntimeRequiredScenarios.length,
  rows: M20LifecycleProofRows,
  runtimeScenarios: M20RuntimeRequiredScenarios,
} as const;

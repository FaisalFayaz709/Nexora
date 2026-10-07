import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { AssetStatusSchema } from '../../schemas/status-models';

export const AssetLifecycleCompletionMaturity =
  'PASS_12_SOURCE_LEVEL_ASSET_LIFECYCLE_QR_COMPLETION' as const;

export const AssetLifecycleCompletionSubjects = [
  'SERIAL_STOCK_TO_ASSET_REGISTRATION',
  'CUSTOMER_SITE_PROJECT_PLACEMENT',
  'ASSET_INSTALLATION_ATOMICITY',
  'QR_HASH_STORAGE_AND_ONE_TIME_DISCLOSURE',
  'QR_ROTATION_AND_EXPIRY',
  'REPLACEMENT_QR_REVOCATION',
  'RETIREMENT_APPROVAL_AND_QR_REVOCATION',
  'RMA_VENDOR_GOVERNANCE',
  'WARRANTY_STATUS_AND_EXPIRY_EVENT',
  'ASSET_COST_HISTORY',
  'ASSET_HISTORY_APPEND_ONLY',
  'FIELD_SERVICE_HISTORY_LINKAGE',
  'MAINTENANCE_HISTORY_LINKAGE',
  'CROSS_TENANT_QR_DENIAL',
] as const;

export type AssetLifecycleCompletionSubject = typeof AssetLifecycleCompletionSubjects[number];

export const AssetLifecycleCompletionRoutes = [
  'GET /api/v1/assets',
  'GET /api/v1/assets/:id',
  'POST /api/v1/assets',
  'PATCH /api/v1/assets/:id',
  'POST /api/v1/assets/register-from-stock',
  'POST /api/v1/assets/:id/install',
  'POST /api/v1/assets/:id/replace',
  'POST /api/v1/assets/:id/retire',
  'GET /api/v1/assets/:id/history',
  'POST /api/v1/assets/:id/qr/rotate',
  'GET /api/v1/asset-qr/:token',
  'POST /api/v1/assets/:id/rma',
  'GET /api/v1/customer-sites/:id/assets',
] as const;

export const AssetLifecycleCompletionInvariants = [
  'M12-ASSET-INSTALLATION-UPDATES-SERIAL-STOCK-ASSET-HISTORY-AUDIT-QR-IN-ONE-TRANSACTION',
  'M12-ASSET-QR-TOKEN-IS-HASHED-BEFORE-PERSISTENCE-AND-RAW-TOKEN-RETURNED-ONCE',
  'M12-ASSET-QR-RESOLUTION-REQUIRES-AUTHENTICATED-TENANT-CONTEXT',
  'M12-ASSET-REPLACEMENT-REVOKES-OLD-ASSET-QR-AND-PRESERVES-PLACEMENT-CONTINUITY',
  'M12-ASSET-RETIREMENT-REVOKES-QR-AND-USES-APPROVAL-WHEN-CONFIGURED',
  'M12-ASSET-RMA-REQUIRES-APPROVED-VENDOR',
  'M12-ASSET-WARRANTY-EXPIRY-IS-DERIVED-AND-EXPIRING-EVENT-IS-EMITTED',
  'M12-ASSET-HISTORY-IS-APPEND-ONLY-AND-LINKED-TO-REFERENCE-ENTITIES',
  'M12-ASSET-COST-CHANGES-ARE-SNAPSHOT-IN-HISTORY-AND-AUDIT',
  'M12-ASSET-TERMINAL-STATES-BLOCK-FREE-EDIT-INSTALL-REPLACE-RMA',
] as const;

export const AssetLifecycleRuntimeScenarios = [
  'M12-RUNTIME-SERIAL-STOCK-REGISTER-INSTALL-CONSUME-SERIAL-AND-ACTIVATE-ASSET',
  'M12-RUNTIME-INSTALLATION-CREATES-ASSET-INSTALLATION-HISTORY-AUDIT-EVENT-AND-HASHED-QR',
  'M12-RUNTIME-QR-ROTATE-DOES-NOT-LEAK-PERSISTED-HASH-AND-OLD-TOKEN-FAILS',
  'M12-RUNTIME-QR-RESOLVE-DENIES-CROSS-TENANT-TOKEN-USE',
  'M12-RUNTIME-REPLACEMENT-REVOKES-OLD-ASSET-QR-AND-LINKS-REPLACEMENT-ASSET',
  'M12-RUNTIME-RETIREMENT-REVOKES-QR-AND-BLOCKS-FURTHER-INSTALL-REPLACE-RMA',
  'M12-RUNTIME-RMA-BLOCKS-BLACKLISTED-OR-UNAPPROVED-VENDOR',
  'M12-RUNTIME-WARRANTY-EXPIRY-SCAN-EMITS-ASSET-WARRANTY-EXPIRING-EVENT',
  'M12-RUNTIME-FIELD-SERVICE-AND-MAINTENANCE-APPEND-ASSET-HISTORY',
  'M12-RUNTIME-ASSET-COST-HISTORY-FEEDS-PROJECT-COSTING-READ-MODEL',
] as const;

export const AssetLifecycleCompletionRowSchema = z.object({
  subject: z.enum(AssetLifecycleCompletionSubjects),
  ownerModule: z.enum(['assets', 'inventory', 'projects', 'customers', 'vendors', 'maintenance', 'service', 'finance']),
  lockedRoute: z.string().min(1),
  transactionRequired: z.boolean(),
  auditRequired: z.boolean(),
  tenantIsolationRequired: z.boolean(),
  runtimeScenario: z.enum(AssetLifecycleRuntimeScenarios),
});

export const AssetLifecycleCompletionRows = [
  {
    subject: 'SERIAL_STOCK_TO_ASSET_REGISTRATION',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/register-from-stock',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-SERIAL-STOCK-REGISTER-INSTALL-CONSUME-SERIAL-AND-ACTIVATE-ASSET',
  },
  {
    subject: 'ASSET_INSTALLATION_ATOMICITY',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/:id/install',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-INSTALLATION-CREATES-ASSET-INSTALLATION-HISTORY-AUDIT-EVENT-AND-HASHED-QR',
  },
  {
    subject: 'QR_ROTATION_AND_EXPIRY',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/:id/qr/rotate',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-QR-ROTATE-DOES-NOT-LEAK-PERSISTED-HASH-AND-OLD-TOKEN-FAILS',
  },
  {
    subject: 'REPLACEMENT_QR_REVOCATION',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/:id/replace',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-REPLACEMENT-REVOKES-OLD-ASSET-QR-AND-LINKS-REPLACEMENT-ASSET',
  },
  {
    subject: 'RETIREMENT_APPROVAL_AND_QR_REVOCATION',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/:id/retire',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-RETIREMENT-REVOKES-QR-AND-BLOCKS-FURTHER-INSTALL-REPLACE-RMA',
  },
  {
    subject: 'RMA_VENDOR_GOVERNANCE',
    ownerModule: 'assets',
    lockedRoute: 'POST /api/v1/assets/:id/rma',
    transactionRequired: true,
    auditRequired: true,
    tenantIsolationRequired: true,
    runtimeScenario: 'M12-RUNTIME-RMA-BLOCKS-BLACKLISTED-OR-UNAPPROVED-VENDOR',
  },
] as const;

export const AssetQrResolutionDataSchema = z.object({
  id: UuidSchema,
  assetNo: NonEmptyStringSchema,
  productId: UuidSchema,
  customerId: UuidSchema,
  siteId: UuidSchema,
  areaId: UuidSchema.nullable(),
  projectId: UuidSchema,
  status: AssetStatusSchema,
  installedAt: IsoDateTimeSchema.nullable(),
});

export const AssetQrResolutionResponseSchema = apiDataEnvelope(AssetQrResolutionDataSchema);
export const AssetLifecycleHistoryQuerySchema = PageQuerySchema.extend({
  eventType: z.string().min(1).max(120).optional(),
});
export const AssetLifecycleCompletionListSchema = apiListEnvelope(AssetLifecycleCompletionRowSchema);

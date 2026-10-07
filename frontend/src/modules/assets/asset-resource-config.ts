import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type AssetResourceKey = 'assets';
export type AssetScopedSurfaceKey = 'history' | 'install' | 'replace' | 'retire' | 'qr' | 'rma';
export type AssetCommandKey = 'register-from-stock' | 'install-asset' | 'replace-asset' | 'retire-asset' | 'rotate-asset-qr' | 'create-asset-rma';

export type AssetCommandConfig = {
  key: AssetCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  irreversibleEffects: readonly string[];
};

export type AssetResourceConfig = {
  key: AssetResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  endpointMode: 'crud';
  viewPermission: PermissionKey;
  createPermission: PermissionKey;
  updatePermission: PermissionKey;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
};

export type AssetScopedSurfaceConfig = {
  key: AssetScopedSurfaceKey;
  title: string;
  routeSuffix: string;
  endpointTemplate: string;
  method: 'GET' | 'POST';
  permission: PermissionKey;
  readModel: boolean;
  commandKey?: AssetCommandKey;
  description: string;
  auditNotes: readonly string[];
};

export const AssetResourceConfigs = {
  assets: {
    key: 'assets',
    title: 'Assets',
    singularTitle: 'Asset',
    routeBase: '/assets',
    endpoint: '/assets',
    endpointMode: 'crud',
    viewPermission: 'asset.view',
    createPermission: 'asset.create',
    updatePermission: 'asset.update',
    description: 'Installed/customer asset aggregate connecting product, serial, customer site, project, warranty, QR tag, service history and replacement/retirement lifecycle.',
    columns: [
      { key: 'assetNo', label: 'Asset No' },
      { key: 'productId', label: 'Product' },
      { key: 'serialNumberId', label: 'Serial' },
      { key: 'customerId', label: 'Customer' },
      { key: 'siteId', label: 'Site' },
      { key: 'projectId', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'installedAt', label: 'Installed' },
    ],
    identityFields: ['assetNo', 'productId', 'serialNumberId', 'customerId', 'siteId', 'projectId', 'status'],
    profileFields: ['areaId', 'installedAt', 'purchaseCost', 'supplierVendorId', 'warrantyStatus', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Registration from stock', description: 'Register asset from eligible serial/stock through /assets/register-from-stock.', href: '/assets/register-from-stock' },
      { title: 'Installation', description: 'Install command atomically links stock consumption, serial state, asset history and audit evidence.' },
      { title: 'QR and history', description: 'QR rotate revokes prior tokens; history shows lifecycle events without bypassing authorization.' },
      { title: 'Warranty and RMA', description: 'Warranty/RMA actions maintain supplier traceability and replacement history.' },
    ],
  },
} satisfies Record<AssetResourceKey, AssetResourceConfig>;

export const AssetScopedSurfaceConfigs = {
  history: { key: 'history', title: 'Asset History', routeSuffix: 'history', endpointTemplate: '/assets/:id/history', method: 'GET', permission: 'asset.view', readModel: true, description: 'Lifecycle history for procurement, warehouse, installation, maintenance, replacement and retirement events.', auditNotes: ['History is backend-generated and tenant scoped.', 'Frontend displays history and never fabricates asset lifecycle events.'] },
  install: { key: 'install', title: 'Install Asset', routeSuffix: 'install', endpointTemplate: '/assets/:id/install', method: 'POST', permission: 'asset.install', readModel: false, commandKey: 'install-asset', description: 'Installation command that links asset to site/area/project/technician and consumes serialized stock through backend transaction boundaries.', auditNotes: ['Requires eligible asset/serial state.', 'Commits installation history, status, audit and QR/document side effects correctly.'] },
  replace: { key: 'replace', title: 'Replace Asset', routeSuffix: 'replace', endpointTemplate: '/assets/:id/replace', method: 'POST', permission: 'asset.replace', readModel: false, commandKey: 'replace-asset', description: 'Replacement command links old and new assets and preserves customer-site service continuity.', auditNotes: ['Replacement is not a destructive update.', 'Old and new asset history remain traceable.'] },
  retire: { key: 'retire', title: 'Retire Asset', routeSuffix: 'retire', endpointTemplate: '/assets/:id/retire', method: 'POST', permission: 'asset.retire', readModel: false, commandKey: 'retire-asset', description: 'Retirement command with approval/audit expectation for asset disposal.', auditNotes: ['Asset retirement cannot be a generic status PATCH.', 'High-risk disposal is audit and approval aware.'] },
  qr: { key: 'qr', title: 'Rotate Asset QR', routeSuffix: 'qr', endpointTemplate: '/assets/:id/qr/rotate', method: 'POST', permission: 'asset.manage_qr', readModel: false, commandKey: 'rotate-asset-qr', description: 'QR rotation command revokes previous token and preserves authorized QR lookup behavior.', auditNotes: ['Token alone does not bypass authorization.', 'Expired/rotated QR tokens must not grant access.'] },
  rma: { key: 'rma', title: 'Create Asset RMA', routeSuffix: 'rma', endpointTemplate: '/assets/:id/rma', method: 'POST', permission: 'asset.rma', readModel: false, commandKey: 'create-asset-rma', description: 'Supplier return/RMA command for faulty equipment repair or replacement.', auditNotes: ['RMA links vendor, asset and resolution evidence.', 'Supplier-side warranty claims remain traceable.'] },
} satisfies Record<AssetScopedSurfaceKey, AssetScopedSurfaceConfig>;

export const AssetCommandConfigs: readonly AssetCommandConfig[] = [
  { key: 'install-asset', label: 'Install asset', endpointTemplate: '/assets/:id/install', requiredPermission: 'asset.install', idempotent: true, allowedStates: ['PROCURED', 'IN_WAREHOUSE', 'ALLOCATED', 'ISSUED'], irreversibleEffects: ['Consumes/links serialized stock and installation history.', 'Creates audit trail and may generate QR/document/notification jobs after commit.'] },
  { key: 'replace-asset', label: 'Replace asset', endpointTemplate: '/assets/:id/replace', requiredPermission: 'asset.replace', idempotent: true, allowedStates: ['ACTIVE', 'UNDER_MAINTENANCE', 'REPAIRED'], irreversibleEffects: ['Links replacement asset to the old asset history.', 'Preserves customer-site service traceability.'] },
  { key: 'retire-asset', label: 'Retire asset', endpointTemplate: '/assets/:id/retire', requiredPermission: 'asset.retire', idempotent: true, allowedStates: ['ACTIVE', 'UNDER_MAINTENANCE', 'REPAIRED', 'INSTALLED'], irreversibleEffects: ['Retires the asset through an explicit lifecycle command.', 'Requires audit/approval controls where disposal policy applies.'] },
  { key: 'rotate-asset-qr', label: 'Rotate QR token', endpointTemplate: '/assets/:id/qr/rotate', requiredPermission: 'asset.manage_qr', idempotent: true, allowedStates: ['INSTALLED', 'ACTIVE', 'UNDER_MAINTENANCE', 'REPAIRED'], irreversibleEffects: ['Revokes previous QR token.', 'Creates a new authorized lookup token without bypassing RBAC.'] },
  { key: 'create-asset-rma', label: 'Create RMA', endpointTemplate: '/assets/:id/rma', requiredPermission: 'asset.rma', idempotent: true, allowedStates: ['ACTIVE', 'UNDER_MAINTENANCE', 'REPAIRED'], irreversibleEffects: ['Creates supplier return evidence.', 'Links vendor warranty/replacement history to the asset.'] },
] as const;

export const AssetCompletionPrinciples = [
  'Assets remain lifecycle records connected to serialized stock, project installation, customer site, warranty, QR and service history.',
  'Install, replace, retire, QR rotate and RMA use explicit Fastify command endpoints, not generic frontend status edits.',
  'Asset QR resolution is authorized; a token alone must not bypass RBAC, tenant or portal scope.',
  'Asset history is displayed from backend audit/history read models and never invented by the frontend.',
] as const;

export function getAssetResourceConfig(key: AssetResourceKey): AssetResourceConfig {
  return AssetResourceConfigs[key];
}

export function getAssetScopedSurfaceConfig(key: AssetScopedSurfaceKey): AssetScopedSurfaceConfig {
  return AssetScopedSurfaceConfigs[key];
}

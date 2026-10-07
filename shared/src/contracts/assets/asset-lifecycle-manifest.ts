export const C7AssetLifecycleManifest = {
  pass: 'C7_ASSET_LIFECYCLE_QR_TRACKING',
  blueprintChain: [
    'SUPPLIER_TO_WAREHOUSE',
    'WAREHOUSE_TO_PROJECT',
    'PROJECT_TO_TECHNICIAN',
    'TECHNICIAN_TO_CUSTOMER_SITE',
    'CUSTOMER_SITE_TO_INSTALLED_ASSET',
    'WARRANTY_TO_MAINTENANCE_TO_RMA_TO_RETIREMENT',
  ],
  lifecycleStatuses: [
    'PROCURED',
    'IN_WAREHOUSE',
    'ALLOCATED',
    'ISSUED',
    'INSTALLED',
    'ACTIVE',
    'UNDER_MAINTENANCE',
    'REPAIRED',
    'REPLACED',
    'RETIRED',
  ],
  requiredRoutes: [
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
  ],
  invariants: [
    'SERIAL_TRACKED_PRODUCTS_USE_REGISTER_FROM_STOCK',
    'INSTALLATION_ATOMICALLY_CONSUMES_SERIALIZED_STOCK',
    'INSTALLED_ASSET_CREATES_ASSET_INSTALLATION_HISTORY_AND_QR_TOKEN',
    'QR_TOKEN_STORED_AS_HASH_NOT_RAW_SECRET',
    'QR_RESOLVE_REQUIRES_AUTHENTICATED_TENANT_CONTEXT',
    'QR_ROTATION_REVOKES_OR_REPLACES_PRIOR_TOKEN',
    'RETIRED_ASSET_REVOKES_QR_AND_BLOCKS_MUTATION',
    'REPLACEMENT_LINK_REQUIRES_SAME_CUSTOMER_SITE_PROJECT',
    'WARRANTY_STATUS_DERIVED_FROM_DATES_AND_EXPIRING_WINDOW',
    'RMA_REQUIRES_APPROVED_VENDOR_AND_NON_RETIRED_ASSET',
    'ASSET_HISTORY_IS_APPEND_ONLY_AND_TENANT_SCOPED',
    'BullMQ-is-not-used-for-asset-stock-status-qr-retirement-or-replacement-state-mutation',
  ],
  runtimeAcceptanceIds: [
    'C7-ASSET-REGISTER-SERIAL-FROM-STOCK',
    'C7-ASSET-INSTALL-CONSUMES-SERIAL-AND-CREATES-QR',
    'C7-ASSET-QR-ROTATE-AND-REVOKE-OLD-TOKEN',
    'C7-ASSET-QR-TENANT-AUTHORIZATION',
    'C7-ASSET-REPLACEMENT-SAME-PLACEMENT-GUARD',
    'C7-ASSET-RETIREMENT-APPROVAL-AND-QR-REVOCATION',
    'C7-ASSET-WARRANTY-EXPIRING-EVENT',
    'C7-ASSET-RMA-APPROVED-VENDOR-GUARD',
    'C7-ASSET-HISTORY-CONTINUITY',
  ],
  transactionBoundaries: {
    registerFromStock:
      'number sequence + serial lock + asset row + serial asset link + history + warranty + audit in one PostgreSQL transaction',
    install:
      'asset lock + placement guard + AssetInstallation + serialized stock consumption + asset status + history + QR hash + audit + event in one PostgreSQL transaction',
    replace:
      'old asset lock + replacement lock + same placement guard + replaced link + history + audit in one PostgreSQL transaction',
    retire:
      'asset lock + optional approval or retirement + QR revocation + history + audit in one PostgreSQL transaction',
    rma:
      'approved vendor guard + RMA number + RMA row + asset history + audit in one PostgreSQL transaction',
  },
} as const;

export type C7AssetLifecycleAcceptanceId =
  (typeof C7AssetLifecycleManifest.runtimeAcceptanceIds)[number];

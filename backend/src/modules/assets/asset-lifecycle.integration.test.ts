import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Asset lifecycle and QR tracking runtime acceptance',
  requirements: [
    {
      name: 'serialized product is registered as an asset only from an eligible locked SerialNumber',
      evidence: 'create serial-tracked product stock, call register-from-stock, verify one Asset, one SerialNumber.assetId link, ASSET_REGISTERED_FROM_STOCK history and audit are committed together',
      scenarioId: 'C7-ASSET-REGISTER-SERIAL-FROM-STOCK',
    },
    {
      name: 'asset installation consumes serialized stock and creates installation evidence plus QR token',
      evidence: 'install registered asset, verify AssetInstallation, serial status, StockTransaction, active Asset status, asset.installed event, ASSET_INSTALLED audit and QR hash exist in the same transaction',
      scenarioId: 'C7-ASSET-INSTALL-CONSUMES-SERIAL-AND-CREATES-QR',
    },
    {
      name: 'QR rotation replaces the active token and revoked or old token cannot resolve',
      evidence: 'rotate QR twice, verify only latest raw token resolves and old/expired/revoked tokens return ASSET_QR_INVALID_OR_EXPIRED',
      scenarioId: 'C7-ASSET-QR-ROTATE-AND-REVOKE-OLD-TOKEN',
    },
    {
      name: 'QR lookup requires authenticated tenant context and never bypasses RBAC or tenant isolation',
      evidence: 'attempt to resolve tenant A asset QR while authenticated in tenant B and verify no asset details leak',
      scenarioId: 'C7-ASSET-QR-TENANT-AUTHORIZATION',
    },
    {
      name: 'asset replacement preserves customer site project continuity',
      evidence: 'replace an active asset with an active replacement at the same customer/site/project and reject a replacement from another site or project',
      scenarioId: 'C7-ASSET-REPLACEMENT-SAME-PLACEMENT-GUARD',
    },
    {
      name: 'retirement uses approval when configured and revokes QR when terminal state is reached',
      evidence: 'configure AssetRetirement approval, request retirement, approve through maker-checker and verify asset status RETIRED, QR revoked, history and audit recorded',
      scenarioId: 'C7-ASSET-RETIREMENT-APPROVAL-AND-QR-REVOCATION',
    },
    {
      name: 'warranty dates derive active expiring expired state and expiring warranties emit event',
      evidence: 'create/update warranty windows, verify derived status, asset.warranty.expiring event and warranty document link if supplied',
      scenarioId: 'C7-ASSET-WARRANTY-EXPIRING-EVENT',
    },
    {
      name: 'RMA requests require approved vendor governance and preserve asset history',
      evidence: 'attempt RMA with unapproved vendor, then approved vendor, verify AssetRMA number, status REQUESTED, history and audit',
      scenarioId: 'C7-ASSET-RMA-APPROVED-VENDOR-GUARD',
    },
    {
      name: 'asset history exposes lifecycle continuity from purchase through retirement',
      evidence: 'perform registration, installation, QR rotation, service event, RMA or retirement and verify history is append-only, chronological and tenant scoped',
      scenarioId: 'C7-ASSET-HISTORY-CONTINUITY',
    },
  ],
});

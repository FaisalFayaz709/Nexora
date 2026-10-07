import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Assets PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'prevents duplicate serial-to-asset registration under concurrency',
      evidence: 'race asset registration for one SerialNumber and verify one Asset, one serial state change and one audit event',
    },
    {
      name: 'keeps serialized installation stock, serial, asset, history and audit atomic',
      evidence: 'install a serialized asset and verify Asset status, SerialNumber state, AssetHistory and StockTransaction are committed or rolled back together',
    },
    {
      name: 'rejects rotated expired or revoked QR tokens without leaking tenant data',
      evidence: 'rotate QR token and verify the old token cannot resolve the asset for unauthorized or stale requests',
    },
  ],
});

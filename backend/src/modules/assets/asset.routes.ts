import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { AssetController } from './asset.controller.js';

const defs = {
  list: defineLockedRoute('GET', '/api/v1/assets'),
  get: defineLockedRoute('GET', '/api/v1/assets/:id'),
  create: defineLockedRoute('POST', '/api/v1/assets'),
  update: defineLockedRoute('PATCH', '/api/v1/assets/:id'),
  registerFromStock: defineLockedRoute('POST', '/api/v1/assets/register-from-stock'),
  install: defineLockedRoute('POST', '/api/v1/assets/:id/install'),
  replace: defineLockedRoute('POST', '/api/v1/assets/:id/replace'),
  retire: defineLockedRoute('POST', '/api/v1/assets/:id/retire'),
  history: defineLockedRoute('GET', '/api/v1/assets/:id/history'),
  rotateQr: defineLockedRoute('POST', '/api/v1/assets/:id/qr/rotate'),
  resolveQr: defineLockedRoute('GET', '/api/v1/asset-qr/:token'),
  rma: defineLockedRoute('POST', '/api/v1/assets/:id/rma'),
  siteAssets: defineLockedRoute('GET', '/api/v1/customer-sites/:id/assets'),
} as const;

export function assetRoutes(
  controller: AssetController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'assets');
      await identity.assertPermission(request, permission);
    },
  ];

  const authenticatedAssetGuard = [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'assets');
    },
  ];

  return async (app) => {
    app.get(defs.list.relativePath, { schema: defs.list.schema, preHandler: guard('asset.view'), handler: controller.list });
    app.get(defs.get.relativePath, { schema: defs.get.schema, preHandler: guard('asset.view'), handler: controller.get });
    app.post(defs.create.relativePath, { schema: defs.create.schema, preHandler: guard('asset.create'), handler: controller.create });
    app.patch(defs.update.relativePath, { schema: defs.update.schema, preHandler: guard('asset.update'), handler: controller.update });
    app.post(defs.registerFromStock.relativePath, { schema: defs.registerFromStock.schema, preHandler: guard('asset.create'), handler: controller.registerFromStock });
    app.post(defs.install.relativePath, { schema: defs.install.schema, preHandler: guard('asset.install'), handler: controller.install });
    app.post(defs.replace.relativePath, { schema: defs.replace.schema, preHandler: guard('asset.replace'), handler: controller.replace });
    app.post(defs.retire.relativePath, { schema: defs.retire.schema, preHandler: guard('asset.retire'), handler: controller.retire });
    app.get(defs.history.relativePath, { schema: defs.history.schema, preHandler: guard('asset.view'), handler: controller.history });
    app.post(defs.rotateQr.relativePath, { schema: defs.rotateQr.schema, preHandler: guard('asset.manage_qr'), handler: controller.rotateQr });
    app.get(defs.resolveQr.relativePath, { schema: defs.resolveQr.schema, preHandler: authenticatedAssetGuard, handler: controller.resolveQr });
    app.post(defs.rma.relativePath, { schema: defs.rma.schema, preHandler: guard('asset.rma'), handler: controller.rma });
    app.get(defs.siteAssets.relativePath, { schema: defs.siteAssets.schema, preHandler: guard('asset.view'), handler: controller.listBySite });
  };
}

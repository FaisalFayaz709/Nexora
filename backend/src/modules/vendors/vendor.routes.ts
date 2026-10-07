import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { VendorController } from './vendor.controller.js';

const list = defineLockedRoute('GET', '/api/v1/vendors');
const get = defineLockedRoute('GET', '/api/v1/vendors/:id');
const create = defineLockedRoute('POST', '/api/v1/vendors');
const update = defineLockedRoute('PATCH', '/api/v1/vendors/:id');
const performance = defineLockedRoute('GET', '/api/v1/vendors/:id/performance');
const purchaseOrders = defineLockedRoute('GET', '/api/v1/vendors/:id/purchase-orders');
const blacklist = defineLockedRoute('POST', '/api/v1/vendors/:id/blacklist');

export function vendorRoutes(
  controller: VendorController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) =>
      access.assertModuleEnabled(request.tenant!.organizationId, 'vendors'),
  ];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('vendor.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('vendor.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('vendor.create'), handler: controller.create });
    app.patch(update.relativePath, { schema: update.schema, preHandler: guard('vendor.update'), handler: controller.update });
    app.get(performance.relativePath, { schema: performance.schema, preHandler: guard('vendor.view'), handler: controller.performance });
    app.get(purchaseOrders.relativePath, { schema: purchaseOrders.schema, preHandler: guard('purchase_order.view'), handler: controller.purchaseOrders });
    app.post(blacklist.relativePath, { schema: blacklist.schema, preHandler: guard('vendor.risk.manage'), handler: controller.blacklist });
  };
}

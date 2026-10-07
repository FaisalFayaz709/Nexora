import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { InventoryController } from './inventory.controller.js';

const stock = defineLockedRoute('GET', '/api/v1/inventory/stock');
const ledger = defineLockedRoute('GET', '/api/v1/inventory/ledger');
const serial = defineLockedRoute('GET', '/api/v1/inventory/serials/:serialNo');
const reserve = defineLockedRoute('POST', '/api/v1/inventory/reservations');
const release = defineLockedRoute('DELETE', '/api/v1/inventory/reservations/:id');
const createTransfer = defineLockedRoute('POST', '/api/v1/inventory/transfers');
const dispatchTransfer = defineLockedRoute('POST', '/api/v1/inventory/transfers/:id/dispatch');
const receiveTransfer = defineLockedRoute('POST', '/api/v1/inventory/transfers/:id/receive');
const createAdjustment = defineLockedRoute('POST', '/api/v1/inventory/adjustments');
const postAdjustment = defineLockedRoute('POST', '/api/v1/inventory/adjustments/:id/post');

export function inventoryOperationRoutes(
  controller: InventoryController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'inventory'),
  ];

  return async (app) => {
    app.get(stock.relativePath, { schema: stock.schema, preHandler: guard('inventory.view'), handler: controller.stock });
    app.get(ledger.relativePath, { schema: ledger.schema, preHandler: guard('inventory.view'), handler: controller.ledger });
    app.get(serial.relativePath, { schema: serial.schema, preHandler: guard('inventory.view'), handler: controller.serial });
    app.post(reserve.relativePath, { schema: reserve.schema, preHandler: guard('inventory.reserve'), handler: controller.reserve });
    app.delete(release.relativePath, { schema: release.schema, preHandler: guard('inventory.reserve'), handler: controller.releaseReservation });
    app.post(createTransfer.relativePath, { schema: createTransfer.schema, preHandler: guard('inventory.transfer'), handler: controller.createTransfer });
    app.post(dispatchTransfer.relativePath, { schema: dispatchTransfer.schema, preHandler: guard('inventory.transfer'), handler: controller.dispatchTransfer });
    app.post(receiveTransfer.relativePath, { schema: receiveTransfer.schema, preHandler: guard('inventory.receive'), handler: controller.receiveTransfer });
    app.post(createAdjustment.relativePath, { schema: createAdjustment.schema, preHandler: guard('inventory.adjust'), handler: controller.createAdjustment });
    app.post(postAdjustment.relativePath, { schema: postAdjustment.schema, preHandler: guard('inventory.adjust'), handler: controller.postAdjustment });
  };
}

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { PurchaseContractController } from './purchase-contract.controller.js';

const defs = {
  create: defineLockedRoute('POST', '/api/v1/purchase-contracts'),
  approve: defineLockedRoute('POST', '/api/v1/purchase-contracts/:id/approve'),
  releaseOrder: defineLockedRoute('POST', '/api/v1/purchase-contracts/:id/create-release-order'),
} as const;

export function purchaseContractRoutes(
  controller: PurchaseContractController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'procurement');
      await identity.assertPermission(request, permission);
    },
  ];
  return async (app) => {
    app.post(defs.create.relativePath, { schema: defs.create.schema, preHandler: guard('purchase_contract.manage'), handler: controller.create });
    app.post(defs.approve.relativePath, { schema: defs.approve.schema, preHandler: guard('purchase_contract.manage'), handler: controller.approve });
    app.post(defs.releaseOrder.relativePath, { schema: defs.releaseOrder.schema, preHandler: guard('purchase_contract.manage'), handler: controller.releaseOrder });
  };
}

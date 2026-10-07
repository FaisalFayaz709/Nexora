import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { CommunicationController } from './communication.controller.js';

const defs = {
  list: defineLockedRoute('GET', '/api/v1/communications'),
  send: defineLockedRoute('POST', '/api/v1/communications/send'),
  delivery: defineLockedRoute('GET', '/api/v1/communications/:id/delivery'),
} as const;

export function communicationRoutes(
  controller: CommunicationController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'notifications');
      await identity.assertPermission(request, permission);
    },
  ];
  return async (app) => {
    app.get(defs.list.relativePath, { schema: defs.list.schema, preHandler: guard('communication.view'), handler: controller.list });
    app.post(defs.send.relativePath, { schema: defs.send.schema, preHandler: guard('communication.send'), handler: controller.send });
    app.get(defs.delivery.relativePath, { schema: defs.delivery.schema, preHandler: guard('communication.view'), handler: controller.delivery });
  };
}

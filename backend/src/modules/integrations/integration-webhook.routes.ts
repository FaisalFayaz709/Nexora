import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { IntegrationWebhookController } from './integration-webhook.controller.js';

const defs = {
  listWebhooks: defineLockedRoute('GET', '/api/v1/integration-webhooks'),
  getWebhook: defineLockedRoute('GET', '/api/v1/integration-webhooks/:id'),
  createWebhook: defineLockedRoute('POST', '/api/v1/integration-webhooks'),
  updateWebhook: defineLockedRoute('PATCH', '/api/v1/integration-webhooks/:id'),
  activateWebhook: defineLockedRoute('POST', '/api/v1/integration-webhooks/:id/activate'),
  deactivateWebhook: defineLockedRoute('POST', '/api/v1/integration-webhooks/:id/deactivate'),
  listDeliveries: defineLockedRoute('GET', '/api/v1/integration-webhook-deliveries'),
  testDelivery: defineLockedRoute('POST', '/api/v1/integration-webhooks/:id/test-delivery'),
} as const;

export function integrationWebhookRoutes(controller: IntegrationWebhookController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'integrations');
      await identity.assertPermission(request, permission);
    },
  ];
  return async (app) => {
    app.get(defs.listWebhooks.relativePath, { schema: defs.listWebhooks.schema, preHandler: guard('integration.webhook.view'), handler: controller.listWebhooks });
    app.get(defs.getWebhook.relativePath, { schema: defs.getWebhook.schema, preHandler: guard('integration.webhook.view'), handler: controller.getWebhook });
    app.post(defs.createWebhook.relativePath, { schema: defs.createWebhook.schema, preHandler: guard('integration.webhook.manage'), handler: controller.createWebhook });
    app.patch(defs.updateWebhook.relativePath, { schema: defs.updateWebhook.schema, preHandler: guard('integration.webhook.manage'), handler: controller.updateWebhook });
    app.post(defs.activateWebhook.relativePath, { schema: defs.activateWebhook.schema, preHandler: guard('integration.webhook.manage'), handler: controller.activateWebhook });
    app.post(defs.deactivateWebhook.relativePath, { schema: defs.deactivateWebhook.schema, preHandler: guard('integration.webhook.manage'), handler: controller.deactivateWebhook });
    app.get(defs.listDeliveries.relativePath, { schema: defs.listDeliveries.schema, preHandler: guard('integration.webhook.view'), handler: controller.listDeliveries });
    app.post(defs.testDelivery.relativePath, { schema: defs.testDelivery.schema, preHandler: guard('integration.webhook.manage'), handler: controller.testDelivery });
  };
}

import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { IntegrationWebhookController } from './integration-webhook.controller.js';
import { integrationWebhookRoutes } from './integration-webhook.routes.js';
import { IntegrationWebhookService } from './integration-webhook.service.js';

export interface IntegrationModuleRuntime { readonly plugin: FastifyPluginAsync; }

export function createIntegrationModule(identity: IdentityFacade, access: PlatformAccessFacade): IntegrationModuleRuntime {
  const service = new IntegrationWebhookService(access);
  return { plugin: integrationWebhookRoutes(new IntegrationWebhookController(service), identity, access) };
}

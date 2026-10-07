import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformConfigurationController } from './platform-configuration.controller.js';

const features = defineLockedRoute('GET', '/api/v1/features');
const setFeature = defineLockedRoute('POST', '/api/v1/organization-features');
const updateModule = defineLockedRoute('PATCH', '/api/v1/module-configurations/:id');

export function platformConfigurationRoutes(
  controller: PlatformConfigurationController,
  identity: IdentityFacade,
): FastifyPluginAsync {
  const authenticated = [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
  ];
  const manage = [
    ...authenticated,
    (request: FastifyRequest) => identity.assertPermission(request, 'feature.manage'),
  ];

  return async (app) => {
    app.get(features.relativePath, {
      schema: features.schema,
      preHandler: authenticated,
      handler: controller.list,
    });
    app.post(setFeature.relativePath, {
      schema: setFeature.schema,
      preHandler: manage,
      handler: controller.setFeature,
    });
    app.patch(updateModule.relativePath, {
      schema: updateModule.schema,
      preHandler: manage,
      handler: controller.updateModule,
    });
  };
}

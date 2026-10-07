import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../../identity/index.js';
import { PlatformAccessFacade } from './platform-access.facade.js';
import { PlatformConfigurationController } from './platform-configuration.controller.js';
import { platformConfigurationRoutes } from './platform-configuration.routes.js';
import { PlatformConfigurationService } from './platform-configuration.service.js';

export interface PlatformConfigurationRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly access: PlatformAccessFacade;
}

export function createPlatformConfigurationModule(
  identity: IdentityFacade,
): PlatformConfigurationRuntime {
  const service = new PlatformConfigurationService();
  return {
    plugin: platformConfigurationRoutes(
      new PlatformConfigurationController(service),
      identity,
    ),
    access: new PlatformAccessFacade(),
  };
}

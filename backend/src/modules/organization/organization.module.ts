import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationFacade } from './organization.facade.js';
import { OrganizationRepository } from './organization.repository.js';
import { organizationRoutes } from './organization.routes.js';
import { OrganizationService } from './organization.service.js';

export interface OrganizationModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: OrganizationFacade;
}

export function createOrganizationModule(
  identity: IdentityFacade,
): OrganizationModuleRuntime {
  const repository = new OrganizationRepository();
  const service = new OrganizationService(repository);
  const controller = new OrganizationController(service);

  return {
    plugin: organizationRoutes(controller, identity),
    facade: new OrganizationFacade(service, repository),
  };
}

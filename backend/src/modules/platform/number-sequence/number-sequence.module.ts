import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../../identity/index.js';
import type { OrganizationFacade } from '../../organization/index.js';
import { NumberSequenceController } from './number-sequence.controller.js';
import { NumberSequenceFacade } from './number-sequence.facade.js';
import { numberSequenceRoutes } from './number-sequence.routes.js';
import { NumberSequenceService } from './number-sequence.service.js';

export interface NumberSequenceModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: NumberSequenceFacade;
}

export function createNumberSequenceModule(
  identity: IdentityFacade,
  organization: OrganizationFacade,
): NumberSequenceModuleRuntime {
  const service = new NumberSequenceService(organization);
  return {
    plugin: numberSequenceRoutes(new NumberSequenceController(service), identity),
    facade: new NumberSequenceFacade(service),
  };
}

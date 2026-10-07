import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { CommunicationController } from './communication.controller.js';
import { communicationRoutes } from './communication.routes.js';
import { CommunicationService } from './communication.service.js';

export interface CommunicationModuleRuntime { readonly plugin: FastifyPluginAsync; }

export function createCommunicationModule(identity: IdentityFacade, access: PlatformAccessFacade): CommunicationModuleRuntime {
  const service = new CommunicationService(access);
  return { plugin: communicationRoutes(new CommunicationController(service), identity, access) };
}

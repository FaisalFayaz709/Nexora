import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import { PlatformRuntimeController } from './platform-runtime.controller.js';
import { platformRuntimeRoutes } from './platform-runtime.routes.js';
import { PlatformRuntimeService } from './platform-runtime.service.js';

export interface PlatformRuntimeModule { readonly plugin: FastifyPluginAsync; }
export function createPlatformRuntimeModule(identity: IdentityFacade): PlatformRuntimeModule {
  const service = new PlatformRuntimeService();
  return { plugin: platformRuntimeRoutes(new PlatformRuntimeController(service), identity) };
}

import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import { SaaSController } from './saas.controller.js';
import { saasRoutes } from './saas.routes.js';
import { SaaSService } from './saas.service.js';
export interface SaaSModule { readonly plugin: FastifyPluginAsync; }
export function createSaaSModule(identity: IdentityFacade): SaaSModule { const service=new SaaSService(); return { plugin: saasRoutes(new SaaSController(service), identity) }; }

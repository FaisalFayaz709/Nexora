import type { FastifyPluginAsync } from 'fastify';
import type { CustomerFacade } from '../customers/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { CrmController } from './crm.controller.js';
import { crmRoutes } from './crm.routes.js';
import { CrmService } from './crm.service.js';
export interface CrmModuleRuntime { readonly plugin: FastifyPluginAsync; }
export function createCrmModule(identity: IdentityFacade, numbers: NumberSequenceFacade, customers: CustomerFacade, access: PlatformAccessFacade): CrmModuleRuntime { const service = new CrmService(numbers, customers, access); return { plugin: crmRoutes(new CrmController(service), identity, access) }; }

import type { FastifyPluginAsync } from 'fastify';
import type { AssetFacade } from '../assets/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { FieldServiceController } from './field-service.controller.js';
import { FieldServiceFacade } from './field-service.facade.js';
import { fieldServiceRoutes } from './field-service.routes.js';
import { FieldServiceService } from './field-service.service.js';
export interface FieldServiceModuleRuntime { readonly plugin:FastifyPluginAsync; readonly facade:FieldServiceFacade; }
export function createFieldServiceModule(identity:IdentityFacade,numbers:NumberSequenceFacade,customers:CustomerFacade,assets:AssetFacade,employees:EmployeeFacade,inventory:InventoryFacade,access:PlatformAccessFacade):FieldServiceModuleRuntime{
 const service=new FieldServiceService(numbers,customers,assets,employees,inventory,access);
 return{plugin:fieldServiceRoutes(new FieldServiceController(service),identity,access),facade:new FieldServiceFacade(service)};
}

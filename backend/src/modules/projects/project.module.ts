import type { FastifyPluginAsync } from 'fastify';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import type { FinanceFacade } from '../finance/index.js';
import { ProjectController } from './project.controller.js';
import { ProjectFacade } from './project.facade.js';
import { projectRoutes } from './project.routes.js';
import { ProjectService } from './project.service.js';

export interface ProjectModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: ProjectFacade;
}

export function createProjectModule(
  identity: IdentityFacade,
  numbers: NumberSequenceFacade,
  customers: CustomerFacade,
  employees: EmployeeFacade,
  inventory: InventoryFacade,
  procurement: ProcurementFacade,
  access: PlatformAccessFacade,
  finance?: FinanceFacade,
  facade: ProjectFacade = new ProjectFacade(),
): ProjectModuleRuntime {
  const service = new ProjectService(
    numbers,
    customers,
    employees,
    inventory,
    procurement,
    access,
    finance,
  );
  return {
    plugin: projectRoutes(new ProjectController(service), identity, access),
    facade,
  };
}

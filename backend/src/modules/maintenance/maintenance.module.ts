import type { FastifyPluginAsync } from 'fastify';
import type { AssetFacade } from '../assets/index.js';
import type { FieldServiceFacade } from '../service/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceFacade } from './maintenance.facade.js';
import { maintenanceRoutes } from './maintenance.routes.js';
import { MaintenanceService } from './maintenance.service.js';

export interface MaintenanceModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: MaintenanceFacade;
}

export function createMaintenanceModule(
  identity: IdentityFacade,
  assets: AssetFacade,
  fieldService: FieldServiceFacade,
  inventory: InventoryFacade,
  access: PlatformAccessFacade,
): MaintenanceModuleRuntime {
  const service = new MaintenanceService(assets, fieldService, inventory, access);
  return {
    plugin: maintenanceRoutes(new MaintenanceController(service), identity, access),
    facade: new MaintenanceFacade(),
  };
}

import type { FastifyPluginAsync } from 'fastify';
import type { ApprovalFacade } from '../approvals/index.js';
import type { CustomerFacade } from '../customers/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProjectFacade } from '../projects/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import { AssetController } from './asset.controller.js';
import { AssetFacade } from './asset.facade.js';
import { assetRoutes } from './asset.routes.js';
import { AssetService } from './asset.service.js';

export interface AssetModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: AssetFacade;
}

export function createAssetModule(
  identity: IdentityFacade,
  numbers: NumberSequenceFacade,
  inventory: InventoryFacade,
  customers: CustomerFacade,
  projects: ProjectFacade,
  employees: EmployeeFacade,
  vendors: VendorGovernanceFacade,
  approvals: ApprovalFacade,
  access: PlatformAccessFacade,
): AssetModuleRuntime {
  const service = new AssetService(
    numbers,
    inventory,
    customers,
    projects,
    employees,
    vendors,
    approvals,
    access,
  );
  return {
    plugin: assetRoutes(new AssetController(service), identity, access),
    facade: new AssetFacade(service),
  };
}

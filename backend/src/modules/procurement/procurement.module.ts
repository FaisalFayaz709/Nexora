import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { VendorGovernanceFacade } from '../vendors/index.js';
import type { EmployeeFacade } from '../hr/index.js';
import type { ApprovalFacade } from '../approvals/index.js';
import { ProcurementController } from './procurement.controller.js';
import { ProcurementFacade } from './procurement.facade.js';
import { procurementRoutes } from './procurement.routes.js';
import { ProcurementService } from './procurement.service.js';
import { PurchaseContractController } from './contracts/purchase-contract.controller.js';
import { purchaseContractRoutes } from './contracts/purchase-contract.routes.js';
import { PurchaseContractService } from './contracts/purchase-contract.service.js';

export interface ProcurementModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: ProcurementFacade;
}

export function createProcurementModule(
  identity: IdentityFacade,
  numbers: NumberSequenceFacade,
  inventory: InventoryFacade,
  vendors: VendorGovernanceFacade,
  employees: EmployeeFacade,
  access: PlatformAccessFacade,
  approvals: ApprovalFacade,
): ProcurementModuleRuntime {
  const service = new ProcurementService(
    numbers,
    inventory,
    vendors,
    employees,
    access,
    approvals,
  );
  const purchaseContracts = new PurchaseContractService(
    numbers,
    vendors,
    inventory,
    access,
  );
  return {
    plugin: async (app) => {
      await app.register(procurementRoutes(new ProcurementController(service), identity, access));
      await app.register(purchaseContractRoutes(new PurchaseContractController(purchaseContracts), identity, access));
    },
    facade: new ProcurementFacade(service),
  };
}

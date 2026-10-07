import type { FastifyPluginAsync } from 'fastify';
import type { FinanceFacade } from '../finance/index.js';
import type { IdentityFacade } from '../identity/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import { CommercialFinanceController } from './commercial-finance.controller.js';
import { commercialFinanceRoutes } from './commercial-finance.routes.js';
import { CommercialFinanceService } from './commercial-finance.service.js';

export interface CommercialFinanceModuleRuntime {
  readonly plugin: FastifyPluginAsync;
}

export function createCommercialFinanceModule(
  identity: IdentityFacade,
  numbers: NumberSequenceFacade,
  finance: FinanceFacade,
  procurement: ProcurementFacade,
  inventory: InventoryFacade,
  access: PlatformAccessFacade,
): CommercialFinanceModuleRuntime {
  const service = new CommercialFinanceService(
    numbers,
    finance,
    procurement,
    inventory,
    access,
  );
  return {
    plugin: commercialFinanceRoutes(
      new CommercialFinanceController(service),
      identity,
      access,
    ),
  };
}

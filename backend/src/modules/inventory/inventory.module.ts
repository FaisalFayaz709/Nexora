import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryFacade } from './inventory.facade.js';
import { inventoryOperationRoutes } from './inventory.routes.js';
import { ProductController } from './product.controller.js';
import { productRoutes } from './product.routes.js';
import { ProductService } from './product.service.js';
import { StockAdjustmentService } from './stock-adjustment.service.js';
import { StockCountController } from './stock-count/stock-count.controller.js';
import { stockCountRoutes } from './stock-count/stock-count.routes.js';
import { StockCountService } from './stock-count/stock-count.service.js';
import { StockQueryService } from './stock-query.service.js';
import { StockReservationService } from './stock-reservation.service.js';
import { StockTransferService } from './stock-transfer.service.js';
import { WarehouseController } from './warehouse.controller.js';
import { warehouseRoutes } from './warehouse.routes.js';
import { WarehouseService } from './warehouse.service.js';

export interface InventoryModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: InventoryFacade;
}

export function createInventoryModule(
  identity: IdentityFacade,
  numberSequences: NumberSequenceFacade,
  access: PlatformAccessFacade,
): InventoryModuleRuntime {
  const operationController = new InventoryController(
    new StockQueryService(),
    new StockReservationService(),
    new StockTransferService(numberSequences),
    new StockAdjustmentService(),
  );
  const countController = new StockCountController(new StockCountService());

  return {
    plugin: async (app) => {
      await app.register(productRoutes(new ProductController(new ProductService()), identity, access));
      await app.register(warehouseRoutes(new WarehouseController(new WarehouseService()), identity, access));
      await app.register(inventoryOperationRoutes(operationController, identity, access));
      await app.register(stockCountRoutes(countController, identity, access));
    },
    facade: new InventoryFacade(),
  };
}

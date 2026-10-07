import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { InventoryRepository } from './inventory.repository.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function paging(page?: number, pageSize?: number) {
  const p = page ?? 1;
  const size = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  return { page: p, pageSize: size, skip: (p - 1) * size, take: size };
}

export class StockQueryService {
  constructor(private readonly repository = new InventoryRepository()) {}

  async balances(tenant: TenantRequestContext, query: any) {
    if (query.warehouseId) await this.assertWarehouseScope(tenant, query.warehouseId);
    const page = paging(query.page, query.pageSize);
    const result = await this.repository.listBalances({
      organizationId: tenant.organizationId, branchId: tenant.branchId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      skip: page.skip, take: page.take,
    });
    return {
      ...page, total: result.total,
      rows: result.rows.map((row) => ({
        id: row.id, warehouseId: row.warehouseId, locationId: row.locationId, productId: row.productId,
        onHand: row.onHand.toString(), reserved: row.reserved.toString(),
        available: row.onHand.sub(row.reserved).toString(),
      })),
    };
  }

  async ledger(tenant: TenantRequestContext, query: any) {
    if (query.warehouseId) await this.assertWarehouseScope(tenant, query.warehouseId);
    const page = paging(query.page, query.pageSize);
    const result = await this.repository.listLedger({
      organizationId: tenant.organizationId, branchId: tenant.branchId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.referenceType ? { referenceType: query.referenceType } : {}),
      ...(query.referenceId ? { referenceId: query.referenceId } : {}),
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      skip: page.skip, take: page.take,
    });
    return {
      ...page, total: result.total,
      rows: result.rows.map((row) => ({
        id: row.id, productId: row.productId, warehouseId: row.warehouseId, locationId: row.locationId,
        type: row.type, qty: row.qty.toString(), referenceType: row.referenceType,
        referenceId: row.referenceId, occurredAt: row.occurredAt.toISOString(),
      })),
    };
  }

  async serial(tenant: TenantRequestContext, serialNo: string) {
    const row = await this.repository.findSerial(tenant.organizationId, serialNo);
    if (!row) throw new AppError(404, 'INVENTORY_SERIAL_NOT_FOUND', 'Serial number not found.');
    if (tenant.branchId) {
      if (!row.currentWarehouseId) {
        throw new AppError(403, 'INVENTORY_SERIAL_SCOPE_UNRESOLVED',
          'Serial is outside a warehouse and its branch resource scope cannot be established in this pass.');
      }
      await this.assertWarehouseScope(tenant, row.currentWarehouseId);
    }
    return {
      id: row.id, productId: row.productId, serialNo: row.serialNo, status: row.status,
      currentWarehouseId: row.currentWarehouseId, assetId: row.assetId,
    };
  }

  private async assertWarehouseScope(tenant: TenantRequestContext, warehouseId: string) {
    const warehouse = await this.repository.getWarehouse(tenant.organizationId, warehouseId);
    if (!warehouse) throw new AppError(404, 'INVENTORY_WAREHOUSE_NOT_FOUND', 'Warehouse not found.');
    if (tenant.branchId && warehouse.branchId !== tenant.branchId) {
      throw new AppError(403, 'INVENTORY_BRANCH_SCOPE_DENIED', 'Warehouse is outside the active branch scope.');
    }
  }
}

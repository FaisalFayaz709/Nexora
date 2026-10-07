import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export const WAREHOUSE_SCOPE_KEY = 'WAREHOUSE' as const;

export type InventoryTrackingType = 'NONE' | 'SERIAL' | 'BATCH';
export type InventoryMutationKind =
  | 'RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'TRANSFER_DISPATCH'
  | 'TRANSFER_RECEIVE'
  | 'ADJUSTMENT_POST'
  | 'PURCHASE_RECEIPT'
  | 'PROJECT_ISSUE'
  | 'TECHNICIAN_ISSUE'
  | 'CUSTOMER_INSTALLATION';

export interface StockWindow {
  onHand: Prisma.Decimal;
  reserved: Prisma.Decimal;
}

export interface BatchAllocationInput {
  lotNo: string;
  quantity: string | Prisma.Decimal;
}

function decimal(value: string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function availableStock(window: StockWindow): Prisma.Decimal {
  return window.onHand.sub(window.reserved);
}

export function assertPositiveQuantity(quantity: string | Prisma.Decimal, code = 'INVENTORY_QUANTITY_INVALID'): Prisma.Decimal {
  const qty = decimal(quantity);
  if (!qty.isFinite() || qty.lessThanOrEqualTo(0)) {
    throw new AppError(400, code, 'Inventory quantity must be greater than zero.');
  }
  return qty;
}

export function assertNonZeroDelta(quantityDelta: string | Prisma.Decimal): Prisma.Decimal {
  const qty = decimal(quantityDelta);
  if (!qty.isFinite() || qty.equals(0)) {
    throw new AppError(400, 'INVENTORY_DELTA_INVALID', 'Inventory adjustment quantityDelta cannot be zero.');
  }
  return qty;
}

export function assertCanReserve(window: StockWindow, quantity: string | Prisma.Decimal): Prisma.Decimal {
  const qty = assertPositiveQuantity(quantity, 'INVENTORY_RESERVATION_QUANTITY_INVALID');
  const available = availableStock(window);
  if (available.lessThan(qty)) {
    throw new AppError(409, 'INVENTORY_INSUFFICIENT_AVAILABLE_STOCK', 'Insufficient unreserved stock.', {
      available: available.toString(),
      requested: qty.toString(),
    });
  }
  return qty;
}

export function assertOnHandCanMove(window: StockWindow, delta: Prisma.Decimal): Prisma.Decimal {
  const next = window.onHand.add(delta);
  if (next.isNegative() || next.lessThan(window.reserved)) {
    throw new AppError(409, 'INVENTORY_INSUFFICIENT_AVAILABLE_STOCK', 'Stock movement would make on-hand lower than reserved stock.', {
      onHand: window.onHand.toString(),
      reserved: window.reserved.toString(),
      delta: delta.toString(),
    });
  }
  return next;
}

export function normalizeUniqueSerials(serialNumbers: readonly string[] | undefined): string[] {
  return [...new Set((serialNumbers ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function assertSerialQuantityMatches(
  trackingType: InventoryTrackingType,
  quantity: Prisma.Decimal,
  serialNumbers: readonly string[] | undefined,
): string[] {
  const uniqueSerials = normalizeUniqueSerials(serialNumbers);
  if (trackingType !== 'SERIAL') return uniqueSerials;
  if (!quantity.abs().isInteger()) {
    throw new AppError(400, 'INVENTORY_SERIAL_QUANTITY_INVALID', 'Serial-tracked quantity must be a whole number.');
  }
  if (uniqueSerials.length !== quantity.abs().toNumber()) {
    throw new AppError(400, 'INVENTORY_SERIAL_COUNT_MISMATCH', 'Serial count must equal the absolute inventory quantity.');
  }
  return uniqueSerials;
}

export function normalizeBatchAllocations(
  batches: readonly BatchAllocationInput[] | undefined,
): Array<{ lotNo: string; qty: Prisma.Decimal }> {
  return (batches ?? []).map((batch) => {
    const lotNo = batch.lotNo.trim();
    if (!lotNo) throw new AppError(400, 'INVENTORY_BATCH_LOT_REQUIRED', 'Batch lot number is required.');
    return { lotNo, qty: assertPositiveQuantity(batch.quantity, 'INVENTORY_BATCH_QUANTITY_INVALID') };
  });
}

export function assertBatchQuantityMatches(
  trackingType: InventoryTrackingType,
  quantity: Prisma.Decimal,
  batches: readonly BatchAllocationInput[] | undefined,
): Array<{ lotNo: string; qty: Prisma.Decimal }> {
  const normalized = normalizeBatchAllocations(batches);
  if (trackingType !== 'BATCH') return normalized;
  const total = normalized.reduce((sum, batch) => sum.add(batch.qty), new Prisma.Decimal(0));
  if (!total.equals(quantity.abs())) {
    throw new AppError(400, 'INVENTORY_BATCH_QUANTITY_MISMATCH', 'Batch allocation total must equal the absolute inventory quantity.');
  }
  return normalized;
}

export const InventoryCorePolicyChecklist = Object.freeze([
  'tenant-context-required',
  'branch-scope-required',
  'row-lock-required',
  'ledger-entry-required',
  'serial-state-required',
  'batch-allocation-required',
  'stock-freeze-required',
  'audit-required',
  'no-async-stock-mutation',
]);

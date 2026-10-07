import {
  InventoryCompletionRows,
  InventoryLockedCommandRoutes,
  type InventoryCompletionSubject,
} from '@nexora/shared';
import { AppError } from '../../core/http/errors.js';

export const RuntimeInventorySubjects = [
  'STOCK_BALANCE',
  'STOCK_LEDGER',
  'SERIAL_NUMBER',
  'BATCH_LOT',
  'STOCK_RESERVATION',
  'STOCK_TRANSFER',
  'STOCK_ADJUSTMENT',
  'STOCK_COUNT',
] as const satisfies readonly InventoryCompletionSubject[];

export const InventoryAppendOnlyModels = [
  'StockTransaction',
  'StockTransactionSerial',
  'StockTransactionBatch',
  'StockCountVariance',
  'StockCountApproval',
  'StockCountPosting',
] as const;

export const InventoryTransactionalCommands = [
  'reserve',
  'releaseReservation',
  'createTransfer',
  'dispatchTransfer',
  'receiveTransfer',
  'createAdjustment',
  'postAdjustment',
  'createStockCount',
  'startStockCount',
  'submitStockCount',
  'postStockCount',
] as const;

export function inventoryCompletionFor(subject: InventoryCompletionSubject) {
  const row = InventoryCompletionRows.find((entry) => entry.subject === subject);
  if (!row) {
    throw new AppError(
      500,
      'INVENTORY_COMPLETION_ROW_MISSING',
      `${subject} is missing from the M8 inventory completion matrix.`,
    );
  }
  return row;
}

export function assertInventoryCompletionMatrix() {
  const failures: string[] = [];
  const subjects = new Set(InventoryCompletionRows.map((row) => row.subject));
  for (const subject of RuntimeInventorySubjects) {
    if (!subjects.has(subject)) failures.push(`${subject}: completion row missing`);
  }

  for (const row of InventoryCompletionRows) {
    if (row.ownerModule !== 'inventory') failures.push(`${row.subject}: owner module must stay inventory`);
    if (!row.capabilities.includes('tenant_scoped_repository')) failures.push(`${row.subject}: tenant scope missing`);
    if (!row.capabilities.includes('locked_route') && row.apiSurface.startsWith('/api/')) failures.push(`${row.subject}: locked route marker missing`);
    if (row.mutationKind === 'COMMAND') {
      for (const capability of [
        'row_lock',
        'stock_freeze_guard',
        'immutable_ledger',
        'audit_on_mutation',
        'transaction_boundary',
        'runtime_concurrency_test_pending',
      ] as const) {
        if (!row.capabilities.includes(capability)) failures.push(`${row.subject}: ${capability} missing`);
      }
    }
  }

  if (InventoryLockedCommandRoutes.length !== 11) failures.push('inventory locked command route count changed');

  if (failures.length) {
    throw new AppError(500, 'INVENTORY_COMPLETION_MATRIX_INVALID', failures.join('; '), { failures });
  }
  return true;
}

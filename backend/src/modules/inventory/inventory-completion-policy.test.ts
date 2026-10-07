import { describe, expect, it } from 'vitest';
import { InventoryCompletionRows, InventoryLockedCommandRoutes } from '@nexora/shared';
import {
  InventoryAppendOnlyModels,
  InventoryTransactionalCommands,
  RuntimeInventorySubjects,
  assertInventoryCompletionMatrix,
  inventoryCompletionFor,
} from './inventory-completion-policy.js';

describe('M8 inventory completion policy', () => {
  it('covers every runtime inventory subject with transactional controls', () => {
    expect(assertInventoryCompletionMatrix()).toBe(true);
    for (const subject of RuntimeInventorySubjects) {
      const row = inventoryCompletionFor(subject);
      expect(row.productionStatus).toBe('SOURCE_PREFLIGHT_PASS_RUNTIME_CERTIFICATION_PENDING');
      expect(row.capabilities).toContain('tenant_scoped_repository');
      if (row.mutationKind === 'COMMAND') {
        expect(row.capabilities).toContain('row_lock');
        expect(row.capabilities).toContain('stock_freeze_guard');
        expect(row.capabilities).toContain('immutable_ledger');
        expect(row.capabilities).toContain('audit_on_mutation');
        expect(row.capabilities).toContain('transaction_boundary');
      }
    }
  });

  it('keeps M8 bounded to locked inventory commands and append-only ledgers', () => {
    expect(InventoryCompletionRows).toHaveLength(8);
    expect(InventoryLockedCommandRoutes).toHaveLength(11);
    expect(InventoryAppendOnlyModels).toContain('StockTransaction');
    expect(InventoryTransactionalCommands).toContain('dispatchTransfer');
    expect(InventoryTransactionalCommands).toContain('postStockCount');
  });
});

import { describe, expect, it } from 'vitest';
import { Prisma } from '@nexora/database';
import {
  assertBatchQuantityMatches,
  assertCanReserve,
  assertOnHandCanMove,
  assertSerialQuantityMatches,
  availableStock,
  InventoryCorePolicyChecklist,
} from './inventory-core-policy.js';

describe('inventory core policy', () => {
  it('computes free stock as onHand minus reserved', () => {
    expect(availableStock({ onHand: new Prisma.Decimal('100'), reserved: new Prisma.Decimal('35') }).toString()).toBe('65');
  });

  it('rejects reservations above free stock', () => {
    expect(() => assertCanReserve({ onHand: new Prisma.Decimal('10'), reserved: new Prisma.Decimal('8') }, '3')).toThrow('Insufficient unreserved stock');
  });

  it('prevents movement that would push on-hand below reserved', () => {
    expect(() => assertOnHandCanMove({ onHand: new Prisma.Decimal('10'), reserved: new Prisma.Decimal('8') }, new Prisma.Decimal('-3'))).toThrow('on-hand lower than reserved');
  });

  it('requires one unique serial per serialized unit', () => {
    expect(assertSerialQuantityMatches('SERIAL', new Prisma.Decimal('2'), ['S1', 'S2'])).toEqual(['S1', 'S2']);
    expect(() => assertSerialQuantityMatches('SERIAL', new Prisma.Decimal('2'), ['S1', 'S1'])).toThrow('Serial count');
  });

  it('requires batch allocations to reconcile to quantity', () => {
    const batches = assertBatchQuantityMatches('BATCH', new Prisma.Decimal('5'), [
      { lotNo: 'LOT-A', quantity: '2' },
      { lotNo: 'LOT-B', quantity: '3' },
    ]);
    expect(batches.map((batch) => batch.qty.toString())).toEqual(['2', '3']);
    expect(() => assertBatchQuantityMatches('BATCH', new Prisma.Decimal('5'), [{ lotNo: 'LOT-A', quantity: '4' }])).toThrow('Batch allocation total');
  });

  it('documents the stock freeze guard required before posting physical-count variances', () => {
    expect(InventoryCorePolicyChecklist).toContain('stock-freeze-required');
  });
});

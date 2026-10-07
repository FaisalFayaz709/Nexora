import { describe, expect, it } from 'vitest';
import { Prisma } from '@nexora/database';
import { assertCanReserve, availableStock } from './inventory-core-policy.js';

describe('stock reservation free-stock policy', () => {
  it('treats free stock as onHand minus already reserved quantity', () => {
    const onHand = new Prisma.Decimal('100');
    const reserved = new Prisma.Decimal('70');

    expect(availableStock({ onHand, reserved }).toString()).toBe('30');
  });

  it('allows a reservation that exactly matches free stock', () => {
    const accepted = assertCanReserve(
      { onHand: new Prisma.Decimal('100'), reserved: new Prisma.Decimal('70') },
      '30',
    );

    expect(accepted.toString()).toBe('30');
  });

  it('rejects a reservation that exceeds free stock', () => {
    expect(() =>
      assertCanReserve(
        { onHand: new Prisma.Decimal('100'), reserved: new Prisma.Decimal('70') },
        '31',
      ),
    ).toThrow('Insufficient unreserved stock');
  });

  it('rejects zero or negative reservation quantities before mutating stock state', () => {
    const window = { onHand: new Prisma.Decimal('100'), reserved: new Prisma.Decimal('70') };

    expect(() => assertCanReserve(window, '0')).toThrow('greater than zero');
    expect(() => assertCanReserve(window, '-1')).toThrow('greater than zero');
  });
});

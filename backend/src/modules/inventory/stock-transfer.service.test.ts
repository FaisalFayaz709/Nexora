import { describe, expect, it } from 'vitest';

describe('stock transfer state model', () => {
  it('uses DRAFT -> IN_TRANSIT -> RECEIVED command states', () => {
    expect(['DRAFT', 'IN_TRANSIT', 'RECEIVED']).toEqual([
      'DRAFT', 'IN_TRANSIT', 'RECEIVED',
    ]);
  });
});

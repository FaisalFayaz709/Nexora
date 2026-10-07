import { describe, expect, it } from 'vitest';
import { PERMISSION_KEYS, PermissionKeySchema } from './permission-catalog';

describe('locked permission catalog', () => {
  it('preserves every Pass 0 permission literal', () => {
    expect(PERMISSION_KEYS).toHaveLength(170);
  });

  it('rejects an invented permission', () => {
    expect(PermissionKeySchema.safeParse('invented.permission').success).toBe(false);
  });
});

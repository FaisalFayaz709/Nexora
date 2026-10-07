import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiErrorSchema, apiDataEnvelope, apiListEnvelope } from './api-envelope';

describe('locked API envelopes', () => {
  it('requires requestId on a successful single-resource envelope', () => {
    const schema = apiDataEnvelope(z.object({ ok: z.boolean() }));
    expect(
      schema.parse({ data: { ok: true }, meta: { requestId: 'req-1' } }),
    ).toEqual({ data: { ok: true }, meta: { requestId: 'req-1' } });
  });

  it('requires ERP list pagination metadata', () => {
    const schema = apiListEnvelope(z.object({ id: z.string() }));
    expect(
      schema.parse({
        data: [{ id: '1' }],
        meta: { page: 1, pageSize: 25, total: 1, requestId: 'req-1' },
      }),
    ).toBeTruthy();
  });

  it('uses the locked stable error envelope', () => {
    expect(
      ApiErrorSchema.parse({
        error: {
          code: 'PURCHASE_REQUEST_INVALID_STATE',
          message: 'Purchase request cannot be approved from DRAFT state.',
          details: { currentStatus: 'DRAFT' },
          requestId: 'req-1',
        },
      }),
    ).toBeTruthy();
  });
});

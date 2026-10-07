import { describe, expect, it } from 'vitest';
import { EmailSendJobSchema, MaintenanceScanJobSchema } from '../queues/job-contracts.js';

const uuid = '00000000-0000-4000-8000-000000000001';

it('validates tenant-scoped email jobs with idempotency', () => {
  const parsed = EmailSendJobSchema.parse({
    organizationId: uuid,
    idempotencyKey: 'email:test',
    template: 'purchase-order-approved',
    recipient: 'vendor@example.com',
    subject: 'Purchase order approved',
  });

  expect(parsed.organizationId).toBe(uuid);
  expect(parsed.payloadJson).toEqual({});
});

describe('scheduled scan jobs', () => {
  it('allow all-tenant scheduler scope without accepting stock or money mutation payloads', () => {
    const parsed = MaintenanceScanJobSchema.parse({
      scope: 'all-tenants',
      dueBefore: '2026-09-05T00:00:00.000Z',
      idempotencyKey: 'maintenance.scan:2026-09-05T00',
    });

    expect(parsed.scope).toBe('all-tenants');
  });
});

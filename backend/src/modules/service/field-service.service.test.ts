import { describe, expect, it } from 'vitest';
import {
  CompleteWorkOrderRequestSchema,
  CreateTicketRequestSchema,
  TechnicianAvailabilitySchema,
  TicketCategorySchema,
  TicketStatusSchema,
  WorkOrderStatusSchema,
} from '@nexora/shared';

describe('Field Service source contracts', () => {
  it('preserves the source create-ticket request example', () => {
    const input = CreateTicketRequestSchema.parse({
      customerId: '11111111-1111-4111-8111-111111111111',
      siteId: '22222222-2222-4222-8222-222222222222',
      assetId: '33333333-3333-4333-8333-333333333333',
      category: 'EQUIPMENT_FAILURE',
      priority: 'HIGH',
      subject: 'Camera offline',
      description: 'Camera stopped responding this morning.',
    });
    expect(input.category).toBe('EQUIPMENT_FAILURE');
  });

  it('preserves source ticket categories and statuses', () => {
    expect(TicketCategorySchema.parse('WARRANTY_CLAIM')).toBe('WARRANTY_CLAIM');
    expect(TicketStatusSchema.parse('WAITING_VENDOR')).toBe('WAITING_VENDOR');
  });

  it('preserves canonical WorkOrder lifecycle statuses', () => {
    for (const status of [
      'NEW','VALIDATED','ASSIGNED','TECHNICIAN_ACCEPTED','TRAVELLING','ON_SITE',
      'DIAGNOSIS','WORK_IN_PROGRESS','WAITING_FOR_PART','RESOLVED',
      'CUSTOMER_CONFIRMATION','CLOSED','CANCELLED',
    ]) expect(WorkOrderStatusSchema.parse(status)).toBe(status);
  });

  it('preserves technician availability values', () => {
    for (const status of ['AVAILABLE','ASSIGNED','ON_SITE','ON_LEAVE','OFF_DUTY'])
      expect(TechnicianAvailabilitySchema.parse(status)).toBe(status);
  });

  it('preserves the exact complete-work-order source example shape', () => {
    expect(CompleteWorkOrderRequestSchema.parse({
      serviceReportId: '11111111-1111-4111-8111-111111111111',
      customerConfirmed: true,
    }).customerConfirmed).toBe(true);
  });
});

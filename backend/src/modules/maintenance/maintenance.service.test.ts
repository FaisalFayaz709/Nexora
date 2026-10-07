import { describe, expect, it } from 'vitest';
import {
  CompleteMaintenanceExecutionSchema,
  CreateMaintenancePlanSchema,
  MaintenanceFrequencyTypeSchema,
  MaintenanceResultSchema,
  MaintenanceScheduleStatusSchema,
} from '@nexora/shared';

describe('Maintenance contracts', () => {
  it('validates the locked create-plan baseline with implementation-derived frequency', () => {
    const input = CreateMaintenancePlanSchema.parse({
      assetId: '11111111-1111-4111-8111-111111111111',
      contractId: '22222222-2222-4222-8222-222222222222',
      name: 'Quarterly CCTV inspection',
      frequencyType: 'MONTHS',
      intervalValue: 3,
      startAt: '2026-10-01',
      checklist: {
        name: 'CCTV PM Checklist',
        version: 1,
        items: [{ sequence: 1, label: 'Clean lens', required: true }],
      },
    });
    expect(input.intervalValue).toBe(3);
  });

  it('preserves derived frequency and schedule status values', () => {
    expect(MaintenanceFrequencyTypeSchema.parse('DAYS')).toBe('DAYS');
    expect(MaintenanceScheduleStatusSchema.parse('GENERATED')).toBe('GENERATED');
  });

  it('requires completion result and validates maintenance parts', () => {
    expect(MaintenanceResultSchema.parse('REPAIRED')).toBe('REPAIRED');
    const input = CompleteMaintenanceExecutionSchema.parse({
      result: 'PASSED',
      parts: [{
        productId: '11111111-1111-4111-8111-111111111111',
        qty: '2.0000',
        sourceWarehouseId: '22222222-2222-4222-8222-222222222222',
      }],
    });
    expect(input.parts).toHaveLength(1);
  });

  it('rejects simultaneous inline checklist and checklistId', () => {
    expect(() => CreateMaintenancePlanSchema.parse({
      assetId: '11111111-1111-4111-8111-111111111111',
      name: 'Invalid',
      frequencyType: 'MONTHS',
      intervalValue: 1,
      startAt: '2026-10-01',
      checklistId: '22222222-2222-4222-8222-222222222222',
      checklist: { name: 'Inline', items: [] },
    })).toThrow();
  });
});

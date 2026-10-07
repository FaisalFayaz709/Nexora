import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequestSchema,
  CreateProjectTaskSchema,
  ProjectStatusSchema,
  ProjectTaskStatusSchema,
  UpsertProjectBomSchema,
} from '@nexora/shared';

describe('Project contracts', () => {
  it('preserves the source create-project example fields', () => {
    const value = CreateProjectRequestSchema.parse({
      customerId: '11111111-1111-4111-8111-111111111111',
      contractId: '22222222-2222-4222-8222-222222222222',
      siteId: '33333333-3333-4333-8333-333333333333',
      name: 'Campus CCTV Upgrade',
      managerId: '44444444-4444-4444-8444-444444444444',
      startDate: '2026-09-10',
      dueDate: '2026-11-15',
      contractValue: '5000000.00',
    });
    expect(value.name).toBe('Campus CCTV Upgrade');
  });

  it('preserves canonical project statuses', () => {
    for (const status of [
      'DRAFT',
      'PLANNED',
      'ACTIVE',
      'ON_HOLD',
      'COMPLETED',
      'HANDED_OVER',
      'CANCELLED',
    ]) {
      expect(ProjectStatusSchema.parse(status)).toBe(status);
    }
  });

  it('preserves functional project task statuses', () => {
    for (const status of [
      'NOT_STARTED',
      'IN_PROGRESS',
      'BLOCKED',
      'COMPLETED',
      'CANCELLED',
    ]) {
      expect(ProjectTaskStatusSchema.parse(status)).toBe(status);
    }
  });

  it('requires a non-empty versioned BOM body', () => {
    expect(() => UpsertProjectBomSchema.parse({ items: [] })).toThrow();
  });

  it('validates completion percentage', () => {
    expect(() =>
      CreateProjectTaskSchema.parse({
        projectId: '11111111-1111-4111-8111-111111111111',
        title: 'Install cameras',
        completionPct: 101,
      }),
    ).toThrow();
  });
});

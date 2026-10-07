import { describe, expect, it } from 'vitest';
import { AttendanceListQuerySchema, CreateLeaveRequestSchema, CreatePayrollRunSchema, PayrollPostSchema } from '@nexora/shared';
describe('HR contracts', () => {
  it('validates attendance filters', () => { expect(AttendanceListQuerySchema.parse({ status: 'PRESENT' }).status).toBe('PRESENT'); });
  it('rejects inverted leave dates', () => { expect(() => CreateLeaveRequestSchema.parse({ employeeId: '11111111-1111-4111-8111-111111111111', leaveTypeId: '22222222-2222-4222-8222-222222222222', fromDate: '2026-09-10', toDate: '2026-09-09' })).toThrow(); });
  it('validates payroll period', () => { expect(CreatePayrollRunSchema.parse({ periodStart: '2026-09-01', periodEnd: '2026-09-30' }).periodStart).toBe('2026-09-01'); });
  it('allows payroll posting body to be empty', () => { expect(PayrollPostSchema.parse({})).toEqual({}); });
});

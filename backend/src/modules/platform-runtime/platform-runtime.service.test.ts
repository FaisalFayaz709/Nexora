import { describe, expect, it } from 'vitest';
import { AuditLogQuerySchema, CalendarQuerySchema, GlobalSearchQuerySchema } from '@nexora/shared';
describe('Platform runtime contracts',()=>{
  it('validates global search query',()=>{expect(GlobalSearchQuerySchema.parse({q:'invoice',page:'1'}).q).toBe('invoice');});
  it('validates calendar range query',()=>{expect(CalendarQuerySchema.parse({from:'2026-09-01',to:'2026-09-30'}).from).toBe('2026-09-01');});
  it('validates audit query',()=>{expect(AuditLogQuerySchema.parse({subjectType:'PurchaseOrder'}).subjectType).toBe('PurchaseOrder');});
});

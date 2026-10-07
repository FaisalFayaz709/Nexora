import { describe, expect, it } from 'vitest';
import { CreateSaaSSubscriptionSchema, PostSaaSInvoiceSchema, SaaSUsageQuerySchema } from '@nexora/shared';
describe('SaaS billing contracts',()=>{
  it('validates subscription creation',()=>{const v=CreateSaaSSubscriptionSchema.parse({organizationId:'11111111-1111-4111-8111-111111111111',planId:'22222222-2222-4222-8222-222222222222',startsAt:'2026-09-05T10:00:00Z'}); expect(v.status).toBe('TRIAL');});
  it('validates usage query',()=>{expect(SaaSUsageQuerySchema.parse({from:'2026-09-01'}).from).toBe('2026-09-01');});
  it('validates posting invoice',()=>{expect(PostSaaSInvoiceSchema.parse({amount:'100.00',dueDate:'2026-09-30'}).amount).toBe('100.00');});
});

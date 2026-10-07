import { describe, expect, it } from 'vitest';
import { AppError } from '../http/errors.js';
import {
  CrossCuttingControlPolicy,
  assertNoClientTenantOverride,
  assertTenantScopedWhere,
  isHighRiskCommandRoute,
  normalizeIdempotencyRouteKey,
} from './cross-cutting-control-policy.js';

const tenant = { membershipId: 'membership-1', organizationId: 'org-1', branchId: 'branch-1' };

describe('M5 cross-cutting control policy', () => {
  it('rejects client supplied tenant override keys', () => {
    expect(() => assertNoClientTenantOverride({ name: 'Safe' })).not.toThrow();
    expect(() => assertNoClientTenantOverride({ organizationId: 'attacker-org' })).toThrow(AppError);
    expect(() => assertNoClientTenantOverride({ lines: [{ tenantId: 'attacker-tenant' }] })).toThrow(AppError);
  });

  it('requires organizationId in repository where filters', () => {
    expect(() => assertTenantScopedWhere({ organizationId: 'org-1', id: 'row-1' }, 'PurchaseOrder')).not.toThrow();
    expect(() => assertTenantScopedWhere({ id: 'row-1' }, 'PurchaseOrder')).toThrow(AppError);
  });

  it('classifies high-risk command routes that need transaction/audit/idempotency controls', () => {
    expect(isHighRiskCommandRoute('/api/v1/purchase-requests/:id/approve')).toBe(true);
    expect(isHighRiskCommandRoute('/api/v1/customers')).toBe(false);
  });

  it('normalizes idempotency keys by method and parameterized route', () => {
    expect(normalizeIdempotencyRouteKey('post', '/api/v1/payments/8d9b8b2a-1111-4222-8333-123456789abc/post')).toBe(
      'POST /api/v1/payments/:id/post',
    );
  });

  it('fails closed when a high-risk mutation omits Idempotency-Key', () => {
    const policy = new CrossCuttingControlPolicy();
    expect(() => policy.evaluate({
      method: 'POST',
      route: '/api/v1/purchase-orders/:id/approve',
      permission: 'purchase_order.approve',
      tenant,
      body: { comment: 'approved' },
    })).toThrow(AppError);
  });

  it('returns the required control set for a high-risk command', () => {
    const policy = new CrossCuttingControlPolicy();
    const decision = policy.evaluate({
      method: 'POST',
      route: '/api/v1/goods-receipts',
      permission: 'goods_receipt.create',
      tenant,
      body: { purchaseOrderId: 'po-1', items: [] },
      idempotencyKey: 'key-1',
      requiresTransaction: true,
    });

    expect(decision.requiredControls).toContain('authentication');
    expect(decision.requiredControls).toContain('tenant-resolution');
    expect(decision.requiredControls).toContain('permission-check');
    expect(decision.requiredControls).toContain('audit-log');
    expect(decision.requiredControls).toContain('transaction-boundary');
    expect(decision.requiredControls).toContain('idempotency');
  });
});

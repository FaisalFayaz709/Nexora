import { describe, expect, it } from 'vitest';
import { PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS } from './pass-22-frontend-test-completion-policy';

describe('PASS_22 portal and offline UI obligations', () => {
  it('requires customer, vendor and technician offline surfaces', () => {
    const routes = PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS.map((item) => item.route);
    expect(routes).toContain('/customer-portal/projects');
    expect(routes).toContain('/vendor-portal/rfqs');
    expect(routes).toContain('/technician/offline-queue');
  });
});

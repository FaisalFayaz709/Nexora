import { describe, expect, it } from 'vitest';
import {
  PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS,
  PASS_22_FRONTEND_TEST_COMPLETION,
  assertPass22FrontendTestObligations,
} from './pass-22-frontend-test-completion-policy';

describe('PASS_22_TESTING_COMPLETION_FRONTEND policy', () => {
  it('locks frontend runtime UX, RBAC and portal/PWA E2E obligations', () => {
    expect(PASS_22_FRONTEND_TEST_COMPLETION).toBe('PASS_22_TESTING_COMPLETION_FRONTEND');
    expect(assertPass22FrontendTestObligations()).toBe(true);
    const routes = PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS.map((obligation) => obligation.route);
    expect(routes).toContain('/procurement/purchase-requests');
    expect(routes).toContain('/technician/offline-queue');
    expect(routes).toContain('/customer-portal/projects');
    expect(routes).toContain('/vendor-portal/rfqs');
  });
});

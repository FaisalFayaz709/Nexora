import { describe, expect, it } from 'vitest';
import { PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS } from './pass-22-frontend-test-completion-policy';

describe('PASS_22 frontend shell and state obligations', () => {
  it('requires internal ERP, portal and technician PWA shell coverage', () => {
    const joined = PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS.map((item) => `${item.route}:${item.requiredChecks.join(',')}`).join('\n');
    expect(joined).toContain('AppShell');
    expect(joined).toContain('PortalShell');
    expect(joined).toContain('TechnicianPwaShell');
    expect(joined).toContain('OfflineProvider');
  });
});

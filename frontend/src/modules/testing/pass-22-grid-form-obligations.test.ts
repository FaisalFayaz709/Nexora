import { describe, expect, it } from 'vitest';
import { PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS } from './pass-22-frontend-test-completion-policy';

describe('PASS_22 frontend grid/form obligations', () => {
  it('requires React Hook Form command surfaces and TanStack Table grids in critical modules', () => {
    const checks = PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS.flatMap((item) => item.requiredChecks);
    expect(checks.join('\n')).toContain('React Hook Form');
    expect(checks.join('\n')).toContain('TanStack Table');
    expect(checks.join('\n')).toContain('permission-gated row actions');
  });
});

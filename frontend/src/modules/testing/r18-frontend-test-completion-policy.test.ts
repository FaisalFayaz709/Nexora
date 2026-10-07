import { describe, expect, it } from 'vitest';
import { assertR18FrontendSurfaceEvidence, R18RequiredFrontendE2EStates } from './r18-frontend-test-completion-policy';

describe('R18 frontend test completion policy', () => {
  it('accepts route evidence only when shell, central API, grid, form and state obligations are present', () => {
    expect(() => assertR18FrontendSurfaceEvidence({
      route: '/procurement/purchase-requests',
      shell: 'erp',
      usesCentralApiClient: true,
      usesTanStackGridWhenList: true,
      usesRHFZodWhenForm: true,
      stateCoverage: ['loading', 'empty', 'error', 'forbidden', 'conflict'],
    })).not.toThrow();
  });

  it('keeps offline state in the browser E2E state model for technician PWA', () => {
    expect(R18RequiredFrontendE2EStates).toContain('offline');
    expect(() => assertR18FrontendSurfaceEvidence({
      route: '/technician/jobs',
      shell: 'technician',
      usesCentralApiClient: true,
      usesTanStackGridWhenList: true,
      usesRHFZodWhenForm: false,
      stateCoverage: ['loading', 'empty', 'error', 'forbidden', 'conflict'],
    })).toThrow('React Hook Form + Zod');
  });
});

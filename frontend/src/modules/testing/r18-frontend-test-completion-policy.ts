export interface R18FrontendSurfaceEvidence {
  readonly route: string;
  readonly shell: 'erp' | 'portal' | 'technician' | 'auth';
  readonly usesCentralApiClient: boolean;
  readonly usesTanStackGridWhenList: boolean;
  readonly usesRHFZodWhenForm: boolean;
  readonly stateCoverage: readonly string[];
}

export function assertR18FrontendSurfaceEvidence(evidence: R18FrontendSurfaceEvidence) {
  if (!evidence.route.startsWith('/')) throw new Error('R18 frontend route evidence must use an absolute route.');
  if (!evidence.usesCentralApiClient) throw new Error(`${evidence.route} bypasses the central Fastify /api/v1 client.`);
  if (!evidence.usesTanStackGridWhenList) throw new Error(`${evidence.route} has list/grid behavior without TanStack/DataTable evidence.`);
  if (!evidence.usesRHFZodWhenForm) throw new Error(`${evidence.route} has form behavior without React Hook Form + Zod evidence.`);
  for (const state of ['loading', 'empty', 'error', 'forbidden', 'conflict']) {
    if (!evidence.stateCoverage.includes(state)) throw new Error(`${evidence.route} is missing ${state} state coverage.`);
  }
}

export const R18RequiredFrontendE2EStates = ['loading', 'empty', 'error', 'forbidden', 'conflict', 'not-found', 'offline'] as const;

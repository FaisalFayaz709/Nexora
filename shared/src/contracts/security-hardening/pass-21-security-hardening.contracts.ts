import { z } from 'zod';
import { SecurityHardeningControlIds } from './security-hardening-manifest';

export const PASS_21_SECURITY_HARDENING_CERTIFICATION = 'PASS_21_SECURITY_HARDENING_CERTIFICATION' as const;

export const Pass21SecurityEvidenceSchema = z.object({
  controlId: z.enum(SecurityHardeningControlIds),
  sourceGate: z.boolean(),
  runtimeGate: z.boolean(),
  evidencePath: z.string().min(1),
  blocksProduction: z.boolean(),
});
export type Pass21SecurityEvidence = z.infer<typeof Pass21SecurityEvidenceSchema>;

export const Pass21SecurityReleaseDecisionSchema = z.object({
  status: z.enum(['GO', 'HOLD']),
  lockfilePresent: z.boolean(),
  runtimeCertificationPassed: z.boolean(),
  securitySmokePassed: z.boolean(),
  unresolvedCriticalFindings: z.number().int().nonnegative(),
  blockers: z.array(z.string()),
});
export type Pass21SecurityReleaseDecision = z.infer<typeof Pass21SecurityReleaseDecisionSchema>;

export const Pass21SecurityCompletionContract = {
  pass: 'PASS_21_SECURITY_HARDENING_CERTIFICATION',
  lockedStackUnchanged: true,
  businessApiBoundary: 'Fastify /api/v1',
  frontendApiPolicy: 'Next.js route handlers cannot own ERP domain security, Prisma, MinIO, Redis, approval, stock or finance logic.',
  sourceControls: [
    'security headers and CSP applied in Fastify response boundary',
    'CSRF policy available for cookie-authenticated mutations',
    'file upload abuse policy validates size, MIME, extension, checksum, object existence and tenant object prefix',
    'audit redaction prevents passwords, tokens, cookies, OTP, CSRF and secret leakage',
    'RBAC, tenant, branch and resource scope remain service-level controls',
    'cross-tenant IDOR, privilege escalation and maker-checker abuse cases are covered by source tests',
    'CodeQL, Semgrep, dependency audit and Dependabot/lockfile policy remain release gates',
    'backup/restore security evidence remains production-blocking',
  ] as const,
  runtimeControlsRequiredBeforeGo: [
    'pnpm install --frozen-lockfile',
    'pnpm security:check',
    'pnpm security:smoke:preflight',
    'pnpm test',
    'pnpm build',
    'docker compose up --build',
    'SECURITY_SMOKE=1 node scripts/security-smoke-certify.mjs',
  ] as const,
} as const;

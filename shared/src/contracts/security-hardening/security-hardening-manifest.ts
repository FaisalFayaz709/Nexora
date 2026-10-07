import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';

export const C16_SECURITY_HARDENING = 'C16_SECURITY_HARDENING' as const;

export const SecurityHardeningControlIds = [
  'C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION',
  'C16-RBAC-TENANT-BRANCH-RESOURCE-SCOPE-ENFORCED-IN-SERVICES',
  'C16-CROSS-TENANT-IDOR-PRIVILEGE-ESCALATION-TESTS',
  'C16-CSRF-SECURE-COOKIES-HEADERS-TLS-POLICY',
  'C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS',
  'C16-SQLI-XSS-VALIDATION-ALLOWLISTED-FILTERS-SORTS',
  'C16-AUDIT-PII-SECRETS-NO-SENSITIVE-LOGGING',
  'C16-DEPENDENCY-SUPPLY-CHAIN-CODEQL-SEMGREP-AUDIT',
  'C16-BACKUP-RESTORE-ENCRYPTION-ACCESS-TEST',
  'C16-IDEMPOTENCY-RATE-LIMITS-CRITICAL-ENDPOINTS',
  'C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION',
] as const;

export type SecurityHardeningControlId = (typeof SecurityHardeningControlIds)[number];

export const SecurityHardeningAreaSchema = z.enum([
  'AUTHENTICATION',
  'AUTHORIZATION',
  'TENANT_ISOLATION',
  'CSRF_COOKIES_HEADERS_TLS',
  'FILE_UPLOADS',
  'INPUT_VALIDATION_INJECTION',
  'AUDIT_PII_LOGGING',
  'DEPENDENCY_SUPPLY_CHAIN',
  'BACKUP_RESTORE',
  'IDEMPOTENCY_RATE_LIMITS',
  'RELEASE_GATE',
]);
export type SecurityHardeningArea = z.infer<typeof SecurityHardeningAreaSchema>;

export const SecurityHardeningEvidenceSchema = z.object({
  area: SecurityHardeningAreaSchema,
  controlId: z.enum(SecurityHardeningControlIds),
  owner: NonEmptyStringSchema,
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  runtimeRequired: z.boolean(),
  blocksProduction: z.boolean(),
});
export type SecurityHardeningEvidence = z.infer<typeof SecurityHardeningEvidenceSchema>;

export const SecurityHardeningEvidenceCatalog: readonly SecurityHardeningEvidence[] = [
  {
    area: 'AUTHENTICATION',
    controlId: 'C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION',
    owner: 'identity',
    requiredEvidence: ['password hashing check', 'privileged MFA check', 'rate-limit check', 'session revocation check'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'AUTHORIZATION',
    controlId: 'C16-RBAC-TENANT-BRANCH-RESOURCE-SCOPE-ENFORCED-IN-SERVICES',
    owner: 'core authorization',
    requiredEvidence: ['permission denial test', 'branch scope test', 'resource ownership test', 'service-level authorization review'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'TENANT_ISOLATION',
    controlId: 'C16-CROSS-TENANT-IDOR-PRIVILEGE-ESCALATION-TESTS',
    owner: 'security suite',
    requiredEvidence: ['cross-tenant read denial', 'cross-tenant mutation denial', 'portal isolation denial', 'privilege escalation denial'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'CSRF_COOKIES_HEADERS_TLS',
    controlId: 'C16-CSRF-SECURE-COOKIES-HEADERS-TLS-POLICY',
    owner: 'platform',
    requiredEvidence: ['secure cookie policy', 'SameSite/CSRF policy', 'HSTS/CSP header plan', 'Nginx TLS boundary check'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'FILE_UPLOADS',
    controlId: 'C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS',
    owner: 'documents',
    requiredEvidence: ['size limit denial', 'MIME/extension validation', 'checksum verification', 'tenant-private MinIO object prefix'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'INPUT_VALIDATION_INJECTION',
    controlId: 'C16-SQLI-XSS-VALIDATION-ALLOWLISTED-FILTERS-SORTS',
    owner: 'api contracts',
    requiredEvidence: ['Zod validation denial', 'allowlisted filters/sorts', 'SQLi payload smoke test', 'XSS payload smoke test'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'AUDIT_PII_LOGGING',
    controlId: 'C16-AUDIT-PII-SECRETS-NO-SENSITIVE-LOGGING',
    owner: 'audit',
    requiredEvidence: ['high-risk audit event', 'no password/token logging', 'PII minimization check', 'before/after summary redaction'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'DEPENDENCY_SUPPLY_CHAIN',
    controlId: 'C16-DEPENDENCY-SUPPLY-CHAIN-CODEQL-SEMGREP-AUDIT',
    owner: 'ci',
    requiredEvidence: ['pnpm audit', 'CodeQL workflow', 'Semgrep workflow', 'Dependabot/Renovate policy'],
    runtimeRequired: false,
    blocksProduction: true,
  },
  {
    area: 'BACKUP_RESTORE',
    controlId: 'C16-BACKUP-RESTORE-ENCRYPTION-ACCESS-TEST',
    owner: 'operations',
    requiredEvidence: ['encrypted backup configuration', 'restore test log', 'restricted backup access', 'object metadata restore verification'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'IDEMPOTENCY_RATE_LIMITS',
    controlId: 'C16-IDEMPOTENCY-RATE-LIMITS-CRITICAL-ENDPOINTS',
    owner: 'core http',
    requiredEvidence: ['idempotency key check', 'duplicate command test', 'auth/reset/upload rate-limit test', 'bounded pagination check'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    area: 'RELEASE_GATE',
    controlId: 'C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION',
    owner: 'release engineering',
    requiredEvidence: ['security smoke suite output', 'dependency scan output', 'architecture gate output', 'runtime certification output'],
    runtimeRequired: true,
    blocksProduction: true,
  },
];

export const SecurityHardeningManifest = {
  pass: 'C16',
  name: 'Security Hardening',
  lockedArchitectureUnchanged: true,
  noStackReplacement: true,
  runtimeCertificationRequiredBeforeProduction: true,
  controls: SecurityHardeningEvidenceCatalog,
} as const;

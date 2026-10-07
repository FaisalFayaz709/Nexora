import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const text = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => { if (!exists(p)) errors.push(`Missing required security-hardening file: ${p}`); };
const requireText = (p, marker) => { if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`); else if (!text(p).includes(marker)) errors.push(`Missing marker in ${p}: ${marker}`); };

for (const p of [
  'shared/src/contracts/security-hardening/security-hardening-manifest.ts',
  'shared/src/contracts/security-hardening/index.ts',
  'backend/src/modules/security-hardening/security-hardening-policy.ts',
  'backend/src/modules/security-hardening/security-hardening-policy.test.ts',
  'backend/src/modules/security-hardening/security-hardening.integration.test.ts',
  'frontend/src/modules/security-hardening/security-hardening-center.tsx',
  'frontend/src/app/(erp)/security-hardening/page.tsx',
  '.github/workflows/semgrep.yml',
  'scripts/security-smoke-preflight.sh',
  'scripts/security-smoke-preflight.ps1',
  'docs/compliance/SECURITY_HARDENING.md',
]) requireFile(p);

requireText('package.json', 'security:check');
requireText('package.json', 'security:smoke:preflight');
requireText('shared/src/contracts/index.ts', "export * from './security-hardening';");
requireText('frontend/src/modules/navigation/app-shell.tsx', "['Security Hardening', '/security-hardening', 'security']");
requireText('frontend/src/modules/security-hardening/security-hardening-center.tsx', 'SecurityHardeningEvidenceCatalog');
requireText('.github/workflows/ci.yml', 'pnpm verify:static');
requireText('.github/workflows/semgrep.yml', 'semgrep/semgrep-action');
requireText('.github/workflows/codeql.yml', 'github/codeql-action/analyze');
requireText('.github/dependabot.yml', 'package-ecosystem: npm');

for (const marker of [
  'C16_SECURITY_HARDENING',
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
]) requireText('shared/src/contracts/security-hardening/security-hardening-manifest.ts', marker);

for (const marker of [
  'assertStrongAuthenticationControls',
  'assertServiceLayerAuthorization',
  'assertCrossTenantAbuseCase',
  'assertCsrfCookieHeaderPolicy',
  'assertFileUploadAbuseProtection',
  'assertInputValidationInjectionProtection',
  'assertAuditLogSecretRedaction',
  'assertSupplyChainSecurityGate',
  'assertBackupRestoreSecurityGate',
  'assertIdempotencyAndRateLimitPolicy',
  'assertProductionSecurityReleaseGate',
]) requireText('backend/src/modules/security-hardening/security-hardening-policy.ts', marker);

for (const marker of [
  'Cross-tenant IDOR suite: Organization A cannot read, mutate or presign Organization B records/files',
  'Privilege escalation suite: missing permission cannot approve, post payment, adjust stock or manage roles',
  'Upload abuse suite: oversize, mismatched MIME, bad extension, checksum mismatch and tenant-prefix escape are denied',
  'CSRF and header suite: cookie-authenticated mutations require CSRF/SameSite policy and secure headers',
  'Supply-chain suite: frozen install, pnpm audit, CodeQL, Semgrep and dependency update monitoring block production',
  'Backup/restore suite: PostgreSQL data, object metadata and restricted encrypted backups have restore proof',
]) requireText('backend/src/modules/security-hardening/security-hardening.integration.test.ts', marker);

const frontendRoot = file('frontend/src');
const prohibited = [
  '@nexora/database',
  'backend/src',
  'database/prisma',
  'from \'minio\'',
  'from "minio"',
  'from \'bullmq\'',
  'from "bullmq"',
  'from \'ioredis\'',
  'from "ioredis"',
];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(root, full);
      const body = fs.readFileSync(full, 'utf8');
      for (const marker of prohibited) {
        if (body.includes(marker)) errors.push(`Frontend server-only import marker ${marker} found in ${rel}`);
      }
    }
  }
}
if (exists('frontend/src')) walk(frontendRoot);

if (errors.length) {
  console.error('Security hardening gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Security hardening gate PASSED');
console.log('Security hardening control catalog, CI guardrails and smoke-test map are present.');

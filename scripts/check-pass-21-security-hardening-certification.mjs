#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const limitations = [];
const gateRuns = [];
function pathOf(p){ return join(root,p); }
function hasFile(p){ return existsSync(pathOf(p)); }
function read(p){ return readFileSync(pathOf(p),'utf8'); }
function json(p){ return JSON.parse(read(p)); }
function check(name, passed, message='', options={}){
  const entry = { name, passed, message, blocker: Boolean(options.blocker) };
  checks.push(entry);
  if(!passed){
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if(options.blocker) blockers.push(line); else failures.push(line);
  }
}
function includesAll(name, content, required, msg='Missing invariant(s)'){
  const missing = required.filter((marker)=>!content.includes(marker));
  check(name, missing.length===0, missing.length ? `${msg}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, msg='Forbidden invariant(s) found'){
  const found = forbidden.filter((marker)=>content.includes(marker));
  check(name, found.length===0, found.length ? `${msg}: ${found.join(', ')}` : '');
}
function walk(dir){
  const abs = pathOf(dir);
  const out = [];
  if(!existsSync(abs)) return out;
  for(const name of readdirSync(abs)){
    if(['node_modules','.next','dist','coverage','.turbo'].includes(name)) continue;
    const p = join(abs,name);
    const st = statSync(p);
    if(st.isDirectory()) out.push(...walk(relative(root,p).replace(/\\/g,'/')));
    else out.push(p);
  }
  return out;
}
function previousEvidence(path){
  if(!hasFile(path)){
    if (sourceOnly) return;
    check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    return;
  }
  let status = read(path);
  try { const parsed = JSON.parse(status); status = parsed.status ?? parsed.result ?? status; } catch {}
  const failed = String(status).includes('FAIL');
  check(`previous pass evidence is not failed: ${path}`, !failed, `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}
function runGate(name, args){
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  gateRuns.push({ name, args, status: result.status ?? 1 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0,2400)}`);
}
function countFiles(dir, re){ return walk(dir).filter((f)=>re.test(f)).length; }

mkdirSync(pathOf('certification-output'), { recursive: true });

if(!sourceOnly){
  check('root pnpm-lock.yaml exists for strict security runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit lockfile before claiming runtime security GO.', { blocker: true });
}
previousEvidence('certification-output/pass-20-portals-and-saas-readiness.json');

const requiredFiles = [
  'backend/src/core/security/security-headers.ts',
  'backend/src/core/security/security-headers.test.ts',
  'backend/src/core/security/csrf-policy.ts',
  'backend/src/core/security/csrf-policy.test.ts',
  'backend/src/core/security/upload-abuse-policy.ts',
  'backend/src/core/security/upload-abuse-policy.test.ts',
  'backend/src/core/security/security-release-gate.ts',
  'backend/src/core/security/security-release-gate.test.ts',
  'backend/src/core/security/audit-redaction.ts',
  'backend/src/core/security/rate-limiter.ts',
  'backend/src/core/security/password-hasher.ts',
  'backend/src/core/security/refresh-token.ts',
  'backend/src/core/authorization/route-guard.ts',
  'backend/src/core/authorization/resource-scope.ts',
  'backend/src/modules/security-hardening/security-hardening-policy.ts',
  'backend/src/modules/security-hardening/security-hardening.integration.test.ts',
  'shared/src/contracts/security-hardening/security-hardening-manifest.ts',
  'shared/src/contracts/security-hardening/pass-21-security-hardening.contracts.ts',
  'frontend/src/modules/security-hardening/security-hardening-center.tsx',
  'frontend/src/app/(erp)/security-hardening/page.tsx',
  'docs/security/SECURITY_SMOKE_MATRIX.md',
  'docs/contracts/capability-locks/pass-21-security-hardening.json',
  '.github/workflows/codeql.yml',
  '.github/workflows/semgrep.yml',
  '.github/dependabot.yml',
  'scripts/security-smoke-preflight.sh',
  'scripts/security-smoke-preflight.ps1',
  'scripts/security-smoke-certify.mjs',
  'scripts/check-security-hardening.mjs',
];
for (const f of requiredFiles) check(`PASS 21 file exists: ${f}`, hasFile(f), `${f} is required.`);

const appTs = hasFile('backend/src/app.ts') ? read('backend/src/app.ts') : '';
includesAll('Fastify app applies security headers at response boundary', appTs, ['applySecurityHeaders', "./core/security/security-headers.js", 'x-request-id']);
excludesAll('Fastify app does not install stack-changing security framework', appTs, ['helmet(', '@fastify/helmet']);

const headers = hasFile('backend/src/core/security/security-headers.ts') ? read('backend/src/core/security/security-headers.ts') : '';
includesAll('Security headers include CSP, HSTS, no-sniff, frame, referrer and permissions policies', headers, [
  'PASS_21_SECURITY_HEADERS_POLICY',
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'frame-ancestors',
  "script-src 'self'",
  'assertSecurityHeadersApplied',
]);

const csrf = hasFile('backend/src/core/security/csrf-policy.ts') ? read('backend/src/core/security/csrf-policy.ts') : '';
includesAll('CSRF policy protects cookie-authenticated mutations with header/cookie matching and optional signature', csrf, [
  'PASS_21_CSRF_POLICY',
  'CSRF_HEADER_NAME',
  'CSRF_COOKIE_NAME',
  'POST', 'PUT', 'PATCH', 'DELETE',
  'assertCsrfForCookieMutation',
  'CSRF_TOKEN_REQUIRED',
  'verifySignedCsrfToken',
  'createCsrfPreHandler',
]);

const upload = hasFile('backend/src/core/security/upload-abuse-policy.ts') ? read('backend/src/core/security/upload-abuse-policy.ts') : '';
includesAll('Upload abuse policy checks size, MIME, extension, checksum, object existence, private bucket and tenant prefix', upload, [
  'PASS_21_UPLOAD_ABUSE_POLICY',
  'DEFAULT_ALLOWED_UPLOAD_MIME',
  'DEFAULT_ALLOWED_UPLOAD_EXTENSIONS',
  'UPLOAD_SIZE_LIMIT_EXCEEDED',
  'UPLOAD_MIME_NOT_ALLOWED',
  'UPLOAD_EXTENSION_NOT_ALLOWED',
  'UPLOAD_OBJECT_KEY_SCOPE_VIOLATION',
  'UPLOAD_CHECKSUM_MISMATCH',
  'UPLOAD_BUCKET_NOT_PRIVATE',
  'organizations/${input.organizationId}/',
]);

const releaseGate = hasFile('backend/src/core/security/security-release-gate.ts') ? read('backend/src/core/security/security-release-gate.ts') : '';
includesAll('Security release gate remains HOLD until all runtime and security proof exists', releaseGate, [
  'PASS_21_SECURITY_RELEASE_GATE',
  'lockfilePresent',
  'frozenInstallPassed',
  'securitySmokePassed',
  'crossTenantSuitePassed',
  'privilegeEscalationSuitePassed',
  'uploadAbuseSuitePassed',
  'dependencyAuditPassed',
  'backupRestoreProofPassed',
  'runtimeCertificationPassed',
  'unresolvedCriticalFindings',
]);

const auditRedaction = hasFile('backend/src/core/security/audit-redaction.ts') ? read('backend/src/core/security/audit-redaction.ts') : '';
includesAll('Audit redaction covers credential, token, cookie, CSRF, OTP/MFA and API key leakage', auditRedaction, ['password', 'token', 'refresh', 'secret', 'api[-_]?key', 'authorization', 'cookie', 'csrf', 'otp', 'totp', 'mfa']);

const routeGuard = hasFile('backend/src/core/authorization/route-guard.ts') ? read('backend/src/core/authorization/route-guard.ts') : '';
includesAll('Protected route guard enforces auth -> tenant -> module -> permission order', routeGuard, ['authenticateRequest', 'resolveTenantRequest', 'assertModuleEnabled', 'assertPermission', 'requireTenantContext']);

const resourceScope = hasFile('backend/src/core/authorization/resource-scope.ts') ? read('backend/src/core/authorization/resource-scope.ts') : '';
includesAll('Resource scope helper enforces tenant and branch isolation', resourceScope, ['assertTenantScope', 'TENANT_SCOPE_VIOLATION', 'assertBranchScope', 'BRANCH_SCOPE_VIOLATION', 'tenantWhere', 'tenantBranchWhere']);

const securityPolicy = hasFile('backend/src/modules/security-hardening/security-hardening-policy.ts') ? read('backend/src/modules/security-hardening/security-hardening-policy.ts') : '';
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
]) includesAll(`Security hardening policy includes ${marker}`, securityPolicy, [marker]);

const integration = hasFile('backend/src/modules/security-hardening/security-hardening.integration.test.ts') ? read('backend/src/modules/security-hardening/security-hardening.integration.test.ts') : '';
includesAll('Security integration suite maps abuse cases and runtime smoke requirements', integration, [
  'Cross-tenant IDOR suite',
  'Privilege escalation suite',
  'Upload abuse suite',
  'CSRF and header suite',
  'Supply-chain suite',
  'Backup/restore suite',
]);

const passContract = hasFile('shared/src/contracts/security-hardening/pass-21-security-hardening.contracts.ts') ? read('shared/src/contracts/security-hardening/pass-21-security-hardening.contracts.ts') : '';
includesAll('Shared Pass 21 contract records source and runtime security controls', passContract, [
  'PASS_21_SECURITY_HARDENING_CERTIFICATION',
  'Pass21SecurityEvidenceSchema',
  'Pass21SecurityReleaseDecisionSchema',
  'Pass21SecurityCompletionContract',
  'security headers and CSP',
  'CSRF policy',
  'file upload abuse policy',
  'pnpm install --frozen-lockfile',
  'SECURITY_SMOKE=1 node scripts/security-smoke-certify.mjs',
]);
includesAll('Shared security-hardening barrel exports Pass 21 contract', hasFile('shared/src/contracts/security-hardening/index.ts') ? read('shared/src/contracts/security-hardening/index.ts') : '', ["export * from './pass-21-security-hardening.contracts';"]);

const ci = (hasFile('.github/workflows/codeql.yml') ? read('.github/workflows/codeql.yml') : '') + '\n' + (hasFile('.github/workflows/semgrep.yml') ? read('.github/workflows/semgrep.yml') : '') + '\n' + (hasFile('.github/dependabot.yml') ? read('.github/dependabot.yml') : '');
includesAll('CI supply-chain security gates include CodeQL, Semgrep and Dependabot', ci, ['github/codeql-action/analyze', 'semgrep/semgrep-action', 'package-ecosystem: npm']);

const smoke = (hasFile('scripts/security-smoke-preflight.sh') ? read('scripts/security-smoke-preflight.sh') : '') + '\n' + (hasFile('scripts/security-smoke-certify.mjs') ? read('scripts/security-smoke-certify.mjs') : '');
includesAll('Security smoke scripts require runtime env, dependency audit and unauthorized bypass probes', smoke, ['DATABASE_URL', 'REDIS_URL', 'MINIO_ENDPOINT', 'pnpm audit --audit-level high', 'SECURITY_SMOKE', '/auth/me', '/payments', '/documents']);

const docs = (hasFile('docs/security/SECURITY_SMOKE_MATRIX.md') ? read('docs/security/SECURITY_SMOKE_MATRIX.md') : '') + '\n' + (hasFile('docs/contracts/capability-locks/pass-21-security-hardening.json') ? read('docs/contracts/capability-locks/pass-21-security-hardening.json') : '');
includesAll('PASS 21 docs define runtime smoke and production blockers', docs, ['Cross-tenant IDOR', 'Privilege escalation', 'Upload abuse', 'CSRF', 'Dependency audit', 'Backup and restore', 'SOURCE_LEVEL_RUNTIME_PENDING']);

// Keep supporting gates available and run lightweight source-only checks that do not need npm registry.
runGate('security hardening source gate', ['scripts/check-security-hardening.mjs']);
runGate('architecture source gate', ['scripts/check-architecture.mjs']);
runGate('contract source gate', ['scripts/check-contracts.mjs']);
runGate('route coverage source gate', ['scripts/check-route-coverage.mjs']);

const frontendFiles = walk('frontend/src').filter((f)=>/\.(ts|tsx)$/.test(f));
const prohibitedFrontend = ['@nexora/database', 'backend/src', 'database/prisma', "from 'minio'", 'from "minio"', "from 'ioredis'", 'from "ioredis"', "from 'bullmq'", 'from "bullmq"'];
for (const f of frontendFiles) {
  const rel = relative(root, f).replace(/\\/g,'/');
  const body = read(rel);
  const found = prohibitedFrontend.filter((marker)=>body.includes(marker));
  check(`frontend server-only import scan: ${rel}`, found.length===0, found.length ? `Forbidden imports: ${found.join(', ')}` : '');
}

if(!hasFile('pnpm-lock.yaml')) warnings.push('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected local machine. Final security GO remains blocked.');
limitations.push('PASS 21 is source-level unless run after pnpm-lock.yaml, frozen install, typecheck, tests, Docker runtime, security smoke and backup/restore evidence exist.');
limitations.push('This sandbox cannot access npm registry/runtime services; no runtime GO is claimed.');

const status = blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : failures.length ? 'FAIL_SOURCE_LEVEL' : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME';
const result = {
  pass: 'PASS_21_SECURITY_HARDENING_CERTIFICATION',
  status,
  sourceOnly,
  checksRun: checks.length,
  passed: checks.filter((c)=>c.passed).length,
  blockers,
  failures,
  warnings,
  limitations,
  counts: {
    backendSecurityFiles: countFiles('backend/src/core/security', /\.(ts|tsx)$/),
    frontendFilesScanned: frontendFiles.length,
    securityHardeningFiles: countFiles('backend/src/modules/security-hardening', /\.(ts|tsx)$/),
  },
  gateRuns,
  checks,
};
writeFileSync(pathOf('certification-output/pass-21-security-hardening-certification.json'), `${JSON.stringify(result,null,2)}\n`);
if(blockers.length || failures.length){
  console.error(`PASS 21 failed: ${blockers.length} blocker(s), ${failures.length} failure(s).`);
  for(const item of [...blockers, ...failures]) console.error(`- ${item}`);
  process.exit(1);
}
console.log(JSON.stringify(result,null,2));

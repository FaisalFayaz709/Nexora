import type { SecurityHardeningEvidence, SecurityHardeningControlId } from '@nexora/shared';

export const C16_SECURITY_HARDENING_POLICY = 'C16_SECURITY_HARDENING_POLICY' as const;

export interface AuthenticationSecurityControls {
  readonly passwordHashing: 'argon2id' | 'bcrypt';
  readonly privilegedMfaRequired: boolean;
  readonly loginRateLimitEnabled: boolean;
  readonly passwordResetRateLimitEnabled: boolean;
  readonly sessionRevocationEnabled: boolean;
  readonly refreshTokenStoredHashed: boolean;
}

export interface ServiceAuthorizationControls {
  readonly permissionChecked: boolean;
  readonly tenantContextResolvedInBackend: boolean;
  readonly branchScopeChecked: boolean;
  readonly resourceScopeChecked: boolean;
  readonly organizationIdTrustedFromBody: boolean;
}

export interface AbuseCaseEvidence {
  readonly attemptedAction: string;
  readonly actorOrganizationId: string;
  readonly targetOrganizationId: string;
  readonly actorPermissions: readonly string[];
  readonly requiredPermission: string;
  readonly denied: boolean;
  readonly auditRecorded: boolean;
}

export interface CookieHeaderTlsPolicy {
  readonly httpOnlyRefreshCookie: boolean;
  readonly secureCookieInProduction: boolean;
  readonly sameSite: 'strict' | 'lax' | 'none';
  readonly csrfProtectionForCookieMutations: boolean;
  readonly hstsConfigured: boolean;
  readonly cspConfigured: boolean;
  readonly frameDenied: boolean;
  readonly contentTypeNoSniff: boolean;
  readonly tlsTerminatedAtNginx: boolean;
}

export interface FileUploadSecurityControls {
  readonly privateBucketByDefault: boolean;
  readonly tenantPrefixedObjectKey: boolean;
  readonly mimeValidation: boolean;
  readonly extensionValidation: boolean;
  readonly maxSizeBytes: number;
  readonly checksumVerification: boolean;
  readonly objectExistenceVerification: boolean;
  readonly presignedUrlTtlSeconds: number;
}

export interface InputValidationSecurityControls {
  readonly zodRouteSchema: boolean;
  readonly boundedPagination: boolean;
  readonly allowlistedFilters: boolean;
  readonly allowlistedSorts: boolean;
  readonly prismaParameterizedQueries: boolean;
  readonly rawSqlReviewedAndParameterized: boolean;
  readonly richTextSanitizedWhenIntroduced: boolean;
}

export interface AuditLoggingSecurityControls {
  readonly highRiskActionAudited: boolean;
  readonly beforeAfterSummaryOnly: boolean;
  readonly passwordTokenSecretLoggingBlocked: boolean;
  readonly piiMinimized: boolean;
  readonly requestIdIncluded: boolean;
}

export interface SupplyChainSecurityControls {
  readonly frozenLockfileRequired: boolean;
  readonly pnpmAuditHighBlocks: boolean;
  readonly codeqlWorkflowPresent: boolean;
  readonly semgrepWorkflowPresent: boolean;
  readonly dependabotOrRenovatePresent: boolean;
  readonly containerScanPlanned: boolean;
}

export interface BackupRestoreSecurityControls {
  readonly encryptedBackups: boolean;
  readonly restoreTestDocumented: boolean;
  readonly restrictedAccess: boolean;
  readonly postgresAndObjectMetadataCovered: boolean;
  readonly retentionPolicyDefined: boolean;
}

export interface EndpointResilienceControls {
  readonly idempotencyRequiredForRetrySensitiveCommands: boolean;
  readonly duplicateSubmissionTested: boolean;
  readonly publicEndpointRateLimited: boolean;
  readonly authEndpointRateLimited: boolean;
  readonly highCostEndpointRateLimited: boolean;
}

export interface ProductionSecurityReleaseGate {
  readonly staticArchitectureGatePassed: boolean;
  readonly contractGatePassed: boolean;
  readonly dependencyScanPassed: boolean;
  readonly securitySmokeSuitePassed: boolean;
  readonly runtimeCertificationPassed: boolean;
  readonly unresolvedCriticalFindings: number;
}

function fail(code: SecurityHardeningControlId, message: string): never {
  throw new Error(`${code}: ${message}`);
}

export function assertStrongAuthenticationControls(input: AuthenticationSecurityControls): void {
  if (!['argon2id', 'bcrypt'].includes(input.passwordHashing)) {
    fail('C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION', 'Password hashing must use Argon2id or bcrypt.');
  }
  if (!input.privilegedMfaRequired || !input.loginRateLimitEnabled || !input.passwordResetRateLimitEnabled) {
    fail('C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION', 'Privileged MFA and auth rate limits are mandatory.');
  }
  if (!input.sessionRevocationEnabled || !input.refreshTokenStoredHashed) {
    fail('C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION', 'Refresh/session credentials must be revocable and stored hashed.');
  }
}

export function assertServiceLayerAuthorization(input: ServiceAuthorizationControls): void {
  if (input.organizationIdTrustedFromBody) {
    fail('C16-RBAC-TENANT-BRANCH-RESOURCE-SCOPE-ENFORCED-IN-SERVICES', 'organizationId must come from authenticated membership, not request body.');
  }
  if (!input.permissionChecked || !input.tenantContextResolvedInBackend || !input.branchScopeChecked || !input.resourceScopeChecked) {
    fail('C16-RBAC-TENANT-BRANCH-RESOURCE-SCOPE-ENFORCED-IN-SERVICES', 'Permission, tenant, branch and resource checks must all be enforced in backend services.');
  }
}

export function assertCrossTenantAbuseCase(input: AbuseCaseEvidence): void {
  const crossTenant = input.actorOrganizationId !== input.targetOrganizationId;
  const lacksPermission = !input.actorPermissions.includes(input.requiredPermission);
  if ((crossTenant || lacksPermission) && (!input.denied || !input.auditRecorded)) {
    fail('C16-CROSS-TENANT-IDOR-PRIVILEGE-ESCALATION-TESTS', `${input.attemptedAction} must be denied and audited for cross-tenant/privilege abuse.`);
  }
}

export function assertCsrfCookieHeaderPolicy(input: CookieHeaderTlsPolicy): void {
  if (!input.httpOnlyRefreshCookie || !input.secureCookieInProduction || input.sameSite === 'none') {
    fail('C16-CSRF-SECURE-COOKIES-HEADERS-TLS-POLICY', 'Refresh/session cookies must be HttpOnly, Secure in production, and SameSite protected.');
  }
  if (!input.csrfProtectionForCookieMutations || !input.hstsConfigured || !input.cspConfigured || !input.frameDenied || !input.contentTypeNoSniff || !input.tlsTerminatedAtNginx) {
    fail('C16-CSRF-SECURE-COOKIES-HEADERS-TLS-POLICY', 'CSRF, TLS and security headers must be configured before production.');
  }
}

export function assertFileUploadAbuseProtection(input: FileUploadSecurityControls): void {
  if (!input.privateBucketByDefault || !input.tenantPrefixedObjectKey) {
    fail('C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS', 'Uploaded files must be private by default and tenant-prefixed.');
  }
  if (!input.mimeValidation || !input.extensionValidation || !input.checksumVerification || !input.objectExistenceVerification) {
    fail('C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS', 'Upload completion must validate MIME, extension, checksum and object existence.');
  }
  if (input.maxSizeBytes <= 0 || input.maxSizeBytes > 50 * 1024 * 1024) {
    fail('C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS', 'Upload size limit must be positive and bounded for MVP.');
  }
  if (input.presignedUrlTtlSeconds <= 0 || input.presignedUrlTtlSeconds > 900) {
    fail('C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS', 'Presigned URLs must be short lived.');
  }
}

export function assertInputValidationInjectionProtection(input: InputValidationSecurityControls): void {
  if (!input.zodRouteSchema || !input.boundedPagination || !input.allowlistedFilters || !input.allowlistedSorts) {
    fail('C16-SQLI-XSS-VALIDATION-ALLOWLISTED-FILTERS-SORTS', 'Routes must validate input and restrict pagination, filters and sorting.');
  }
  if (!input.prismaParameterizedQueries || !input.rawSqlReviewedAndParameterized) {
    fail('C16-SQLI-XSS-VALIDATION-ALLOWLISTED-FILTERS-SORTS', 'Queries must be parameterized; raw SQL requires review and parameters.');
  }
}

export function assertAuditLogSecretRedaction(input: AuditLoggingSecurityControls): void {
  if (!input.highRiskActionAudited || !input.beforeAfterSummaryOnly || !input.requestIdIncluded) {
    fail('C16-AUDIT-PII-SECRETS-NO-SENSITIVE-LOGGING', 'High-risk actions must produce request-scoped audit entries with safe before/after summaries.');
  }
  if (!input.passwordTokenSecretLoggingBlocked || !input.piiMinimized) {
    fail('C16-AUDIT-PII-SECRETS-NO-SENSITIVE-LOGGING', 'Secrets and unnecessary PII must not be logged.');
  }
}

export function assertSupplyChainSecurityGate(input: SupplyChainSecurityControls): void {
  if (!input.frozenLockfileRequired || !input.pnpmAuditHighBlocks || !input.codeqlWorkflowPresent || !input.semgrepWorkflowPresent || !input.dependabotOrRenovatePresent) {
    fail('C16-DEPENDENCY-SUPPLY-CHAIN-CODEQL-SEMGREP-AUDIT', 'Frozen install, dependency audit, CodeQL, Semgrep and update monitoring are required.');
  }
}

export function assertBackupRestoreSecurityGate(input: BackupRestoreSecurityControls): void {
  if (!input.encryptedBackups || !input.restoreTestDocumented || !input.restrictedAccess || !input.postgresAndObjectMetadataCovered || !input.retentionPolicyDefined) {
    fail('C16-BACKUP-RESTORE-ENCRYPTION-ACCESS-TEST', 'Backup/restore controls must cover encryption, restore proof, access restriction, retention and object metadata.');
  }
}

export function assertIdempotencyAndRateLimitPolicy(input: EndpointResilienceControls): void {
  if (!input.idempotencyRequiredForRetrySensitiveCommands || !input.duplicateSubmissionTested) {
    fail('C16-IDEMPOTENCY-RATE-LIMITS-CRITICAL-ENDPOINTS', 'Retry-sensitive commands require idempotency and duplicate-submission proof.');
  }
  if (!input.publicEndpointRateLimited || !input.authEndpointRateLimited || !input.highCostEndpointRateLimited) {
    fail('C16-IDEMPOTENCY-RATE-LIMITS-CRITICAL-ENDPOINTS', 'Public, auth and high-cost endpoints require rate limiting.');
  }
}

export function assertProductionSecurityReleaseGate(input: ProductionSecurityReleaseGate): void {
  if (input.unresolvedCriticalFindings > 0) {
    fail('C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION', 'Production release cannot proceed with critical findings.');
  }
  if (!input.staticArchitectureGatePassed || !input.contractGatePassed || !input.dependencyScanPassed || !input.securitySmokeSuitePassed || !input.runtimeCertificationPassed) {
    fail('C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION', 'Production release requires architecture, contract, dependency, security smoke and runtime certification evidence.');
  }
}

export function assertSecurityEvidenceCatalog(catalog: readonly SecurityHardeningEvidence[]): void {
  const blockers = catalog.filter((item) => item.blocksProduction);
  if (blockers.length !== catalog.length) {
    fail('C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION', 'Every C16 control must block production until evidence exists.');
  }
}

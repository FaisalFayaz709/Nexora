import { describe, expect, it } from 'vitest';
import { SecurityHardeningEvidenceCatalog } from '@nexora/shared';
import {
  assertAuditLogSecretRedaction,
  assertBackupRestoreSecurityGate,
  assertCrossTenantAbuseCase,
  assertCsrfCookieHeaderPolicy,
  assertFileUploadAbuseProtection,
  assertIdempotencyAndRateLimitPolicy,
  assertInputValidationInjectionProtection,
  assertProductionSecurityReleaseGate,
  assertSecurityEvidenceCatalog,
  assertServiceLayerAuthorization,
  assertStrongAuthenticationControls,
  assertSupplyChainSecurityGate,
} from './security-hardening-policy.js';

describe('C16 security hardening policy', () => {
  it('requires strong authentication, MFA, rate limiting and session revocation', () => {
    expect(() => assertStrongAuthenticationControls({ passwordHashing: 'bcrypt', privilegedMfaRequired: true, loginRateLimitEnabled: true, passwordResetRateLimitEnabled: true, sessionRevocationEnabled: true, refreshTokenStoredHashed: true })).not.toThrow();
    expect(() => assertStrongAuthenticationControls({ passwordHashing: 'bcrypt', privilegedMfaRequired: false, loginRateLimitEnabled: true, passwordResetRateLimitEnabled: true, sessionRevocationEnabled: true, refreshTokenStoredHashed: true })).toThrow('C16-AUTH-STRONG-PASSWORD-HASH-MFA-RATE-LIMIT-SESSION-REVOCATION');
  });

  it('requires service-level RBAC, tenant, branch and resource scope', () => {
    expect(() => assertServiceLayerAuthorization({ permissionChecked: true, tenantContextResolvedInBackend: true, branchScopeChecked: true, resourceScopeChecked: true, organizationIdTrustedFromBody: false })).not.toThrow();
    expect(() => assertServiceLayerAuthorization({ permissionChecked: true, tenantContextResolvedInBackend: true, branchScopeChecked: true, resourceScopeChecked: true, organizationIdTrustedFromBody: true })).toThrow('C16-RBAC-TENANT-BRANCH-RESOURCE-SCOPE-ENFORCED-IN-SERVICES');
  });

  it('requires cross-tenant and privilege abuse attempts to be denied and audited', () => {
    expect(() => assertCrossTenantAbuseCase({ attemptedAction: 'GET /api/v1/assets/:id', actorOrganizationId: 'org-a', targetOrganizationId: 'org-b', actorPermissions: ['asset.view'], requiredPermission: 'asset.view', denied: true, auditRecorded: true })).not.toThrow();
    expect(() => assertCrossTenantAbuseCase({ attemptedAction: 'POST /api/v1/payments', actorOrganizationId: 'org-a', targetOrganizationId: 'org-a', actorPermissions: [], requiredPermission: 'payment.create', denied: false, auditRecorded: false })).toThrow('C16-CROSS-TENANT-IDOR-PRIVILEGE-ESCALATION-TESTS');
  });

  it('requires CSRF, secure cookie, TLS and header controls', () => {
    expect(() => assertCsrfCookieHeaderPolicy({ httpOnlyRefreshCookie: true, secureCookieInProduction: true, sameSite: 'lax', csrfProtectionForCookieMutations: true, hstsConfigured: true, cspConfigured: true, frameDenied: true, contentTypeNoSniff: true, tlsTerminatedAtNginx: true })).not.toThrow();
    expect(() => assertCsrfCookieHeaderPolicy({ httpOnlyRefreshCookie: true, secureCookieInProduction: true, sameSite: 'none', csrfProtectionForCookieMutations: true, hstsConfigured: true, cspConfigured: true, frameDenied: true, contentTypeNoSniff: true, tlsTerminatedAtNginx: true })).toThrow('C16-CSRF-SECURE-COOKIES-HEADERS-TLS-POLICY');
  });

  it('requires secure file upload boundaries', () => {
    expect(() => assertFileUploadAbuseProtection({ privateBucketByDefault: true, tenantPrefixedObjectKey: true, mimeValidation: true, extensionValidation: true, maxSizeBytes: 10_000_000, checksumVerification: true, objectExistenceVerification: true, presignedUrlTtlSeconds: 300 })).not.toThrow();
    expect(() => assertFileUploadAbuseProtection({ privateBucketByDefault: false, tenantPrefixedObjectKey: true, mimeValidation: true, extensionValidation: true, maxSizeBytes: 10_000_000, checksumVerification: true, objectExistenceVerification: true, presignedUrlTtlSeconds: 300 })).toThrow('C16-FILE-UPLOAD-ABUSE-SIZE-MIME-CHECKSUM-PRIVATE-BUCKETS');
  });

  it('requires input validation and injection protection', () => {
    expect(() => assertInputValidationInjectionProtection({ zodRouteSchema: true, boundedPagination: true, allowlistedFilters: true, allowlistedSorts: true, prismaParameterizedQueries: true, rawSqlReviewedAndParameterized: true, richTextSanitizedWhenIntroduced: true })).not.toThrow();
    expect(() => assertInputValidationInjectionProtection({ zodRouteSchema: true, boundedPagination: true, allowlistedFilters: false, allowlistedSorts: true, prismaParameterizedQueries: true, rawSqlReviewedAndParameterized: true, richTextSanitizedWhenIntroduced: true })).toThrow('C16-SQLI-XSS-VALIDATION-ALLOWLISTED-FILTERS-SORTS');
  });

  it('requires safe audit logging and secret redaction', () => {
    expect(() => assertAuditLogSecretRedaction({ highRiskActionAudited: true, beforeAfterSummaryOnly: true, passwordTokenSecretLoggingBlocked: true, piiMinimized: true, requestIdIncluded: true })).not.toThrow();
    expect(() => assertAuditLogSecretRedaction({ highRiskActionAudited: true, beforeAfterSummaryOnly: true, passwordTokenSecretLoggingBlocked: false, piiMinimized: true, requestIdIncluded: true })).toThrow('C16-AUDIT-PII-SECRETS-NO-SENSITIVE-LOGGING');
  });

  it('requires supply-chain scanning gates', () => {
    expect(() => assertSupplyChainSecurityGate({ frozenLockfileRequired: true, pnpmAuditHighBlocks: true, codeqlWorkflowPresent: true, semgrepWorkflowPresent: true, dependabotOrRenovatePresent: true, containerScanPlanned: true })).not.toThrow();
    expect(() => assertSupplyChainSecurityGate({ frozenLockfileRequired: true, pnpmAuditHighBlocks: true, codeqlWorkflowPresent: true, semgrepWorkflowPresent: false, dependabotOrRenovatePresent: true, containerScanPlanned: true })).toThrow('C16-DEPENDENCY-SUPPLY-CHAIN-CODEQL-SEMGREP-AUDIT');
  });

  it('requires backup and restore controls', () => {
    expect(() => assertBackupRestoreSecurityGate({ encryptedBackups: true, restoreTestDocumented: true, restrictedAccess: true, postgresAndObjectMetadataCovered: true, retentionPolicyDefined: true })).not.toThrow();
    expect(() => assertBackupRestoreSecurityGate({ encryptedBackups: true, restoreTestDocumented: false, restrictedAccess: true, postgresAndObjectMetadataCovered: true, retentionPolicyDefined: true })).toThrow('C16-BACKUP-RESTORE-ENCRYPTION-ACCESS-TEST');
  });

  it('requires idempotency and rate limits for critical endpoints', () => {
    expect(() => assertIdempotencyAndRateLimitPolicy({ idempotencyRequiredForRetrySensitiveCommands: true, duplicateSubmissionTested: true, publicEndpointRateLimited: true, authEndpointRateLimited: true, highCostEndpointRateLimited: true })).not.toThrow();
    expect(() => assertIdempotencyAndRateLimitPolicy({ idempotencyRequiredForRetrySensitiveCommands: true, duplicateSubmissionTested: false, publicEndpointRateLimited: true, authEndpointRateLimited: true, highCostEndpointRateLimited: true })).toThrow('C16-IDEMPOTENCY-RATE-LIMITS-CRITICAL-ENDPOINTS');
  });

  it('blocks production until security evidence is complete', () => {
    expect(() => assertSecurityEvidenceCatalog(SecurityHardeningEvidenceCatalog)).not.toThrow();
    expect(() => assertProductionSecurityReleaseGate({ staticArchitectureGatePassed: true, contractGatePassed: true, dependencyScanPassed: true, securitySmokeSuitePassed: true, runtimeCertificationPassed: true, unresolvedCriticalFindings: 0 })).not.toThrow();
    expect(() => assertProductionSecurityReleaseGate({ staticArchitectureGatePassed: true, contractGatePassed: true, dependencyScanPassed: true, securitySmokeSuitePassed: false, runtimeCertificationPassed: true, unresolvedCriticalFindings: 0 })).toThrow('C16-SECURITY-RELEASE-GATE-BLOCKS-UNCERTIFIED-PRODUCTION');
  });
});

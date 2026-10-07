import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';
import { PermissionKeySchema } from '../../permissions';

export const MISSING_PASS_M19_SOURCE_PREFLIGHT_SECURITY_ABUSE_MAKER_CHECKER =
  'MISSING_PASS_M19_SOURCE_PREFLIGHT_SECURITY_ABUSE_MAKER_CHECKER' as const;

export const M19SecurityCompletionSubjects = [
  'HIGH_RISK_COMMAND_REGISTRY',
  'MAKER_CHECKER_ENFORCED_FOR_APPROVALS_POSTINGS_PAYMENTS_STOCK',
  'ABUSE_CASE_IDOR_TENANT_BRANCH_RESOURCE_SCOPE',
  'PRIVILEGE_ESCALATION_DENIAL_MATRIX',
  'AUTH_RATE_LIMIT_LOCKOUT_SESSION_REVOCATION',
  'IDEMPOTENCY_PAYLOAD_HASH_REPLAY_PROTECTION',
  'AUDIT_SECRET_PII_REDACTION',
  'CSRF_COOKIE_HEADER_TLS_BOUNDARY',
  'UPLOAD_ABUSE_MIME_EXTENSION_SIZE_CHECKSUM',
  'SQLI_XSS_FILTER_SORT_ALLOWLIST',
  'SUPPLY_CHAIN_CI_SECURITY_GATE',
  'BACKUP_RESTORE_SECURITY_GATE',
  'NO_SECURITY_BYPASS_IN_FRONTEND_OR_WORKER',
  'PRODUCTION_RELEASE_BLOCKER_SECURITY_EVIDENCE',
] as const;
export type M19SecurityCompletionSubject = (typeof M19SecurityCompletionSubjects)[number];

export const M19SecuritySurfaceSchema = z.enum([
  'AUTH',
  'AUTHORIZATION',
  'TENANT_ISOLATION',
  'MAKER_CHECKER',
  'IDEMPOTENCY',
  'AUDIT_LOGGING',
  'HTTP_SECURITY',
  'UPLOADS',
  'INPUT_VALIDATION',
  'CI_SUPPLY_CHAIN',
  'BACKUP_RESTORE',
  'FRONTEND_WORKFLOW',
  'WORKER_QUEUE',
  'RELEASE_GATE',
]);
export type M19SecuritySurface = z.infer<typeof M19SecuritySurfaceSchema>;

export const M19HighRiskCommandCategorySchema = z.enum([
  'APPROVAL_DECISION',
  'STOCK_LEDGER_MUTATION',
  'STOCK_COUNT_VARIANCE',
  'PURCHASE_ORDER_APPROVAL',
  'GOODS_RECEIPT_POSTING',
  'SUPPLIER_INVOICE_MATCH_APPROVAL',
  'PAYMENT_POSTING',
  'JOURNAL_POSTING',
  'CUSTOMER_INVOICE_POSTING',
  'ASSET_INSTALL_REPLACE_RETIRE',
  'WORK_ORDER_COMPLETION',
  'MAINTENANCE_EXECUTION_COMPLETION',
  'ROLE_PERMISSION_ADMINISTRATION',
  'DOCUMENT_EXTERNAL_ACCESS',
]);
export type M19HighRiskCommandCategory = z.infer<typeof M19HighRiskCommandCategorySchema>;

export const M19SecurityControlIdSchema = z.enum([
  'M19-HIGH-RISK-COMMAND-REGISTRY',
  'M19-MAKER-CHECKER-ENFORCED',
  'M19-ABUSE-CASE-IDOR-TENANT-BRANCH-RESOURCE-SCOPE',
  'M19-PRIVILEGE-ESCALATION-DENIAL-MATRIX',
  'M19-AUTH-RATE-LIMIT-LOCKOUT-SESSION-REVOCATION',
  'M19-IDEMPOTENCY-PAYLOAD-HASH-REPLAY-PROTECTION',
  'M19-AUDIT-SECRET-PII-REDACTION',
  'M19-CSRF-COOKIE-HEADER-TLS-BOUNDARY',
  'M19-UPLOAD-ABUSE-MIME-EXTENSION-SIZE-CHECKSUM',
  'M19-SQLI-XSS-FILTER-SORT-ALLOWLIST',
  'M19-SUPPLY-CHAIN-CI-SECURITY-GATE',
  'M19-BACKUP-RESTORE-SECURITY-GATE',
  'M19-NO-SECURITY-BYPASS-IN-FRONTEND-OR-WORKER',
  'M19-PRODUCTION-RELEASE-BLOCKER-SECURITY-EVIDENCE',
]);
export type M19SecurityControlId = z.infer<typeof M19SecurityControlIdSchema>;

export const M19HighRiskCommandSchema = z.object({
  category: M19HighRiskCommandCategorySchema,
  routePattern: NonEmptyStringSchema,
  requiredPermission: PermissionKeySchema,
  requiresMakerChecker: z.boolean(),
  requiresIdempotencyKey: z.boolean(),
  requiresAuditLog: z.boolean(),
  requiresPostgresTransaction: z.boolean(),
});
export type M19HighRiskCommand = z.infer<typeof M19HighRiskCommandSchema>;

export const M19SecurityCompletionRowSchema = z.object({
  subject: z.enum(M19SecurityCompletionSubjects),
  controlId: M19SecurityControlIdSchema,
  surface: M19SecuritySurfaceSchema,
  runtimeProof: NonEmptyStringSchema,
  blocksProduction: z.boolean(),
});
export type M19SecurityCompletionRow = z.infer<typeof M19SecurityCompletionRowSchema>;

export const M19HighRiskCommandRegistry = [
  { category: 'APPROVAL_DECISION', routePattern: '/api/v1/approvals/requests/:id/decide', requiredPermission: 'approval.act', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'STOCK_LEDGER_MUTATION', routePattern: '/api/v1/inventory/adjustments/:id/post', requiredPermission: 'inventory.adjust', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'STOCK_COUNT_VARIANCE', routePattern: '/api/v1/stock-counts/:id/approve', requiredPermission: 'stock_count.post', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'PURCHASE_ORDER_APPROVAL', routePattern: '/api/v1/procurement/purchase-orders/:id/approve', requiredPermission: 'purchase_order.approve', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'GOODS_RECEIPT_POSTING', routePattern: '/api/v1/procurement/goods-receipts/:id/post', requiredPermission: 'goods_receipt.create', requiresMakerChecker: false, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'SUPPLIER_INVOICE_MATCH_APPROVAL', routePattern: '/api/v1/finance/supplier-invoices/:id/approve', requiredPermission: 'supplier_invoice.approve', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'PAYMENT_POSTING', routePattern: '/api/v1/finance/payments/:id/post', requiredPermission: 'payment.create', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'JOURNAL_POSTING', routePattern: '/api/v1/finance/journals/:id/post', requiredPermission: 'journal.post', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'CUSTOMER_INVOICE_POSTING', routePattern: '/api/v1/finance/customer-invoices/:id/post', requiredPermission: 'journal.post', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'ASSET_INSTALL_REPLACE_RETIRE', routePattern: '/api/v1/assets/:id/lifecycle', requiredPermission: 'asset.update', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'WORK_ORDER_COMPLETION', routePattern: '/api/v1/service/work-orders/:id/complete', requiredPermission: 'workorder.close', requiresMakerChecker: false, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'MAINTENANCE_EXECUTION_COMPLETION', routePattern: '/api/v1/maintenance/executions/:id/complete', requiredPermission: 'maintenance.execute', requiresMakerChecker: false, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'ROLE_PERMISSION_ADMINISTRATION', routePattern: '/api/v1/identity/users/:id/roles', requiredPermission: 'identity.role.manage', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
  { category: 'DOCUMENT_EXTERNAL_ACCESS', routePattern: '/api/v1/documents/:id/share', requiredPermission: 'document.update', requiresMakerChecker: true, requiresIdempotencyKey: true, requiresAuditLog: true, requiresPostgresTransaction: true },
] as const satisfies readonly M19HighRiskCommand[];

export const M19SecurityCompletionRows = [
  { subject: 'HIGH_RISK_COMMAND_REGISTRY', controlId: 'M19-HIGH-RISK-COMMAND-REGISTRY', surface: 'AUTHORIZATION', runtimeProof: 'Every high-risk command route maps to permission, idempotency, audit, transaction and maker-checker requirements.', blocksProduction: true },
  { subject: 'MAKER_CHECKER_ENFORCED_FOR_APPROVALS_POSTINGS_PAYMENTS_STOCK', controlId: 'M19-MAKER-CHECKER-ENFORCED', surface: 'MAKER_CHECKER', runtimeProof: 'Creator/requester cannot be the sole approver/poster for high-risk approval, stock, payment, journal, role and document-share commands.', blocksProduction: true },
  { subject: 'ABUSE_CASE_IDOR_TENANT_BRANCH_RESOURCE_SCOPE', controlId: 'M19-ABUSE-CASE-IDOR-TENANT-BRANCH-RESOURCE-SCOPE', surface: 'TENANT_ISOLATION', runtimeProof: 'Cross-tenant, cross-branch and resource-scope abuse attempts are denied and audited.', blocksProduction: true },
  { subject: 'PRIVILEGE_ESCALATION_DENIAL_MATRIX', controlId: 'M19-PRIVILEGE-ESCALATION-DENIAL-MATRIX', surface: 'AUTHORIZATION', runtimeProof: 'Users without permission cannot approve, post payments, adjust stock, manage roles, share documents or bypass portals.', blocksProduction: true },
  { subject: 'AUTH_RATE_LIMIT_LOCKOUT_SESSION_REVOCATION', controlId: 'M19-AUTH-RATE-LIMIT-LOCKOUT-SESSION-REVOCATION', surface: 'AUTH', runtimeProof: 'Login/reset/MFA attempts are rate-limited and revoked sessions/refresh tokens stop access.', blocksProduction: true },
  { subject: 'IDEMPOTENCY_PAYLOAD_HASH_REPLAY_PROTECTION', controlId: 'M19-IDEMPOTENCY-PAYLOAD-HASH-REPLAY-PROTECTION', surface: 'IDEMPOTENCY', runtimeProof: 'Duplicate retry-sensitive command with the same body replays safely; changed body with same key is rejected.', blocksProduction: true },
  { subject: 'AUDIT_SECRET_PII_REDACTION', controlId: 'M19-AUDIT-SECRET-PII-REDACTION', surface: 'AUDIT_LOGGING', runtimeProof: 'Audit before/after JSON redacts password, token, secret, OTP, cookie, key and sensitive attachment evidence.', blocksProduction: true },
  { subject: 'CSRF_COOKIE_HEADER_TLS_BOUNDARY', controlId: 'M19-CSRF-COOKIE-HEADER-TLS-BOUNDARY', surface: 'HTTP_SECURITY', runtimeProof: 'Cookie-authenticated mutations require CSRF/SameSite protections and production security headers/TLS are present.', blocksProduction: true },
  { subject: 'UPLOAD_ABUSE_MIME_EXTENSION_SIZE_CHECKSUM', controlId: 'M19-UPLOAD-ABUSE-MIME-EXTENSION-SIZE-CHECKSUM', surface: 'UPLOADS', runtimeProof: 'Oversize, extension mismatch, MIME mismatch, checksum mismatch and tenant-prefix escape attempts are denied.', blocksProduction: true },
  { subject: 'SQLI_XSS_FILTER_SORT_ALLOWLIST', controlId: 'M19-SQLI-XSS-FILTER-SORT-ALLOWLIST', surface: 'INPUT_VALIDATION', runtimeProof: 'SQLi/XSS payloads are blocked by Zod schemas, allowlisted filters/sorts and parameterized Prisma/raw SQL boundaries.', blocksProduction: true },
  { subject: 'SUPPLY_CHAIN_CI_SECURITY_GATE', controlId: 'M19-SUPPLY-CHAIN-CI-SECURITY-GATE', surface: 'CI_SUPPLY_CHAIN', runtimeProof: 'CI blocks unreviewed dependencies and runs frozen install, CodeQL, Semgrep and dependency audit evidence.', blocksProduction: true },
  { subject: 'BACKUP_RESTORE_SECURITY_GATE', controlId: 'M19-BACKUP-RESTORE-SECURITY-GATE', surface: 'BACKUP_RESTORE', runtimeProof: 'Encrypted PostgreSQL/object metadata backup and restore evidence exists before production.', blocksProduction: true },
  { subject: 'NO_SECURITY_BYPASS_IN_FRONTEND_OR_WORKER', controlId: 'M19-NO-SECURITY-BYPASS-IN-FRONTEND-OR-WORKER', surface: 'FRONTEND_WORKFLOW', runtimeProof: 'Frontend and workers cannot bypass backend authorization or mutate critical state directly.', blocksProduction: true },
  { subject: 'PRODUCTION_RELEASE_BLOCKER_SECURITY_EVIDENCE', controlId: 'M19-PRODUCTION-RELEASE-BLOCKER-SECURITY-EVIDENCE', surface: 'RELEASE_GATE', runtimeProof: 'Production release is blocked until security smoke, abuse, maker-checker, runtime and restore evidence pass.', blocksProduction: true },
] as const satisfies readonly M19SecurityCompletionRow[];

export const M19RuntimeAbuseScenarios = [
  'cross-tenant read/update/delete is denied and audited',
  'cross-branch resource access is denied for branch-scoped users',
  'missing permission cannot approve, post, pay, adjust, share, import or manage roles',
  'maker cannot approve or post own high-risk request',
  'same idempotency key with changed payload hash is rejected',
  'audit logs redact secrets and high-risk details are minimal',
  'auth/reset/MFA endpoints are rate limited and lockout-safe',
  'document upload abuse cases are denied before object access',
  'SQLi/XSS/filter/sort abuse does not reach unsafe query construction',
  'frontend/worker critical state bypass attempts fail',
  'security release gate blocks production while runtime/restore evidence is missing',
] as const;

export const M19SecurityCompletionManifest = {
  pass: 'M19',
  name: 'Security, Abuse Cases, Maker-Checker and Production Gate Completion',
  sourcePreflightToken: MISSING_PASS_M19_SOURCE_PREFLIGHT_SECURITY_ABUSE_MAKER_CHECKER,
  highRiskCommands: M19HighRiskCommandRegistry,
  controls: M19SecurityCompletionRows,
  runtimeScenarios: M19RuntimeAbuseScenarios,
  lockedStackUnchanged: true,
  lockedArchitectureUnchanged: true,
  productionBlockedUntilRuntimeCertified: true,
} as const;

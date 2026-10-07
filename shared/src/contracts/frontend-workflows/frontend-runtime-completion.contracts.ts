import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';
import { PermissionKeySchema } from '../../permissions';

export const MISSING_PASS_M18_SOURCE_PREFLIGHT_FRONTEND_RUNTIME_UX_RBAC =
  'MISSING_PASS_M18_SOURCE_PREFLIGHT_FRONTEND_RUNTIME_UX_RBAC' as const;

export const FrontendRuntimeCompletionSubjects = [
  'APP_SHELL_PERMISSION_SCOPED_NAVIGATION',
  'APP_SHELL_FEATURE_FLAG_SCOPED_MODULES',
  'TENANT_CONTEXT_SELECTION_AND_HEADER_PROPAGATION',
  'WORKFLOW_COMMAND_PERMISSION_GATE',
  'WORKFLOW_COMMAND_IDEMPOTENCY_GATE',
  'WORKFLOW_COMMAND_HIGH_RISK_CONFIRMATION',
  'WORKFLOW_COMMAND_STATUS_EVIDENCE_GATE',
  'TANSTACK_QUERY_INVALIDATION_EVIDENCE',
  'SHARED_CONTRACT_PAYLOAD_DISCLOSURE',
  'DOCUMENT_EVIDENCE_UPLOAD_INTENT_PATH',
  'PORTAL_PWA_OFFLINE_UI_GUARDS',
  'ERROR_EMPTY_LOADING_STATE_STANDARDIZATION',
  'NO_FRONTEND_SERVER_SIDE_SHORTCUTS',
  'NO_FRONTEND_CRITICAL_STATE_BYPASS',
] as const;
export type FrontendRuntimeCompletionSubject = (typeof FrontendRuntimeCompletionSubjects)[number];

export const FrontendRuntimeSurfaceSchema = z.enum([
  'APP_SHELL',
  'TENANT_SWITCHER',
  'ROLE_NAVIGATION',
  'MODULE_PAGE',
  'WORKFLOW_WORKBENCH',
  'COMMAND_FORM',
  'READ_MODEL_PANEL',
  'DOCUMENT_EVIDENCE',
  'PORTAL_WORKSPACE',
  'PWA_OFFLINE_QUEUE',
]);
export type FrontendRuntimeSurface = z.infer<typeof FrontendRuntimeSurfaceSchema>;

export const FrontendRuntimeControlIdSchema = z.enum([
  'M18-APP-SHELL-PERMISSION-SCOPED-NAVIGATION',
  'M18-APP-SHELL-FEATURE-FLAG-SCOPED-MODULES',
  'M18-TENANT-CONTEXT-SELECTION-AND-HEADER-PROPAGATION',
  'M18-WORKFLOW-COMMAND-PERMISSION-GATE',
  'M18-WORKFLOW-COMMAND-IDEMPOTENCY-GATE',
  'M18-WORKFLOW-COMMAND-HIGH-RISK-CONFIRMATION',
  'M18-WORKFLOW-COMMAND-STATUS-EVIDENCE-GATE',
  'M18-TANSTACK-QUERY-INVALIDATION-EVIDENCE',
  'M18-SHARED-CONTRACT-PAYLOAD-DISCLOSURE',
  'M18-DOCUMENT-EVIDENCE-UPLOAD-INTENT-PATH',
  'M18-PORTAL-PWA-OFFLINE-UI-GUARDS',
  'M18-ERROR-EMPTY-LOADING-STATE-STANDARDIZATION',
  'M18-NO-FRONTEND-SERVER-SIDE-SHORTCUTS',
  'M18-NO-FRONTEND-CRITICAL-STATE-BYPASS',
]);
export type FrontendRuntimeControlId = z.infer<typeof FrontendRuntimeControlIdSchema>;

export const FrontendNavigationItemCompletionSchema = z.object({
  label: NonEmptyStringSchema,
  href: NonEmptyStringSchema,
  moduleKey: NonEmptyStringSchema,
  requiredPermission: PermissionKeySchema,
  surface: FrontendRuntimeSurfaceSchema,
  highRiskSurface: z.boolean().default(false),
});
export type FrontendNavigationItemCompletion = z.infer<typeof FrontendNavigationItemCompletionSchema>;

export const FrontendRuntimeCommandGateSchema = z.object({
  requiredPermission: PermissionKeySchema,
  requiresIdempotencyKey: z.boolean(),
  destructiveOrHighRisk: z.boolean(),
  requiredStatus: z.array(NonEmptyStringSchema),
  invalidatesQueryKeys: z.array(NonEmptyStringSchema),
  usesPublicApiEndpoint: z.boolean(),
});
export type FrontendRuntimeCommandGate = z.infer<typeof FrontendRuntimeCommandGateSchema>;

export const FrontendRuntimeCompletionRowSchema = z.object({
  subject: z.enum(FrontendRuntimeCompletionSubjects),
  controlId: FrontendRuntimeControlIdSchema,
  surface: FrontendRuntimeSurfaceSchema,
  requiredPermission: PermissionKeySchema.optional(),
  runtimeProof: NonEmptyStringSchema,
});
export type FrontendRuntimeCompletionRow = z.infer<typeof FrontendRuntimeCompletionRowSchema>;

export const FrontendRuntimeCompletionRows = [
  {
    subject: 'APP_SHELL_PERMISSION_SCOPED_NAVIGATION',
    controlId: 'M18-APP-SHELL-PERMISSION-SCOPED-NAVIGATION',
    surface: 'ROLE_NAVIGATION',
    requiredPermission: 'organization.view',
    runtimeProof: 'Log in as every seeded role and prove hidden links are not rendered and direct navigation is still denied by API authorization.',
  },
  {
    subject: 'APP_SHELL_FEATURE_FLAG_SCOPED_MODULES',
    controlId: 'M18-APP-SHELL-FEATURE-FLAG-SCOPED-MODULES',
    surface: 'APP_SHELL',
    runtimeProof: 'Disable a module feature flag and prove navigation and module entry points disappear without removing backend route protection.',
  },
  {
    subject: 'TENANT_CONTEXT_SELECTION_AND_HEADER_PROPAGATION',
    controlId: 'M18-TENANT-CONTEXT-SELECTION-AND-HEADER-PROPAGATION',
    surface: 'TENANT_SWITCHER',
    runtimeProof: 'Select each active membership and prove x-organization-id is sent on API calls while invalid stored tenant context is discarded.',
  },
  {
    subject: 'WORKFLOW_COMMAND_PERMISSION_GATE',
    controlId: 'M18-WORKFLOW-COMMAND-PERMISSION-GATE',
    surface: 'COMMAND_FORM',
    requiredPermission: 'workflow.manage',
    runtimeProof: 'A command button is disabled for missing permission, and a forged browser call is rejected by backend RBAC.',
  },
  {
    subject: 'WORKFLOW_COMMAND_IDEMPOTENCY_GATE',
    controlId: 'M18-WORKFLOW-COMMAND-IDEMPOTENCY-GATE',
    surface: 'COMMAND_FORM',
    runtimeProof: 'Retry-sensitive commands carry Idempotency-Key and backend rejects same key with different payload hash.',
  },
  {
    subject: 'WORKFLOW_COMMAND_HIGH_RISK_CONFIRMATION',
    controlId: 'M18-WORKFLOW-COMMAND-HIGH-RISK-CONFIRMATION',
    surface: 'COMMAND_FORM',
    runtimeProof: 'High-risk submit/approve/post/receive/pay actions cannot be fired until explicit confirmation is checked.',
  },
  {
    subject: 'WORKFLOW_COMMAND_STATUS_EVIDENCE_GATE',
    controlId: 'M18-WORKFLOW-COMMAND-STATUS-EVIDENCE-GATE',
    surface: 'WORKFLOW_WORKBENCH',
    runtimeProof: 'Action visibility follows server status/read-model evidence and stale state is refreshed after each mutation.',
  },
  {
    subject: 'TANSTACK_QUERY_INVALIDATION_EVIDENCE',
    controlId: 'M18-TANSTACK-QUERY-INVALIDATION-EVIDENCE',
    surface: 'READ_MODEL_PANEL',
    runtimeProof: 'Each mutation invalidates the listed TanStack Query keys and refetches affected read models.',
  },
  {
    subject: 'SHARED_CONTRACT_PAYLOAD_DISCLOSURE',
    controlId: 'M18-SHARED-CONTRACT-PAYLOAD-DISCLOSURE',
    surface: 'COMMAND_FORM',
    runtimeProof: 'Command forms display payload templates from shared manifests and do not invent hidden fields.',
  },
  {
    subject: 'DOCUMENT_EVIDENCE_UPLOAD_INTENT_PATH',
    controlId: 'M18-DOCUMENT-EVIDENCE-UPLOAD-INTENT-PATH',
    surface: 'DOCUMENT_EVIDENCE',
    requiredPermission: 'document.create',
    runtimeProof: 'Photos, signatures and report downloads go through document upload-intent / access-log paths only.',
  },
  {
    subject: 'PORTAL_PWA_OFFLINE_UI_GUARDS',
    controlId: 'M18-PORTAL-PWA-OFFLINE-UI-GUARDS',
    surface: 'PWA_OFFLINE_QUEUE',
    runtimeProof: 'Portal and technician PWA surfaces preserve linked-customer/vendor/assigned-technician and offline replay/conflict guards.',
  },
  {
    subject: 'ERROR_EMPTY_LOADING_STATE_STANDARDIZATION',
    controlId: 'M18-ERROR-EMPTY-LOADING-STATE-STANDARDIZATION',
    surface: 'MODULE_PAGE',
    runtimeProof: 'Module pages show loading, empty, error and denied states without leaking unauthorized identifiers.',
  },
  {
    subject: 'NO_FRONTEND_SERVER_SIDE_SHORTCUTS',
    controlId: 'M18-NO-FRONTEND-SERVER-SIDE-SHORTCUTS',
    surface: 'MODULE_PAGE',
    runtimeProof: 'Frontend static scan shows no imports from database, Prisma, storage SDK, queue SDK, Redis or server-only packages.',
  },
  {
    subject: 'NO_FRONTEND_CRITICAL_STATE_BYPASS',
    controlId: 'M18-NO-FRONTEND-CRITICAL-STATE-BYPASS',
    surface: 'WORKFLOW_WORKBENCH',
    runtimeProof: 'Frontend only submits public API commands; it never mutates stock, money, approval, journal, asset, invoice or work-order state directly.',
  },
] as const satisfies readonly FrontendRuntimeCompletionRow[];

export const FrontendRuntimeRouteCoverage = [
  '/',
  '/customers',
  '/vendors',
  '/products',
  '/warehouses',
  '/inventory',
  '/procurement/workflow',
  '/projects/delivery',
  '/assets/lifecycle',
  '/service/field-operations',
  '/maintenance/workbench',
  '/finance/workbench',
  '/documents-notifications',
  '/reports-workbench',
  '/portals',
  '/workflow-completion',
  '/workflow-completion/runtime',
] as const;

export const FrontendRuntimeBrowserCertificationRoles = [
  'PLATFORM_ADMIN',
  'TENANT_ADMIN',
  'PROCUREMENT_MANAGER',
  'INVENTORY_MANAGER',
  'FINANCE_MANAGER',
  'PROJECT_MANAGER',
  'SERVICE_MANAGER',
  'TECHNICIAN',
] as const;

export const FrontendRuntimeRuntimeScenarios = [
  'login redirects unauthenticated users to /login',
  'active membership tenant selection persists only valid organization context',
  'navigation is filtered by feature flag and user permission',
  'direct URL access relies on API denial and never frontend-only security',
  'workflow command buttons require permission, status evidence, IDs and confirmation',
  'idempotency key is attached to retry-sensitive commands',
  'mutation invalidates all affected TanStack Query keys',
  'document/photo/signature actions use upload-intent only',
  'portal/PWA/offline surfaces keep linked-subject scope',
  'all role dashboards render loading/empty/error/denied states safely',
  'frontend static scan has no server-side shortcut imports',
] as const;

export const FrontendRuntimeCompletionManifest = {
  pass: 'M18',
  name: 'Frontend Runtime UX, RBAC and Workflow Completion',
  sourcePreflightMarker: MISSING_PASS_M18_SOURCE_PREFLIGHT_FRONTEND_RUNTIME_UX_RBAC,
  subjects: FrontendRuntimeCompletionSubjects,
  rows: FrontendRuntimeCompletionRows,
  routeCoverage: FrontendRuntimeRouteCoverage,
  browserCertificationRoles: FrontendRuntimeBrowserCertificationRoles,
  runtimeScenarios: FrontendRuntimeRuntimeScenarios,
  lockedStackRule: 'Frontend remains Next.js + TypeScript + Tailwind + TanStack Query and calls only public API endpoints.',
  authorizationRule: 'Navigation visibility is a usability guard only; backend RBAC, tenant and branch checks remain authoritative.',
  commandRule: 'Critical stock, money, approval, invoice, journal, asset and work-order changes are submitted only as backend API commands.',
  documentRule: 'Documents, photos and signatures must use document upload intent and access logging paths instead of direct object-store shortcuts.',
} as const;

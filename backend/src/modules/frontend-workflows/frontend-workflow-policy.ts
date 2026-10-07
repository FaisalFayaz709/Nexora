import type { FrontendWorkflowCommand, FrontendWorkflowStage } from '@nexora/shared';

export const C15_FRONTEND_WORKFLOW_COMPLETION_POLICY = 'C15_FRONTEND_WORKFLOW_COMPLETION_POLICY' as const;

const backendOnlyPatterns = [
  '/backend/',
  '/database/',
  '@nexora/database',
  '../backend',
  '../database',
  'prisma',
  'minio',
  'bullmq',
  'ioredis',
] as const;

const criticalCommandFragments = [
  '/approve',
  '/reject',
  '/submit',
  '/post',
  '/receive',
  '/dispatch',
  '/complete',
  '/match',
  '/cancel',
  '/retire',
  '/install',
] as const;

const idempotencyCriticalFragments = [
  '/goods-receipts',
  '/payments',
  '/imports/',
  '/reports/exports',
  '/approve',
  '/submit',
  '/post',
  '/receive',
  '/dispatch',
  '/complete',
  '/match',
] as const;

export interface FrontendImportInspection {
  readonly sourceFile: string;
  readonly importPath: string;
}

export interface WorkflowActionGate {
  readonly command: FrontendWorkflowCommand;
  readonly currentStatus?: string | null;
  readonly permissions: readonly string[];
  readonly tenantResolved: boolean;
  readonly resourceScopeResolved: boolean;
  readonly confirmationAccepted?: boolean;
  readonly idempotencyKey?: string | null;
}

export interface MutationInvalidationPlan {
  readonly command: FrontendWorkflowCommand;
  readonly invalidatedQueryKeys: readonly string[];
}

function fail(code: string, message: string): never {
  throw new Error(`${code}: ${message}`);
}

export function assertFrontendUsesPublicApiOnly(input: FrontendImportInspection): void {
  const normalized = input.importPath.replaceAll('\\\\', '/').toLowerCase();
  for (const pattern of backendOnlyPatterns) {
    if (normalized.includes(pattern.toLowerCase())) {
      fail('C15-FRONTEND-CALLS-API-ONLY-NO-BACKEND-DATABASE-IMPORTS', `${input.sourceFile} imports server-only dependency ${input.importPath}.`);
    }
  }
}

export function assertWorkflowCommandEndpoint(command: Pick<FrontendWorkflowCommand, 'method' | 'endpointTemplate'>): void {
  if (!command.endpointTemplate.startsWith('/')) {
    fail('C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS', 'Frontend command endpoints must be relative public API paths.');
  }
  if (command.method === 'GET') {
    fail('C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS', 'Workflow mutations must use explicit command endpoints, not GET.');
  }
  const hasCommandVerb = criticalCommandFragments.some((fragment) => command.endpointTemplate.includes(fragment));
  const isCreateEndpoint = command.method === 'POST' && !command.endpointTemplate.includes('{') && !command.endpointTemplate.endsWith('/search');
  if (!hasCommandVerb && !isCreateEndpoint) {
    fail('C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS', `${command.endpointTemplate} does not expose an explicit workflow command.`);
  }
}

export function assertIdempotencyHeader(plan: Pick<WorkflowActionGate, 'command' | 'idempotencyKey'>): void {
  const critical = plan.command.requiresIdempotencyKey || idempotencyCriticalFragments.some((fragment) => plan.command.endpointTemplate.includes(fragment));
  if (critical && !plan.idempotencyKey) {
    fail('C15-IDEMPOTENCY-KEYS-FOR-GRN-PAYMENT-IMPORT-EXPORT-RETRY-SENSITIVE-COMMANDS', `${plan.command.id} requires an Idempotency-Key.`);
  }
}

export function assertStatusPermissionGate(plan: WorkflowActionGate): void {
  if (!plan.tenantResolved || !plan.resourceScopeResolved) {
    fail('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE', `${plan.command.id} cannot run without tenant and resource scope.`);
  }
  if (!plan.permissions.includes(plan.command.requiredPermission)) {
    fail('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE', `${plan.command.id} is missing permission ${plan.command.requiredPermission}.`);
  }
  if (plan.command.requiredStatus.length > 0 && !plan.command.requiredStatus.includes('ANY')) {
    if (!plan.currentStatus || !plan.command.requiredStatus.includes(plan.currentStatus)) {
      fail('C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE', `${plan.command.id} cannot run from status ${plan.currentStatus ?? 'UNKNOWN'}.`);
    }
  }
}

export function assertDestructiveConfirmation(plan: Pick<WorkflowActionGate, 'command' | 'confirmationAccepted'>): void {
  if (plan.command.destructiveOrHighRisk && !plan.confirmationAccepted) {
    fail('C15-DESTRUCTIVE-HIGH-RISK-ACTIONS-REQUIRE-EXPLICIT-CONFIRMATION', `${plan.command.id} requires explicit confirmation.`);
  }
}

export function assertTanStackInvalidation(plan: MutationInvalidationPlan): void {
  for (const expected of plan.command.invalidates) {
    if (!plan.invalidatedQueryKeys.includes(expected)) {
      fail('C15-TANSTACK-QUERY-CACHING-INVALIDATION-AFTER-MUTATIONS', `${plan.command.id} did not invalidate ${expected}.`);
    }
  }
}

export function assertSharedContractUsage(input: { command: FrontendWorkflowCommand; payloadShapeKnown: boolean }): void {
  if (!input.payloadShapeKnown) {
    fail('C15-FORMS-USE-SHARED-ZOD-CONTRACTS-OR-MANIFESTED-PAYLOAD-SHAPES', `${input.command.id} has no shared or manifested payload shape.`);
  }
}

export function assertStorageUploadIntentForDocuments(command: FrontendWorkflowCommand): void {
  const label = `${command.id} ${command.endpointTemplate} ${command.label}`.toLowerCase();
  const handlesEvidence = label.includes('document') || label.includes('photo') || label.includes('signature');
  if (handlesEvidence && !command.endpointTemplate.includes('/documents/upload-intent') && !command.endpointTemplate.includes('/documents/complete-upload')) {
    fail('C15-DOCUMENTS-PHOTOS-SIGNATURES-USE-STORAGE-UPLOAD-INTENT', `${command.id} attempts evidence handling without upload-intent/complete-upload.`);
  }
}

export function assertNoAsyncCriticalMutationBypass(command: FrontendWorkflowCommand): void {
  const forbiddenAsyncShortcut = command.endpointTemplate.includes('/queues/') || command.endpointTemplate.includes('/jobs/') || command.endpointTemplate.includes('/worker/');
  if (forbiddenAsyncShortcut) {
    fail('C15-CRITICAL-STOCK-MONEY-APPROVAL-MUTATIONS-ARE-API-COMMANDS-NOT-FRONTEND-SHORTCUTS', `${command.id} attempts to drive critical mutation through async shortcut.`);
  }
}

export function assertPortalPwaOfflineSurface(stage: FrontendWorkflowStage, surfaces: readonly string[]): void {
  if (stage !== 'DOCUMENTS_REPORTS_PORTALS') return;
  for (const required of ['Customer Portal', 'Vendor Portal', 'Technician PWA', 'Offline Queue']) {
    if (!surfaces.includes(required)) {
      fail('C15-PORTAL-PWA-OFFLINE-SYNC-SURFACE-PRESENT', `Missing portal/PWA surface ${required}.`);
    }
  }
}

export function assertEndToEndLifecycleCoverage(stages: readonly FrontendWorkflowStage[]): void {
  const required: readonly FrontendWorkflowStage[] = [
    'CRM_AND_PROJECT_START',
    'PROJECT_BOM_AND_MATERIAL_REQUIREMENT',
    'PROCUREMENT_RFQ_PO_GRN',
    'INVENTORY_STOCK_SERIAL_BATCH',
    'ASSET_INSTALLATION_QR_WARRANTY',
    'FIELD_SERVICE_AND_MAINTENANCE',
    'FINANCE_MATCH_POST_PAY',
    'DOCUMENTS_REPORTS_PORTALS',
  ];
  for (const stage of required) {
    if (!stages.includes(stage)) {
      fail('C15-END-TO-END-LIFECYCLE-UI-COVERS-CUSTOMER-PROJECT-PROCUREMENT-STOCK-ASSET-FINANCE', `Missing workflow UI stage ${stage}.`);
    }
  }
}

import {
  M19HighRiskCommandRegistry,
  M19RuntimeAbuseScenarios,
  M19SecurityCompletionRows,
  type M19HighRiskCommand,
} from '@nexora/shared';

export const M19_SECURITY_ABUSE_MAKER_CHECKER_COMPLETION_POLICY =
  'M19_SECURITY_ABUSE_MAKER_CHECKER_COMPLETION_POLICY' as const;

export interface M19DecisionContext {
  readonly actorUserId: string;
  readonly makerUserId: string | null;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly commandCategory: M19HighRiskCommand['category'];
  readonly actorPermissions: readonly string[];
  readonly tenantScoped: boolean;
  readonly branchScoped: boolean;
  readonly resourceScoped: boolean;
  readonly idempotencyKeyPresent: boolean;
  readonly auditWillBeWritten: boolean;
  readonly postgresTransactionActive: boolean;
}

export interface M19AbuseCaseResult {
  readonly caseId: string;
  readonly attemptedAction: string;
  readonly crossTenant: boolean;
  readonly crossBranch: boolean;
  readonly missingPermission: boolean;
  readonly resourceScopeViolation: boolean;
  readonly denied: boolean;
  readonly auditRecorded: boolean;
}

export interface M19SecurityReleaseEvidence {
  readonly architectureGatePassed: boolean;
  readonly contractGatePassed: boolean;
  readonly c16SecurityGatePassed: boolean;
  readonly m18FrontendGatePassed: boolean;
  readonly abuseSuitePassed: boolean;
  readonly makerCheckerSuitePassed: boolean;
  readonly idempotencySuitePassed: boolean;
  readonly auditRedactionSuitePassed: boolean;
  readonly backupRestoreEvidencePassed: boolean;
  readonly runtimeCertificationPassed: boolean;
  readonly unresolvedCriticalFindings: number;
}

const registryByCategory = new Map(M19HighRiskCommandRegistry.map((entry) => [entry.category, entry]));

function fail(code: string, message: string): never {
  throw new Error(`${code}: ${message}`);
}

export function assertM19HighRiskCommandRegistry(commands: readonly M19HighRiskCommand[] = M19HighRiskCommandRegistry): void {
  if (commands.length < 12) fail('M19-HIGH-RISK-COMMAND-REGISTRY', 'High-risk command registry is incomplete.');

  const categories = new Set<string>();
  for (const command of commands) {
    if (categories.has(command.category)) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `Duplicate category ${command.category}.`);
    categories.add(command.category);
    if (!command.routePattern.startsWith('/api/v1/')) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `${command.category} must map to an API v1 route.`);
    if (!command.requiredPermission.includes('.')) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `${command.category} requires a concrete permission key.`);
    if (!command.requiresAuditLog || !command.requiresPostgresTransaction) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `${command.category} must require audit and PostgreSQL transaction proof.`);
    if (command.requiresMakerChecker && !command.requiresIdempotencyKey) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `${command.category} maker-checker command must also be idempotent.`);
  }
}

export function assertM19CommandSecurityEnvelope(input: M19DecisionContext): void {
  const command = registryByCategory.get(input.commandCategory);
  if (!command) fail('M19-HIGH-RISK-COMMAND-REGISTRY', `Unregistered high-risk command category ${input.commandCategory}.`);

  if (!input.actorPermissions.includes(command.requiredPermission)) {
    fail('M19-PRIVILEGE-ESCALATION-DENIAL-MATRIX', `${input.commandCategory} requires ${command.requiredPermission}.`);
  }
  if (!input.tenantScoped || !input.branchScoped || !input.resourceScoped) {
    fail('M19-ABUSE-CASE-IDOR-TENANT-BRANCH-RESOURCE-SCOPE', `${input.commandCategory} must enforce tenant, branch and resource scope.`);
  }
  if (command.requiresMakerChecker && input.makerUserId && input.actorUserId === input.makerUserId) {
    fail('M19-MAKER-CHECKER-ENFORCED', `${input.commandCategory} maker cannot approve/post their own high-risk action.`);
  }
  if (command.requiresIdempotencyKey && !input.idempotencyKeyPresent) {
    fail('M19-IDEMPOTENCY-PAYLOAD-HASH-REPLAY-PROTECTION', `${input.commandCategory} requires Idempotency-Key.`);
  }
  if (!input.auditWillBeWritten) {
    fail('M19-AUDIT-SECRET-PII-REDACTION', `${input.commandCategory} requires safe audit evidence.`);
  }
  if (!input.postgresTransactionActive) {
    fail('M19-PRODUCTION-RELEASE-BLOCKER-SECURITY-EVIDENCE', `${input.commandCategory} requires PostgreSQL transaction boundary proof.`);
  }
}

export function assertM19AbuseCaseDenied(input: M19AbuseCaseResult): void {
  const isAbuse = input.crossTenant || input.crossBranch || input.missingPermission || input.resourceScopeViolation;
  if (isAbuse && (!input.denied || !input.auditRecorded)) {
    fail('M19-ABUSE-CASE-IDOR-TENANT-BRANCH-RESOURCE-SCOPE', `${input.caseId} ${input.attemptedAction} must be denied and audited.`);
  }
}

export function assertM19NoSecurityBypassBoundary(input: {
  readonly frontendHasServerSideImports: boolean;
  readonly workerMutatesCriticalState: boolean;
  readonly routeTrustsOrganizationIdFromBody: boolean;
  readonly qrTokenGrantsAccessWithoutAuthorization: boolean;
}): void {
  if (input.frontendHasServerSideImports || input.workerMutatesCriticalState || input.routeTrustsOrganizationIdFromBody || input.qrTokenGrantsAccessWithoutAuthorization) {
    fail('M19-NO-SECURITY-BYPASS-IN-FRONTEND-OR-WORKER', 'Security bypass boundary violated.');
  }
}

export function assertM19SecurityReleaseEvidence(input: M19SecurityReleaseEvidence): void {
  const gates = [
    input.architectureGatePassed,
    input.contractGatePassed,
    input.c16SecurityGatePassed,
    input.m18FrontendGatePassed,
    input.abuseSuitePassed,
    input.makerCheckerSuitePassed,
    input.idempotencySuitePassed,
    input.auditRedactionSuitePassed,
    input.backupRestoreEvidencePassed,
    input.runtimeCertificationPassed,
  ];
  if (gates.some((passed) => !passed) || input.unresolvedCriticalFindings > 0) {
    fail('M19-PRODUCTION-RELEASE-BLOCKER-SECURITY-EVIDENCE', 'Production remains blocked until all security and runtime evidence passes.');
  }
}

export function m19SecurityCompletionChecklist() {
  return {
    policy: M19_SECURITY_ABUSE_MAKER_CHECKER_COMPLETION_POLICY,
    highRiskCommandCount: M19HighRiskCommandRegistry.length,
    controlCount: M19SecurityCompletionRows.length,
    runtimeAbuseScenarioCount: M19RuntimeAbuseScenarios.length,
    controls: M19SecurityCompletionRows.map((row) => row.controlId),
    productionBlockedUntilRuntimeCertified: true,
  } as const;
}

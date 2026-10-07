import type { FrontendWorkflowCommand } from '@nexora/shared';

export const M18_FRONTEND_RUNTIME_COMPLETION_POLICY = 'M18_FRONTEND_RUNTIME_COMPLETION_POLICY' as const;

export type FrontendCommandGateState = {
  readonly permissions: readonly string[];
  readonly endpointResolved: boolean;
  readonly confirmed: boolean;
  readonly idempotencyKey: string;
  readonly statusEvidence?: string | null;
};

export type FrontendCommandGateDecision = {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
};

const criticalShortcutMarkers = [
  '@nexora/' + 'database',
  '@prisma/' + 'client',
  'database/' + 'prisma',
  "from '" + 'minio' + "'",
  'from "' + 'minio' + '"',
  "from '" + 'bullmq' + "'",
  'from "' + 'bullmq' + '"',
  "from '" + 'ioredis' + "'",
  'from "' + 'ioredis' + '"',
] as const;

export function hasM18Permission(permissions: readonly string[], requiredPermission: string): boolean {
  return permissions.includes(requiredPermission) || permissions.includes('organization.manage');
}

export function resolveM18CommandGate(command: FrontendWorkflowCommand, state: FrontendCommandGateState): FrontendCommandGateDecision {
  const reasons: string[] = [];
  if (!hasM18Permission(state.permissions, command.requiredPermission)) {
    reasons.push(`M18-WORKFLOW-COMMAND-PERMISSION-GATE: missing ${command.requiredPermission}`);
  }
  if (!state.endpointResolved) {
    reasons.push('M18-WORKFLOW-COMMAND-STATUS-EVIDENCE-GATE: required workflow IDs are incomplete.');
  }
  if (command.requiresIdempotencyKey && !state.idempotencyKey.trim()) {
    reasons.push('M18-WORKFLOW-COMMAND-IDEMPOTENCY-GATE: Idempotency-Key is required.');
  }
  if (command.destructiveOrHighRisk && !state.confirmed) {
    reasons.push('M18-WORKFLOW-COMMAND-HIGH-RISK-CONFIRMATION: explicit confirmation is required.');
  }
  if (state.statusEvidence && command.requiredStatus.length > 0 && !command.requiredStatus.includes(state.statusEvidence)) {
    reasons.push(`M18-WORKFLOW-COMMAND-STATUS-EVIDENCE-GATE: current status ${state.statusEvidence} is not one of ${command.requiredStatus.join(', ')}.`);
  }
  return { allowed: reasons.length === 0, reasons };
}

export function assertM18CommandExecutionGuard(command: FrontendWorkflowCommand, state: FrontendCommandGateState): void {
  const decision = resolveM18CommandGate(command, state);
  if (!decision.allowed) throw new Error(decision.reasons.join('\n'));
}

export function buildM18CommandHeaders(command: FrontendWorkflowCommand, idempotencyKey: string): Record<string, string> {
  if (!command.requiresIdempotencyKey) return {};
  return { 'Idempotency-Key': idempotencyKey.trim() };
}

export function assertM18NoFrontendCriticalShortcuts(sourceText: string): void {
  const hit = criticalShortcutMarkers.find((marker) => sourceText.includes(marker));
  if (hit) throw new Error(`M18-NO-FRONTEND-CRITICAL-STATE-BYPASS: forbidden frontend shortcut marker ${hit}`);
}

export function describeM18FrontendDeniedState(reason: string): string {
  return `Denied by frontend usability gate. Backend authorization remains authoritative. ${reason}`;
}

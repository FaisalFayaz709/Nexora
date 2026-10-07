import {
  R18CriticalWorkflowMatrix,
  R18TestCompletionManifest,
  R18TestLayerMatrix,
  type R18CriticalWorkflowRequirement,
  type R18TestLayerRequirement,
} from '@nexora/shared';

export const R18_TEST_COMPLETION_POLICY = {
  pass: 'R18',
  policyId: 'R18-TEST-COMPLETION-BLOCKS-PRODUCTION-UNTIL-RUNTIME-EVIDENCE',
  lockedArchitecture: 'Next.js frontend -> Fastify /api/v1 backend -> PostgreSQL/Prisma + MinIO + Redis/BullMQ',
  sourceGateStatus: 'runtime-ready-source-gate-only',
  runtimeCertificationRequired: true,
  requiredEvidenceDirectory: R18TestCompletionManifest.requiredRuntimeEvidenceDirectory,
  testLayers: R18TestLayerMatrix,
  criticalWorkflows: R18CriticalWorkflowMatrix,
} as const;

export function assertR18NoMissingTestLayers(layers: readonly R18TestLayerRequirement[] = R18TestLayerMatrix) {
  const required = new Set(R18TestLayerMatrix.map((layer) => layer.layerId));
  for (const layer of layers) required.delete(layer.layerId);
  if (required.size > 0) throw new Error(`R18 missing test layers: ${Array.from(required).join(', ')}`);
}

export function assertR18CriticalWorkflowCoverage(workflows: readonly R18CriticalWorkflowRequirement[] = R18CriticalWorkflowMatrix) {
  const required = new Set(R18CriticalWorkflowMatrix.map((workflow) => workflow.workflowId));
  for (const workflow of workflows) {
    required.delete(workflow.workflowId);
    if (workflow.blocksProduction !== true) throw new Error(`${workflow.workflowId} must block production until runtime proof exists.`);
    if (workflow.mustProve.length < 2) throw new Error(`${workflow.workflowId} has too few proof obligations.`);
    if (workflow.requiredRuntimeEvidence.length === 0) throw new Error(`${workflow.workflowId} has no runtime evidence requirement.`);
  }
  if (required.size > 0) throw new Error(`R18 missing critical workflows: ${Array.from(required).join(', ')}`);
}

export function assertR18SourceGateCannotClaimProductionReady(evidence: { runtimeExecuted: boolean; failed: number; skippedCritical: number }) {
  if (!evidence.runtimeExecuted) {
    throw new Error('R18 source gate cannot claim production readiness without runtime execution evidence.');
  }
  if (evidence.failed > 0 || evidence.skippedCritical > 0) {
    throw new Error('R18 runtime evidence contains failed or skipped critical workflow tests.');
  }
}

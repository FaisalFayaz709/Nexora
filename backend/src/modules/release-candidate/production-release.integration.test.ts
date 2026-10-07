/*
C18 runtime release-candidate markers:
C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE
C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED
C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX
C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE
C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE
C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE
C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE
C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION
*/
import { ProductionReleaseManifest } from '@nexora/shared';
import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C18 Production deployment and release-candidate runtime acceptance',
  requirements: ProductionReleaseManifest.gates.map((gate) => ({
    scenarioId: gate.gateId,
    name: gate.gateId,
    evidence: `${gate.title}. Required evidence: ${gate.requiredEvidence.join(', ')}. Blocking conditions: ${gate.blockingConditions.join(', ')}.`,
  })),
  requiredEnv: ['DATABASE_URL', 'REDIS_URL', 'NEXORA_API_BASE_URL'],
});

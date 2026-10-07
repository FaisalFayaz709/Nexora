export const PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT = {
  pass: 'PASS_23',
  gate: 'PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION',
  result: 'SOURCE_LOCKED_RUNTIME_PENDING',
  requiredRuntimeTopology: ['postgres', 'redis', 'minio', 'minio-init', 'migrator', 'api', 'worker', 'web', 'nginx'],
  evidenceDirectory: 'certification-output/pass-23-runtime-deployment',
  lockedApiBoundary: 'Fastify /api/v1 remains the ERP business API; Next.js does not own ERP domain logic.',
  sourceOnlyWarning: 'Source-level PASS 23 does not equal Docker/runtime GO.',
} as const;

export type Pass23RuntimeDeploymentCertificationContract = typeof PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT;

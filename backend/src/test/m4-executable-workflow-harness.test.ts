import { executableWorkflowSuite, type ExecutableWorkflowScenario } from './executable-workflow-scenario.js';

const M4HarnessSmokeScenario: ExecutableWorkflowScenario = {
  scenarioId: 'M4-EXECUTABLE-HARNESS-HEALTH-READINESS',
  title: 'M4 executable runtime harness proves live API readiness can be checked',
  lockedBlueprintRequirement:
    'Runtime certification must execute real API checks instead of accepting narrative requirement declarations as completion evidence.',
  preconditions: [
    'Docker/runtime stack is running through the locked Next.js/Fastify/PostgreSQL/Redis/MinIO/Nginx topology.',
    'NEXORA_API_BASE_URL points at the Fastify API gateway path.',
    'DATABASE_URL points at the disposable certification database.',
  ],
  steps: [
    {
      id: 'M4-API-LIVENESS',
      method: 'GET',
      path: '/api/v1/health/live',
      allowedStatuses: [200],
    },
    {
      id: 'M4-API-READINESS',
      method: 'GET',
      path: '/api/v1/health/ready',
      allowedStatuses: [200],
    },
  ],
  databaseAssertions: [
    {
      id: 'M4-DB-CONNECTIVITY-EVIDENCE',
      description: 'The readiness endpoint must depend on the configured PostgreSQL/Prisma runtime rather than a static mock.',
      querySubject: 'PrismaRuntime',
    },
  ],
  securityAssertions: [
    'The health endpoints must not expose secrets, tokens, passwords, MinIO credentials or connection strings.',
  ],
  auditAssertions: [
    'The request logger records route/status/duration/requestId while redacting sensitive credentials.',
  ],
};

executableWorkflowSuite('M4 executable workflow harness smoke', [M4HarnessSmokeScenario]);

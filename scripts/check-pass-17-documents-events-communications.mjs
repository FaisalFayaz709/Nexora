#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const limitations = [];
function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function json(path) { return JSON.parse(read(path)); }
function check(name, passed, message = '', options = {}) {
  const entry = { name, passed, message, blocker: Boolean(options.blocker) };
  checks.push(entry);
  if (!passed) {
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(line); else failures.push(line);
  }
}
function includesAll(name, content, required, message = '') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message || 'Missing invariant(s)'}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, message = '') {
  const found = forbidden.filter((needle) => content.includes(needle));
  check(name, found.length === 0, found.length ? `${message || 'Forbidden invariant(s) found'}: ${found.join(', ')}` : '');
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 1800)}`);
}
function previousEvidence(path) {
  if (!hasFile(path)) {
    if (sourceOnly) return;
    check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    return;
  }
  const raw = read(path);
  let status = raw;
  try { const parsed = JSON.parse(raw); status = parsed.status ?? parsed.result ?? raw; } catch {}
  const failed = String(status).includes('FAIL');
  check(`previous pass evidence is not failed: ${path}`, !failed, failed ? `${path} has failing status ${status}.` : `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}
function routeInLock(lock, method, path) {
  return lock.implementedLockedRoutes.some((route) => route.method === method && route.path === path);
}
function filesUnder(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...filesUnder(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}

previousEvidence('certification-output/pass-16-approval-workflow-engine.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes after Pass 17 endpoint additions', ['scripts/check-contracts.mjs']);
runGate('Pass 16 source gate still passes', ['scripts/check-pass-16-approval-workflow-engine.mjs', '--source-only']);

for (const required of [
  'backend/src/core/storage/storage-service.ts',
  'backend/src/core/events/business-event-writer.ts',
  'backend/src/core/events/business-event-dispatcher.ts',
  'backend/src/core/queues/queue-producer.ts',
  'backend/src/modules/documents/document.routes.ts',
  'backend/src/modules/documents/document.controller.ts',
  'backend/src/modules/documents/document.service.ts',
  'backend/src/modules/documents/document.repository.ts',
  'backend/src/modules/notifications/notification.routes.ts',
  'backend/src/modules/notifications/notification.service.ts',
  'backend/src/modules/communications/communication.routes.ts',
  'backend/src/modules/communications/communication.service.ts',
  'backend/src/modules/integrations/index.ts',
  'backend/src/modules/integrations/integration.module.ts',
  'backend/src/modules/integrations/integration-webhook.routes.ts',
  'backend/src/modules/integrations/integration-webhook.controller.ts',
  'backend/src/modules/integrations/integration-webhook.service.ts',
  'backend/src/modules/integrations/integration-webhook.repository.ts',
  'backend/src/modules/integrations/integration-webhook-policy.ts',
  'backend/src/modules/integrations/integration-webhook-completion-policy.test.ts',
  'backend/src/modules/documents-notifications/document-notification-completion-policy.ts',
  'shared/src/contracts/documents-notifications/document-delivery-completion.contracts.ts',
  'shared/src/contracts/integrations/integration-webhook.contracts.ts',
  'shared/src/contracts/integrations/index.ts',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/contract-maturity.json',
  'shared/src/constants/domain-events.ts',
  'shared/src/permissions/permission-catalog.ts',
  'database/prisma/schema.prisma',
  'database/prisma/migrations/20260912170000_pass17_documents_events_communications/migration.sql',
  'database/prisma/seed/permissions.seed.json',
  'database/prisma/seed/baseline.seed.json',
  'docs/contracts/capability-locks/documents-events-communications.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/api-endpoint-matrix.md',
  'docs/contracts/contract-lock.json',
  'frontend/src/modules/documents-notifications/document-delivery-completion-workbench.tsx',
  'frontend/src/modules/integrations/api.ts',
  'frontend/src/modules/integrations/integration-webhooks-page.tsx',
  'frontend/src/app/(erp)/integrations/webhooks/page.tsx',
  'frontend/src/lib/route-map.ts',
  'frontend/src/modules/navigation/navigation-registry.ts',
  'worker/src/processors/document-notification-delivery-policy.ts',
  'worker/src/processors/ports.ts',
]) check(`PASS 17 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const capability = json('docs/contracts/capability-locks/documents-events-communications.json');
check('Pass 17 capability lock declares source-level pending runtime status', capability.status === 'PASS_17_SOURCE_LEVEL_RUNTIME_PENDING', `Unexpected status ${capability.status}.`);
check('Pass 17 capability lock has 22 document/notification/communication/integration routes', capability.routeCount === 22, `Expected 22 routes, found ${capability.routeCount}.`);
for (const [method, path] of [
  ['POST', '/api/v1/documents/upload-intent'],
  ['POST', '/api/v1/documents/complete-upload'],
  ['POST', '/api/v1/documents/:id/versions'],
  ['GET', '/api/v1/documents/:id/download-url'],
  ['GET', '/api/v1/notifications'],
  ['POST', '/api/v1/communications/send'],
  ['GET', '/api/v1/integration-webhooks'],
  ['POST', '/api/v1/integration-webhooks'],
  ['GET', '/api/v1/integration-webhook-deliveries'],
  ['POST', '/api/v1/integration-webhooks/:id/test-delivery'],
]) check(`Pass 17 capability lock includes ${method} ${path}`, routeInLock(capability, method, path), `${method} ${path} missing.`);

const lockedEndpoints = json('shared/src/contracts/registry/locked-endpoints.json');
for (const [method, endpoint] of [
  ['GET', '/api/v1/integration-webhooks'],
  ['GET', '/api/v1/integration-webhooks/:id'],
  ['POST', '/api/v1/integration-webhooks'],
  ['PATCH', '/api/v1/integration-webhooks/:id'],
  ['POST', '/api/v1/integration-webhooks/:id/activate'],
  ['POST', '/api/v1/integration-webhooks/:id/deactivate'],
  ['GET', '/api/v1/integration-webhook-deliveries'],
  ['POST', '/api/v1/integration-webhooks/:id/test-delivery'],
]) check(`Locked endpoint registry includes ${method} ${endpoint}`, lockedEndpoints.some((route) => route.method === method && route.endpoint === endpoint), `${method} ${endpoint} missing.`);
check('Locked endpoint registry count has not regressed below Pass 17 baseline', lockedEndpoints.length >= 300, `Expected at least 300, found ${lockedEndpoints.length}.`);

const documentService = read('backend/src/modules/documents/document.service.ts');
includesAll('Document service uses StorageService, transactions, audit and business events', documentService, [
  'StorageService', 'uploadIntent', 'verifyCompletedUpload', 'downloadUrl', 'withTransaction', 'AuditWriter', 'BusinessEventWriter', 'DOCUMENT_UPLOAD_INTENT_CREATED', 'DOCUMENT_COMPLETED_UPLOAD', 'DOCUMENT_VERSION_ADDED', 'DOCUMENT_DELETED', 'document.upload.completed', 'document.version.added',
], 'Document service invariant missing');
excludesAll('Document service does not import MinIO SDK directly', documentService, [' from \'minio\'', ' from "minio"'], 'Business modules must use StorageService only');

const storage = read('backend/src/core/storage/storage-service.ts');
includesAll('StorageService enforces private tenant object keys and short-lived URLs', storage, [
  'presignedPutObject', 'presignedGetObject', 'validateUploadInput', 'assertTenantObjectKey', 'organizations/${input.organizationId}/documents/', 'DOCUMENT_OBJECT_TENANT_MISMATCH', 'DOCUMENT_MIME_TYPE_BLOCKED', 'DOCUMENT_FILE_TYPE_BLOCKED',
], 'StorageService invariant missing');

for (const file of filesUnder(join(root, 'backend/src/modules'))) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  if (text.includes(" from 'minio'") || text.includes(' from "minio"')) {
    check(`No business module imports MinIO directly: ${rel}`, false, 'Only backend/src/core/storage may import MinIO SDK.');
  }
}

const communicationService = read('backend/src/modules/communications/communication.service.ts');
includesAll('Communication service preserves traceability and delivery outbox idempotency', communicationService, [
  'assertCommunicationTraceability', 'assertCommunicationAttachmentTenantScope', 'assertEmailOutboxDispatch', 'assertEmailOutboxIdempotency', 'createLog', 'createEmailOutbox', 'createEmailDelivery', 'createSmsDelivery', 'COMMUNICATION_SEND_REQUESTED', 'communication.send.requested', 'withTransaction',
], 'Communication service invariant missing');
excludesAll('Communication service does not expose object keys or presigned URL attachments', communicationService, ['objectKey:', 'downloadUrl:', 'presigned'], 'Communication attachments must reference tenant-scoped document ids only');

const notificationService = read('backend/src/modules/notifications/notification.service.ts');
includesAll('Notification service fans out with tenant and user-scoped read state', notificationService, [
  'assertNotificationFanout', 'recipientUserIds', 'organizationId:t.organizationId', 'markRead', 'markAllRead',
], 'Notification service invariant missing');

const integrationRoutes = read('backend/src/modules/integrations/integration-webhook.routes.ts');
includesAll('Integration webhook routes are Fastify locked routes with tenant module and permission guards', integrationRoutes, [
  "defineLockedRoute('GET', '/api/v1/integration-webhooks')", "defineLockedRoute('POST', '/api/v1/integration-webhooks')", "defineLockedRoute('GET', '/api/v1/integration-webhook-deliveries')", "defineLockedRoute('POST', '/api/v1/integration-webhooks/:id/test-delivery')", "access.assertModuleEnabled(request.tenant!.organizationId, 'integrations')", "guard('integration.webhook.view')", "guard('integration.webhook.manage')",
], 'Integration route invariant missing');
excludesAll('Integration routes do not access persistence directly', integrationRoutes, ['@nexora/database', 'prisma.'], 'Routes must not access Prisma directly');

const integrationService = read('backend/src/modules/integrations/integration-webhook.service.ts');
includesAll('Integration webhook service is tenant-scoped, audited, event-bound and transactional', integrationService, [
  'assertModuleEnabled(organizationId, \'integrations\')', 'getConnection(tenant.organizationId', 'hashWebhookTargetUrl', 'assertWebhookEndpointConfiguration', 'assertWebhookDeliveryPayloadSafe', 'withTransaction', 'INTEGRATION_WEBHOOK_CREATED', 'INTEGRATION_WEBHOOK_UPDATED', 'INTEGRATION_WEBHOOK_TEST_DELIVERY_QUEUED', 'integration.webhook.configured', 'webhook.delivery.requested', 'idempotencyKey',
], 'Integration service invariant missing');
excludesAll('Integration service does not own BullMQ delivery or critical async state mutation', integrationService, ['new Queue', 'Queue<', 'from \'bullmq\'', 'stockBalance:', 'paymentPosting:', 'approvalState:'], 'Webhook service must only prepare delivery evidence and events.');

const eventDispatcher = read('backend/src/core/events/business-event-dispatcher.ts');
includesAll('BusinessEventDispatcher creates event-bound webhook delivery jobs after commit only', eventDispatcher, [
  'BusinessEventDispatcher', 'dispatchAfterCommit', 'assertAfterCommitEventPayloadSafe', 'integrationWebhook.findMany', 'integrationWebhookDelivery.create', 'enqueueWebhook', 'businessEvent.updateMany', 'publishedAt', 'idempotencyKey',
], 'Business event dispatcher invariant missing');

const workerPolicy = read('worker/src/processors/document-notification-delivery-policy.ts');
includesAll('Worker delivery policy validates tenant idempotency and forbids critical async mutation payloads', workerPolicy, [
  'assertM15AfterCommitDeliveryPayload', 'assertC12TenantJobIdempotency', 'processC12EmailOutbox', 'processC12NotificationCreate', 'processC12DocumentScan', 'processPass17WebhookDelivery', 'stockBalance', 'journalEntry', 'paymentPosting', 'approvalState', 'invoiceBalance',
], 'Worker delivery policy invariant missing');

const schema = read('database/prisma/schema.prisma');
includesAll('Prisma schema has Pass 17 idempotency and event delivery structures', schema, [
  'model Document', 'model DocumentVersion', 'model DocumentLink', 'model DocumentAccessLog', 'model Notification', 'model CommunicationLog', 'model EmailOutbox', 'model BusinessEvent', 'model IntegrationWebhook', 'model IntegrationWebhookDelivery', 'idempotencyKey String?', '@@unique([organizationId, idempotencyKey])', '@@unique([organizationId, webhookId, idempotencyKey])', '@@index([organizationId, type, publishedAt])',
], 'Prisma schema invariant missing');
excludesAll('Prisma schema does not introduce Float', schema, [' Float'], 'Money/quantities must not use Float');

const migration = read('database/prisma/migrations/20260912170000_pass17_documents_events_communications/migration.sql');
includesAll('Pass 17 migration adds only delivery/idempotency indexes and constraints', migration, [
  'EmailOutbox_organizationId_idempotencyKey_key', 'IntegrationWebhookDelivery', 'idempotencyKey', 'IntegrationWebhookDelivery_org_webhook_idempotency_key', 'IntegrationWebhookDelivery_org_event_status_idx', 'BusinessEvent_org_type_published_idx',
], 'Pass 17 migration invariant missing');
excludesAll('Pass 17 migration is non-destructive', migration.toUpperCase(), ['DROP TABLE', 'DROP COLUMN', 'TRUNCATE'], 'Pass 17 migration must be additive.');

const sharedIntegrations = read('shared/src/contracts/integrations/integration-webhook.contracts.ts');
includesAll('Shared integration contracts expose Pass 17 schemas and manifest', sharedIntegrations, [
  'PASS_17_SOURCE_LEVEL_DOCUMENTS_MINIO_EVENTS_COMMUNICATIONS_COMPLETION', 'CreateIntegrationWebhookSchema', 'UpdateIntegrationWebhookSchema', 'TestIntegrationWebhookDeliverySchema', 'IntegrationWebhookListQuerySchema', 'IntegrationWebhookDeliveryListQuerySchema', 'Pass17DocumentEventsCommunicationsManifest',
], 'Shared integration contract invariant missing');

const permissions = read('shared/src/permissions/permission-catalog.ts');
includesAll('Permission catalog contains integration webhook permissions', permissions, ['integration.webhook.view', 'integration.webhook.manage'], 'Integration permissions missing');
check('Permission seed contains integration webhook permissions', read('database/prisma/seed/permissions.seed.json').includes('integration.webhook.view') && read('database/prisma/seed/permissions.seed.json').includes('integration.webhook.manage'), 'Permission seed missing integration webhook permissions.');

const app = read('backend/src/app.ts');
includesAll('App registers integration module with locked /api/v1 API surface', app, ["createIntegrationModule", "const integrations = createIntegrationModule(identity.facade, platformConfiguration.access)", "app.register(integrations.plugin"], 'Integration module registration missing');

const frontendPage = read('frontend/src/modules/integrations/integration-webhooks-page.tsx');
includesAll('Frontend integration page uses centralized API helpers and route-group shell route', frontendPage, [
  'useQuery', 'useMutation', 'listIntegrationWebhooks', 'createIntegrationWebhook', 'setIntegrationWebhookActive', 'testIntegrationWebhookDelivery', 'Queue test delivery',
], 'Frontend integration page invariant missing');
const routeMap = read('frontend/src/lib/route-map.ts');
includesAll('Frontend route map and navigation expose integration webhook page with permission gate', routeMap + read('frontend/src/modules/navigation/navigation-registry.ts'), [
  '/integrations/webhooks', 'integration.webhook.view', 'integration-webhooks', 'integration-webhook-deliveries', 'Integration Webhooks',
], 'Frontend route/nav invariant missing');

const maturity = json('shared/src/contracts/registry/contract-maturity.json');
const pass17Mature = maturity.filter((route) => String(route.maturity).includes('PASS_17_SOURCE_LEVEL_CONTRACT_LOCKED')).length;
check('Contract maturity marks at least 22 document/communication/integration routes as Pass 17', pass17Mature >= 22, `Only ${pass17Mature} Pass 17 routes found.`);

limitations.push('This certification is source-level unless run without --source-only after pnpm-lock.yaml is generated and committed.');
limitations.push('Runtime install, typecheck, migrations, seed, MinIO, Redis/BullMQ, Docker and E2E proof remain local-machine gates until the root lockfile exists.');
limitations.push('Live SMTP/SMS/webhook provider delivery remains adapter-dependent; Pass 17 locks retry/idempotency/payload safety and source-level delivery evidence.');

const status = blockers.length ? 'HOLD_BLOCKED_RUNTIME' : failures.length ? 'FAIL_SOURCE_LEVEL' : sourceOnly ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_STRICT_RUNTIME_READY';
const result = { pass: 'PASS_17_DOCUMENTS_EVENTS_COMMUNICATIONS', status, sourceOnly, checksRun: checks.length, passed: checks.filter((check) => check.passed).length, blockers, failures, limitations, checks };
writeFileSync(pathOf('certification-output/pass-17-documents-events-communications.json'), JSON.stringify(result, null, 2));
writeFileSync(pathOf('certification-output/PASS_17_DOCUMENTS_EVENTS_COMMUNICATIONS_LOG.txt'), `${status}\nchecks=${checks.length}\npassed=${result.passed}\nblockers=${blockers.length}\nfailures=${failures.length}\n`);
console.log(JSON.stringify(result, null, 2));
if (blockers.length || failures.length) process.exit(1);

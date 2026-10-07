import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/contract-lock.json'), 'utf8'));

function hash(path) {
  return createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
}

const hashChecks = [
  ['docs/contracts/api-endpoint-matrix.csv', lock.sourceEndpointCsvSha256],
  ['docs/contracts/permissions-matrix.csv', lock.sourcePermissionCsvSha256],
  ['docs/contracts/status-models.json', lock.sourceStatusJsonSha256],
  ['shared/src/contracts/registry/locked-endpoints.json', lock.lockedEndpointsJsonSha256],
  ['shared/src/contracts/registry/contract-maturity.json', lock.contractMaturityJsonSha256],
];

for (const [path, expected] of hashChecks) {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing locked artifact: ${path}`);
    continue;
  }
  if (hash(path) !== expected) failures.push(`Locked artifact changed without updating the contract lock: ${path}`);
}

const endpoints = JSON.parse(
  readFileSync(join(root, 'shared/src/contracts/registry/locked-endpoints.json'), 'utf8'),
);
if (endpoints.length !== lock.endpointCatalogCount) {
  failures.push(`Endpoint registry count ${endpoints.length} != ${lock.endpointCatalogCount}`);
}
const signatures = new Set();
for (const endpoint of endpoints) {
  const signature = `${endpoint.method} ${endpoint.endpoint}`;
  if (signatures.has(signature)) failures.push(`Duplicate endpoint: ${signature}`);
  signatures.add(signature);
  if (!endpoint.endpoint.startsWith('/api/v1')) failures.push(`Endpoint outside /api/v1: ${signature}`);
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) failures.push(`Unsupported method: ${signature}`);
}

const maturity = JSON.parse(
  readFileSync(join(root, 'shared/src/contracts/registry/contract-maturity.json'), 'utf8'),
);
if (maturity.length !== endpoints.length) failures.push('Contract maturity matrix is not 1:1 with endpoint registry.');

const required = [
  'shared/src/contracts/common/api-envelope.ts',
  'shared/src/contracts/common/primitives.ts',
  'shared/src/contracts/common/pagination.ts',
  'shared/src/contracts/common/idempotency.ts',
  'shared/src/contracts/registry/locked-endpoints.ts',
  'shared/src/permissions/permission-catalog.ts',
  'shared/src/schemas/status-models.ts',
  'shared/src/constants/domain-events.ts',
  'shared/src/contracts/customers/create-customer.contract.ts',
  'shared/src/contracts/auth/login.contract.ts',
  'shared/src/contracts/procurement/create-purchase-request.contract.ts',
  'shared/src/contracts/procurement/approve-purchase-request.contract.ts',
  'shared/src/contracts/procurement/receive-goods.contract.ts',
  'shared/src/contracts/inventory/create-stock-transfer.contract.ts',
  'shared/src/contracts/projects/create-project.contract.ts',
  'shared/src/contracts/assets/install-asset.contract.ts',
  'shared/src/contracts/service/create-ticket.contract.ts',
  'shared/src/contracts/service/complete-work-order.contract.ts',
  'shared/src/contracts/finance/create-customer-invoice.contract.ts',
  'shared/src/contracts/finance/create-payment.contract.ts',
  'shared/src/contracts/documents/upload-intent.contract.ts',
  'backend/src/core/contracts/locked-route.ts',
  'backend/src/core/http/error-handler.ts',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`Missing contract file: ${path}`);

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

// Shared contracts must stay browser safe.
const forbiddenShared = [
  '@prisma/client',
  '@nexora/database',
  " from 'fastify'",
  " from 'minio'",
  " from 'node:crypto'",
  " from 'node:fs'",
  " from 'node:path'",
];
for (const file of filesUnder(join(root, 'shared/src'))) {
  const text = readFileSync(file, 'utf8');
  if (forbiddenShared.some((needle) => text.includes(needle))) {
    failures.push(`Browser-safety violation in ${relative(root, file)}`);
  }
}

// Every route file with actual Fastify HTTP registration must opt into the locked route guard.
for (const file of filesUnder(join(root, 'backend/src/modules'))) {
  const rel = relative(root, file);
  if (!rel.endsWith('.routes.ts')) continue;
  const text = readFileSync(file, 'utf8');
  if (/\bapp\.(get|post|put|patch|delete)\s*\(/.test(text) && !text.includes('defineLockedRoute')) {
    failures.push(`Route file does not use defineLockedRoute: ${rel}`);
  }
}

if (failures.length) {
  console.error('Contract gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Contract gate PASSED: ${endpoints.length} locked endpoint signatures preserved.`);

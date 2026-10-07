import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'frontend/src/app',
  'frontend/src/modules',
  'frontend/src/components',
  'frontend/src/layouts',
  'frontend/src/hooks',
  'frontend/src/lib',
  'backend/src/config',
  'backend/src/core',
  'backend/src/plugins',
  'backend/src/modules',
  'backend/src/types',
  'worker/src/queues',
  'worker/src/processors',
  'worker/src/schedulers',
  'shared/src/contracts',
  'shared/src/schemas',
  'shared/src/enums',
  'shared/src/constants',
  'shared/src/permissions',
  'shared/src/utils',
  'database/prisma/schema.prisma',
  'database/prisma/models',
  'database/prisma/migrations',
  'database/prisma/seed',
  'database/src/client.ts',
  'infrastructure/docker',
  'infrastructure/nginx',
  'infrastructure/terraform',
  'docs',
  'tests/e2e',
  '.github/workflows',
];

for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`Missing required path: ${path}`);
}

const forbiddenDeps = new Set([
  'express',
  '@nestjs/core',
  'mongoose',
  'sequelize',
  'typeorm',
  'firebase',
  '@supabase/supabase-js',
]);
for (const pkgPath of [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'worker/package.json',
  'shared/package.json',
  'database/package.json',
]) {
  const pkg = JSON.parse(readFileSync(join(root, pkgPath), 'utf8'));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const dependency of Object.keys(dependencies)) {
    if (forbiddenDeps.has(dependency)) {
      failures.push(`${pkgPath}: forbidden dependency ${dependency}`);
    }
  }
}

function filesUnder(dir) {
  const output = [];
  if (!existsSync(dir)) return output;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...filesUnder(path));
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) output.push(path);
  }
  return output;
}

function source(file) {
  return readFileSync(file, 'utf8');
}

function containsAny(file, needles) {
  const text = source(file);
  return needles.some((needle) => text.includes(needle));
}

for (const file of filesUnder(join(root, 'frontend/src'))) {
  if (
    containsAny(file, [
      '@nexora/database',
      '@prisma/client',
      '@nexora/backend',
      'backend/src',
      'database/src',
    ])
  ) {
    failures.push(`Frontend boundary violation: ${relative(root, file)}`);
  }
}

for (const file of filesUnder(join(root, 'backend/src'))) {
  const path = relative(root, file);
  const text = source(file);

  if (
    (path.endsWith('.routes.ts') || path.endsWith('.controller.ts')) &&
    (text.includes('@prisma/client') || text.includes('@nexora/database'))
  ) {
    failures.push(`Direct DB access forbidden in ${path}`);
  }

  if (
    path.endsWith('.service.ts') &&
    (/\bprisma\s*\./.test(text) || /\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(text))
  ) {
    failures.push(`Service persistence must go through its repository: ${path}`);
  }
}

for (const file of filesUnder(join(root, 'shared/src'))) {
  if (
    containsAny(file, [
      '@prisma/client',
      '@nexora/database',
      " from 'fastify'",
      ' from "fastify"',
      " from 'minio'",
      " from 'node:crypto'",
      " from 'node:fs'",
    ])
  ) {
    failures.push(`Shared browser-safety violation: ${relative(root, file)}`);
  }
}

// Synchronous cross-domain imports must pass through the target domain public index.
const modulesRoot = resolve(root, 'backend/src/modules');
for (const file of filesUnder(modulesRoot)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const rel = relative(modulesRoot, file);
  const owner = rel.split(/[\\/]/)[0];
  const text = source(file);
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;
    const resolved = normalize(resolve(dirname(file), importPath.replace(/\.js$/, '.ts')));
    if (!resolved.startsWith(modulesRoot)) continue;
    const targetRel = relative(modulesRoot, resolved);
    const targetOwner = targetRel.split(/[\\/]/)[0];
    if (!targetOwner || targetOwner === owner) continue;

    const normalizedImport = importPath.replace(/\\/g, '/');
    if (!normalizedImport.endsWith('/index.js')) {
      failures.push(
        `Cross-domain import must use target public index/facade: ${rel} -> ${importPath}`,
      );
    }
  }
}

const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
for (const service of ['web', 'api', 'worker', 'postgres', 'redis', 'minio', 'nginx']) {
  if (!new RegExp(`^  ${service}:`, 'm').test(compose)) {
    failures.push(`docker-compose missing service: ${service}`);
  }
}

const apiConstants = readFileSync(join(root, 'shared/src/constants/api.ts'), 'utf8');
if (!apiConstants.includes("'/api/v1'")) {
  failures.push('Locked API base path /api/v1 not found.');
}

// Critical transactional business state must not be delegated to queues.
for (const file of filesUnder(join(root, 'backend/src/modules/inventory'))) {
  if (containsAny(file, ['BullMQ', 'new Queue(', "from 'bullmq'"])) {
    failures.push(`Critical inventory module must not use BullMQ: ${relative(root, file)}`);
  }
}

if (failures.length) {
  console.error('Architecture gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Architecture gate PASSED: locked stack, browser boundary, repository/service layering and public cross-domain facade boundary intact.',
);

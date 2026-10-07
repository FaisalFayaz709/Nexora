import { spawnSync } from 'node:child_process';

for (const script of [
  'scripts/check-dependency-foundation.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-contract-coverage.mjs',
  'scripts/check-database-foundation.mjs',
]) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const test = spawnSync(process.execPath, ['--test', 'database/tests/schema-foundation.test.mjs'], { stdio: 'inherit' });
if (test.status !== 0) process.exit(test.status ?? 1);

console.log('Database runtime foundation gate PASSED. Prisma CLI/PostgreSQL execution remains the runtime gate.');

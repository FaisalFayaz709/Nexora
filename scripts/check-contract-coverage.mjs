import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'docs/contracts/CONTRACT_COVERAGE.md',
  'docs/contracts/SOURCE_RECONCILIATION.md',
  'scripts/check-contracts.mjs',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/contract-maturity.json',
];

const missing = required.filter((path) => !existsSync(join(root, path)));
if (missing.length) {
  console.error('Missing contract-coverage files:', missing);
  process.exit(1);
}

for (const script of ['scripts/check-dependency-foundation.mjs', 'scripts/check-contracts.mjs']) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Contract coverage gate PASSED. Networked dependency/type/test/build verification remains separate.');

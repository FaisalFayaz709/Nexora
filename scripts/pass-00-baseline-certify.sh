#!/usr/bin/env bash
set -euo pipefail

printf '\n[PASS 00] Recovery, baseline lock and build truth certification\n'
printf '[PASS 00] Enabling Corepack and activating pnpm@10.15.0\n'
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm --version

if [ ! -f pnpm-lock.yaml ]; then
  printf '\n[PASS 00] Generating real pnpm-lock.yaml from the npm registry. This requires internet access.\n'
  pnpm install --lockfile-only
fi

node scripts/check-pass-00-baseline-certification.mjs
pnpm install --frozen-lockfile
pnpm dependencies:check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build

node - <<'NODE'
const { mkdirSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
mkdirSync(resolve(process.cwd(), 'certification-output'), { recursive: true });
writeFileSync(resolve(process.cwd(), 'certification-output/pass-00-runtime-certification.json'), JSON.stringify({
  pass: 'PASS_00',
  name: 'Recovery, baseline lock and build truth',
  status: 'GO',
  lockfilePresent: existsSync(resolve(process.cwd(), 'pnpm-lock.yaml')),
  verifiedCommands: [
    'corepack prepare pnpm@10.15.0 --activate',
    'pnpm install --lockfile-only if lockfile was missing',
    'node scripts/check-pass-00-baseline-certification.mjs',
    'pnpm install --frozen-lockfile',
    'pnpm dependencies:check',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm test',
    'pnpm db:validate',
    'pnpm build'
  ],
  checkedAt: new Date().toISOString()
}, null, 2) + '\n');
NODE

printf '\n[PASS 00] GO: baseline lock/install/lint/typecheck/test/db-validate/build certified.\n'

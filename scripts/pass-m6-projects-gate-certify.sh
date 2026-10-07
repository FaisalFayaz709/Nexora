#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs
node scripts/check-docs-source-reconciliation.mjs
node scripts/check-prisma-schema-migrations.mjs
node scripts/check-procurement.mjs
node scripts/check-approval-engine.mjs
node scripts/check-projects.mjs

echo "PASS M6 projects gate certification PASSED."
echo "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

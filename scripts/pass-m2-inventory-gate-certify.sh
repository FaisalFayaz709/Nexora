#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs

if command -v pnpm >/dev/null 2>&1 && [ -d node_modules ]; then
  pnpm --filter @nexora/backend test -- stock-reservation.service.test.ts inventory-core-policy.test.ts
else
  echo "Dependency-backed Vitest tests skipped here: pnpm/node_modules are not available. Run after PASS M1 lockfile install."
fi

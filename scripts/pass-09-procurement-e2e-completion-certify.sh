#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "PASS 09 - Procurement End-to-End Completion"
node scripts/check-pass-09-procurement-e2e-completion.mjs
pnpm procurement:check
pnpm inventory:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

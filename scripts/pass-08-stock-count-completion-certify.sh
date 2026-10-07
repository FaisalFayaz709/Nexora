#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "PASS 08 - Stock Count / Cycle Count Completion"
node scripts/check-pass-08-stock-count-completion.mjs
pnpm inventory:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

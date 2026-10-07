#!/usr/bin/env bash
set -euo pipefail

echo "PASS 22 — Testing Completion"
node scripts/check-pass-22-testing-completion.mjs --source-only

echo "
Strict local runtime commands required before GO:"
echo "pnpm install --frozen-lockfile"
echo "pnpm pass:22:check"
echo "pnpm typecheck"
echo "pnpm lint"
echo "pnpm test"
echo "RUN_INTEGRATION_TESTS=1 pnpm test"
echo "RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test"
echo "RUN_BROWSER_E2E=1 pnpm test:e2e:browser"
echo "SECURITY_SMOKE=1 pnpm security:smoke:certify"
echo "pnpm db:validate && pnpm db:migrate:deploy && pnpm db:seed"
echo "bash scripts/backup-restore-certify.sh"

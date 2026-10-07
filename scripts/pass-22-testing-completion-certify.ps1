$ErrorActionPreference = 'Stop'
Write-Host 'PASS 22 — Testing Completion'
node scripts/check-pass-22-testing-completion.mjs --source-only

Write-Host "`nStrict local runtime commands required before GO:"
Write-Host 'pnpm install --frozen-lockfile'
Write-Host 'pnpm pass:22:check'
Write-Host 'pnpm typecheck'
Write-Host 'pnpm lint'
Write-Host 'pnpm test'
Write-Host 'RUN_INTEGRATION_TESTS=1 pnpm test'
Write-Host 'RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test'
Write-Host 'RUN_BROWSER_E2E=1 pnpm test:e2e:browser'
Write-Host 'SECURITY_SMOKE=1 pnpm security:smoke:certify'
Write-Host 'pnpm db:validate && pnpm db:migrate:deploy && pnpm db:seed'
Write-Host 'bash scripts/backup-restore-certify.sh'

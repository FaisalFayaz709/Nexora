$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "PASS 09 - Procurement End-to-End Completion"
node scripts/check-pass-09-procurement-e2e-completion.mjs
pnpm procurement:check
pnpm inventory:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

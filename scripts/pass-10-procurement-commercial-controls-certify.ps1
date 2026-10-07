$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "PASS 10 - Procurement Commercial Controls"
node scripts/check-pass-10-procurement-commercial-controls.mjs
pnpm commercial-procurement:check
pnpm commercial-finance:check
pnpm procurement:check
pnpm inventory:check
pnpm finance:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

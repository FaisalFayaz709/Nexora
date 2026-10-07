$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "PASS 07 - Inventory Ledger and Stock Control Completion"
node scripts/check-pass-07-inventory-ledger-completion.mjs
pnpm inventory:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

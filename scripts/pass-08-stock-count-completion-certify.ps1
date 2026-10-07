$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "PASS 08 - Stock Count / Cycle Count Completion"
node scripts/check-pass-08-stock-count-completion.mjs
pnpm inventory:check
pnpm typecheck
pnpm test
pnpm db:migrate:deploy
pnpm db:seed

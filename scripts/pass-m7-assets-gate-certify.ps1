$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs
node scripts/check-docs-source-reconciliation.mjs
node scripts/check-prisma-schema-migrations.mjs
node scripts/check-procurement.mjs
node scripts/check-approval-engine.mjs
node scripts/check-projects.mjs
node scripts/check-assets.mjs

Write-Host "PASS M7 assets gate certification PASSED."
Write-Host "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

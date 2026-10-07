$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-frontend-workflows.mjs

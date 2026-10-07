$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs
node scripts/check-docs-source-reconciliation.mjs

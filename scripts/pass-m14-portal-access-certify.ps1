$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-crm-portals.mjs
node scripts/check-portal-access-completion.mjs

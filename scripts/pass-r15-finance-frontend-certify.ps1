$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
node scripts/check-pass-r15-finance-frontend.mjs --source-only
node scripts/check-pass-r6-screen-contracts.mjs --source-only
node scripts/check-pass-r7-tanstack-grids.mjs --source-only
node scripts/check-pass-r8-rhf-zod-forms.mjs --source-only
node scripts/check-pass-r4-central-api-query-system.mjs --source-only
node scripts/check-pass-r5-backend-offline-sync-route.mjs --source-only

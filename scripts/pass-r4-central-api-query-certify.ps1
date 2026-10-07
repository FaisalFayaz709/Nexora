$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
node scripts/check-pass-r4-central-api-query-system.mjs

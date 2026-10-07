$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
node scripts/check-pass-r6-screen-contracts.mjs --source-only
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
@(
  "PASS R6 screen-contract source certification",
  "Generated at: $timestamp"
) | Set-Content -Path certification-output/PASS_R6_SCREEN_CONTRACTS_SOURCE_ONLY.txt
node scripts/check-pass-r6-screen-contracts.mjs --source-only | Add-Content -Path certification-output/PASS_R6_SCREEN_CONTRACTS_SOURCE_ONLY.txt

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
node scripts/check-pass-r7-tanstack-grids.mjs --source-only
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
@(
  "PASS R7 TanStack grid source certification",
  "Generated at: $timestamp"
) | Set-Content -Path certification-output/PASS_R7_TANSTACK_GRIDS_SOURCE_ONLY.txt
node scripts/check-pass-r7-tanstack-grids.mjs --source-only | Add-Content -Path certification-output/PASS_R7_TANSTACK_GRIDS_SOURCE_ONLY.txt

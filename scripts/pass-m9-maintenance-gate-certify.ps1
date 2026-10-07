$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

node scripts/check-maintenance.mjs

Write-Host "PASS M9 maintenance gate certification PASSED."
Write-Host "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

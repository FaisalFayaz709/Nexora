$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

node scripts/check-finance.mjs
if ($LASTEXITCODE -ne 0) {
  throw "PASS M10 finance gate certification failed."
}

Write-Host "PASS M10 finance gate certification PASSED."
Write-Host "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

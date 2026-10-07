$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
node scripts/check-final-runtime-core-controls.mjs
if ($LASTEXITCODE -ne 0) { throw "PASS M11 final runtime core-controls gate failed" }
node scripts/check-runtime-readiness.mjs
if ($LASTEXITCODE -ne 0) { throw "PASS M11 runtime-readiness gate failed" }
Write-Host "PASS M11 runtime-readiness certification passed."

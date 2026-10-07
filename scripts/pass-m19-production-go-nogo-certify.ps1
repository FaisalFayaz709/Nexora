$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-production-release.mjs
node scripts/check-docker-runtime-topology.mjs
node scripts/check-pass-m18-full-lifecycle-e2e-certification.mjs
node scripts/check-pass-m19-production-go-nogo-certification.mjs

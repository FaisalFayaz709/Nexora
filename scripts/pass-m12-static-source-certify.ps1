$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
node scripts/check-pass-m12-static-source-certification.mjs

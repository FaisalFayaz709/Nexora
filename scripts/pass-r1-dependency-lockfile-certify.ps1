$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
node scripts/pass-r1-dependency-lockfile-certify.mjs

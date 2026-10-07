$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --lockfile-only
Write-Host "pnpm-lock.yaml generated. Run pnpm dependencies:check and pnpm verify:static next."

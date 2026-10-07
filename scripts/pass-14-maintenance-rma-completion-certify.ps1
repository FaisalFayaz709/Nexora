$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
node scripts/check-pass-14-maintenance-rma-completion.mjs @args

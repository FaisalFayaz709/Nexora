$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
node scripts/check-pass-15-finance-tax-bank-reconciliation.mjs @args

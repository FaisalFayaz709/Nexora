$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
node scripts/check-pass-12-asset-lifecycle-qr-completion.mjs @args

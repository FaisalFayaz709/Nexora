$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
node scripts/check-pass-13-field-service-offline-sync-completion.mjs @args

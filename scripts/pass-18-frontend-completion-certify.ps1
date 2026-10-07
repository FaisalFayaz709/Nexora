$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/check-pass-18-frontend-completion.mjs @args | Tee-Object -FilePath certification-output/PASS_18_FRONTEND_COMPLETION_LOG.txt

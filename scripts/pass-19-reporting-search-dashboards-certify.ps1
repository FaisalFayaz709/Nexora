$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
node scripts/check-pass-19-reporting-search-dashboards.mjs @args | Tee-Object -FilePath certification-output/PASS_19_REPORTING_SEARCH_DASHBOARDS_LOG.txt

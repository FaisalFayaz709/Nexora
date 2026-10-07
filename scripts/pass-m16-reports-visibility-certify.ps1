$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/check-reports-dashboards-search-calendar-timeline.mjs

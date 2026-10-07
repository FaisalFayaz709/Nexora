$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/check-pass-11-project-management-bom-budget-material-flow.mjs @args | Tee-Object -FilePath certification-output/PASS_11_PROJECT_MANAGEMENT_BOM_BUDGET_MATERIAL_FLOW_LOG.txt

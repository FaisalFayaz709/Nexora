$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
$Log = "certification-output/PASS_01_ARCHITECTURE_BOUNDARY_AUDIT_LOG.txt"
"[PASS 01] Architecture boundary certification started at $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))" | Tee-Object -FilePath $Log
"[PASS 01] Running locked architecture gate" | Tee-Object -FilePath $Log -Append
node scripts/check-architecture.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 01] Running import/boundary source audit" | Tee-Object -FilePath $Log -Append
node scripts/check-pass-01-architecture-boundary-audit.mjs --source-only 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 01] Running locked contract gate" | Tee-Object -FilePath $Log -Append
node scripts/check-contracts.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 01] PASS_SOURCE_LEVEL" | Tee-Object -FilePath $Log -Append

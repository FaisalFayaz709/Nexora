$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..")
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
$log = "certification-output\PASS_05_BUSINESS_MASTERS_COMPLETION_LOG.txt"
"PASS 05 strict certification started at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -FilePath $log
node scripts/check-pass-05-business-masters-completion.mjs 2>&1 | Tee-Object -Append -FilePath $log
"PASS 05 strict certification finished at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -Append -FilePath $log

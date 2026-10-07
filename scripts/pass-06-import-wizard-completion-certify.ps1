$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..")
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
$log = "certification-output\PASS_06_IMPORT_WIZARD_COMPLETION_LOG.txt"
"PASS 06 strict certification started at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -FilePath $log
node scripts/check-pass-06-import-wizard-completion.mjs 2>&1 | Tee-Object -Append -FilePath $log
"PASS 06 strict certification finished at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -Append -FilePath $log

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..")
New-Item -ItemType Directory -Force -Path certification-output | Out-Null
$log = "certification-output\PASS_04_NUMBER_SEQUENCE_FEATURE_FLAGS_LOG.txt"
"PASS 04 strict certification started at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -FilePath $log
node scripts/check-pass-04-number-sequence-feature-flags.mjs 2>&1 | Tee-Object -Append -FilePath $log
"PASS 04 strict certification finished at $((Get-Date).ToUniversalTime().ToString('s'))Z" | Tee-Object -Append -FilePath $log

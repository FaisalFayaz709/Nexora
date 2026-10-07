$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
node scripts/check-pass-r18-test-completion.mjs --source-only | Tee-Object -FilePath certification-output\PASS_R18_TEST_COMPLETION_SOURCE_ONLY.txt

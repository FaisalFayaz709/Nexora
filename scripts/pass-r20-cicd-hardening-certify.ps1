$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Out = Join-Path $Root "certification-output\r20-cicd-hardening"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Log = Join-Path $Out "r20-cicd-hardening-certification.log"
"R20_CI_CD_HARDENING" | Tee-Object -FilePath $Log
"UTC $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))" | Tee-Object -FilePath $Log -Append
"Running source-level CI/CD hardening gate..." | Tee-Object -FilePath $Log -Append
node scripts/check-pass-r20-cicd-hardening.mjs --source-only 2>&1 | Tee-Object -FilePath $Log -Append
Copy-Item "certification-output\pass-r20-cicd-hardening-source-gate.json" (Join-Path $Out "pass-r20-cicd-hardening-source-gate.json") -Force
"R20_CI_CD_HARDENING source-level certification passed." | Tee-Object -FilePath $Log -Append
"Evidence: certification-output\r20-cicd-hardening" | Tee-Object -FilePath $Log -Append

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
$LogDir = Join-Path $Root "certification-output"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "pass-m18-full-lifecycle-e2e-certification.log"
Set-Content -Path $Log -Value ""
function Invoke-CertStep {
  param([Parameter(Mandatory=$true)][string]$Command,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
  Add-Content $Log ""
  Add-Content $Log ("$ " + $Command + " " + ($Arguments -join " "))
  & $Command @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Certification command failed: $Command $($Arguments -join ' ')" }
}
Add-Content $Log "PASS M18 Full Lifecycle E2E Certification Gate"
Add-Content $Log ("UTC " + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))
Invoke-CertStep node scripts/check-architecture.mjs
Invoke-CertStep node scripts/check-contracts.mjs
Invoke-CertStep node scripts/check-full-workflow-e2e.mjs
Invoke-CertStep node scripts/check-docker-runtime-topology.mjs
Invoke-CertStep node scripts/check-pass-m18-full-lifecycle-e2e-certification.mjs
Write-Host "PASS M18 source-level full lifecycle E2E certification gate completed. Strict live runtime remains blocked until pnpm-lock.yaml exists, Docker is running, and certification-output/full-lifecycle-e2e/runtime-results.json shows zero failed and zero skipped scenarios."

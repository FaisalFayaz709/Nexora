$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$LogDir = Join-Path $Root "certification-output"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "pass-m17-docker-runtime-topology-certification.log"
Set-Content -Path $Log -Value ""

function Write-Log($Message) {
  $Message | Tee-Object -FilePath $Log -Append
}

function Run-Cmd($File, [string[]]$Arguments) {
  Write-Log ""
  Write-Log ("$ " + $File + " " + ($Arguments -join " "))
  & $File @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $File $($Arguments -join ' ')" }
}

Write-Log "PASS M17 Docker runtime topology/evidence gate"
Write-Log ((Get-Date).ToUniversalTime().ToString("'UTC' yyyy-MM-ddTHH:mm:ssZ"))
Run-Cmd "node" @("scripts/check-architecture.mjs")
Run-Cmd "node" @("scripts/check-contracts.mjs")
Run-Cmd "node" @("scripts/check-docker-runtime-topology.mjs")
Write-Log ""
Write-Log "PASS M17 source-level Docker runtime topology certification completed."
Write-Log "Live docker compose build/up remains controlled by scripts/docker-runtime-certify.ps1 after a real pnpm-lock.yaml exists."

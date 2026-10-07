$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Out = Join-Path $Root "certification-output/docker-runtime"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Log = Join-Path $Out "docker-runtime-certification.log"
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

function Wait-ForUrl($Url, $Target, $Tries = 60) {
  for ($i = 1; $i -le $Tries; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -OutFile $Target
      Write-Log "Ready: $Url"
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Timed out waiting for $Url"
}

if (-not $env:NEXORA_HTTP_PORT) { $env:NEXORA_HTTP_PORT = "8080" }
Write-Log "NEXORA Docker Runtime Certification"
Write-Log ((Get-Date).ToUniversalTime().ToString("'UTC' yyyy-MM-ddTHH:mm:ssZ"))
Write-Log "HTTP gateway port: $env:NEXORA_HTTP_PORT"

try {
  if (-not (Test-Path "pnpm-lock.yaml")) {
    throw "REQUIRED FILE MISSING: pnpm-lock.yaml. Generate it first with scripts/generate-lockfile.ps1"
  }

  Run-Cmd "node" @("--version")
  Run-Cmd "docker" @("--version")
  Run-Cmd "docker" @("compose", "version")
  Run-Cmd "pnpm" @("--version")
  Run-Cmd "pnpm" @("verify:static")
  Run-Cmd "docker" @("compose", "config")
  docker compose config | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose.config.yml")

  Run-Cmd "docker" @("compose", "down", "--remove-orphans")
  Run-Cmd "docker" @("compose", "build")
  Run-Cmd "docker" @("compose", "up", "-d", "postgres", "redis", "minio")
  Run-Cmd "docker" @("compose", "up", "minio-init")
  Run-Cmd "docker" @("compose", "up", "migrator")
  Run-Cmd "docker" @("compose", "up", "-d", "api", "worker", "web", "nginx")

  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/healthz" (Join-Path $Out "nginx-healthz.txt")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/api/v1/health/live" (Join-Path $Out "api-live.json")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/api/v1/health/ready" (Join-Path $Out "api-ready.json")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/" (Join-Path $Out "web-home.html")

  Run-Cmd "docker" @("compose", "ps")
  docker compose ps | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose-ps.txt")
  docker compose logs --no-color --tail=300 | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose-logs.tail.txt")
  Write-Log "Docker runtime certification PASSED. Evidence saved to certification-output/docker-runtime/."
} catch {
  Write-Log "R3 runtime certification FAILED. Capturing Docker state..."
  docker compose ps 2>&1 | Tee-Object -FilePath (Join-Path $Out "docker-compose-ps.failure.txt") | Out-Null
  docker compose logs --no-color 2>&1 | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose-logs.failure.txt")
  throw
}

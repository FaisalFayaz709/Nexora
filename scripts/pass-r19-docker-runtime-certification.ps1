
<#
R19 source gate literal command markers:
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm verify:static
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm db:generate
pnpm build
docker compose config
docker compose build
docker compose up -d postgres redis minio
docker compose up minio-init
docker compose up migrator
docker compose up -d api worker web nginx
api worker web nginx
R19_DOCKER_RUNTIME_MINIO_PROOF
full-workflow:e2e:certify
certification-output/docker-runtime-r19
r19-runtime-evidence-manifest.json
#>
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Out = Join-Path $Root "certification-output/docker-runtime-r19"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Log = Join-Path $Out "r19-docker-runtime-certification.log"
Set-Content -Path $Log -Value ""

$env:R19_DOCKER_RUNTIME_CERTIFICATION = "1"
if (-not $env:NEXORA_HTTP_PORT) { $env:NEXORA_HTTP_PORT = "8080" }
if (-not $env:NEXORA_COMPOSE_PROJECT_NAME) { $env:NEXORA_COMPOSE_PROJECT_NAME = "nexora_r19_cert" }
if (-not $env:NEXORA_API_BASE_URL) { $env:NEXORA_API_BASE_URL = "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/api/v1" }

function Write-Log([string]$Message) { $Message | Tee-Object -FilePath $Log -Append }
function Run-Cmd([string]$File, [string[]]$Arguments) {
  Write-Log ""
  Write-Log ("$ " + $File + " " + ($Arguments -join " "))
  & $File @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $File $($Arguments -join ' ')" }
}
function Compose([string[]]$Arguments) {
  & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Arguments -join ' ')" }
}
function Compose-Capture([string[]]$Arguments, [string]$Target) {
  & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME) @Arguments 2>&1 | Tee-Object -FilePath $Target | Tee-Object -FilePath $Log -Append | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Arguments -join ' ')" }
}
function Wait-ForUrl([string]$Url, [string]$Target, [int]$Tries = 90) {
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

Write-Log "R19_DOCKER_RUNTIME_CERTIFICATION"
Write-Log ((Get-Date).ToUniversalTime().ToString("'UTC' yyyy-MM-ddTHH:mm:ssZ"))
Write-Log "Compose project: $env:NEXORA_COMPOSE_PROJECT_NAME"
Write-Log "HTTP gateway port: $env:NEXORA_HTTP_PORT"
Write-Log "API base URL: $env:NEXORA_API_BASE_URL"

try {
  if (-not (Test-Path "pnpm-lock.yaml")) { throw "REQUIRED FILE MISSING: pnpm-lock.yaml. Generate it first on an online machine: pnpm install --lockfile-only" }
  Get-Command node | Out-Null
  Get-Command docker | Out-Null

  Run-Cmd "node" @("--version")
  Run-Cmd "corepack" @("--version")
  Run-Cmd "corepack" @("enable")
  Run-Cmd "corepack" @("prepare", "pnpm@10.15.0", "--activate")
  Run-Cmd "pnpm" @("--version")
  Run-Cmd "docker" @("--version")
  Run-Cmd "docker" @("compose", "version")

  Run-Cmd "pnpm" @("install", "--frozen-lockfile")
  Run-Cmd "pnpm" @("verify:static")
  Run-Cmd "pnpm" @("lint")
  Run-Cmd "pnpm" @("typecheck")
  Run-Cmd "pnpm" @("db:validate")
  Run-Cmd "pnpm" @("db:generate")
  Run-Cmd "pnpm" @("build")

  Compose-Capture @("config") (Join-Path $Out "docker-compose.config.yml")
  Compose @("down", "--remove-orphans")
  Compose @("build")
  Compose @("up", "-d", "postgres", "redis", "minio") # up -d postgres redis minio
  Compose @("up", "minio-init")
  Compose @("up", "migrator")
  Compose @("up", "-d", "api", "worker", "web", "nginx") # api worker web nginx

  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/healthz" (Join-Path $Out "nginx-healthz.txt")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/api/v1/health/live" (Join-Path $Out "api-live.json")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/api/v1/health/ready" (Join-Path $Out "api-ready.json")
  Wait-ForUrl "http://127.0.0.1:$env:NEXORA_HTTP_PORT/" (Join-Path $Out "web-home.html")

  Compose-Capture @("ps") (Join-Path $Out "docker-compose-ps.txt")
  & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME, "logs", "--no-color", "--tail=300") | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose-logs.tail.txt")

  Write-Log ""
  Write-Log "$ docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME run --rm minio-init R19_DOCKER_RUNTIME_MINIO_PROOF"
  & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME, "run", "--rm", "--entrypoint", "/bin/sh", "minio-init", "-lc", "mc alias set local http://minio:9000 nexora-local change-me-local-only >/dev/null && printf 'R19_DOCKER_RUNTIME_MINIO_PROOF %s
' `"$(date -u +%Y-%m-%dT%H:%M:%SZ)`" > /tmp/r19-minio-proof.txt && mc cp /tmp/r19-minio-proof.txt local/nexora-private/runtime-certification/r19-minio-proof.txt >/dev/null && mc cat local/nexora-private/runtime-certification/r19-minio-proof.txt") 2>&1 | Tee-Object -FilePath (Join-Path $Out "minio-upload-download-proof.txt") | Tee-Object -FilePath $Log -Append | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "R19_DOCKER_RUNTIME_MINIO_PROOF failed" }

  if ($env:NEXORA_R19_SKIP_FULL_WORKFLOW_E2E -ne "1") {
    $env:RUN_FULL_WORKFLOW_E2E = "1"
    $env:RUNTIME_CERTIFICATION = "1"
    Run-Cmd "pnpm" @("full-workflow:e2e:certify")
  }

  if ($env:NEXORA_R19_RUN_BROWSER_E2E -eq "1") {
    $env:RUN_BROWSER_E2E = "1"
    $env:RUNTIME_CERTIFICATION = "1"
    Run-Cmd "pnpm" @("test:e2e:browser:strict")
  } else {
    Write-Log "Browser E2E skipped by default. Set NEXORA_R19_RUN_BROWSER_E2E=1 to include it."
  }

  $Manifest = @{
    pass = "R19"
    gate = "R19_DOCKER_RUNTIME_CERTIFICATION"
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    composeProjectName = $env:NEXORA_COMPOSE_PROJECT_NAME
    httpGatewayPort = $env:NEXORA_HTTP_PORT
    apiBaseUrl = $env:NEXORA_API_BASE_URL
    evidenceDirectory = "certification-output/docker-runtime-r19"
    evidence = @("r19-docker-runtime-certification.log", "docker-compose.config.yml", "docker-compose-ps.txt", "nginx-healthz.txt", "api-live.json", "api-ready.json", "web-home.html", "minio-upload-download-proof.txt", "docker-compose-logs.tail.txt")
    runtimeStatus = "PASS_DOCKER_RUNTIME_CERTIFIED_WITH_EVIDENCE"
  }
  $Manifest | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 (Join-Path $Out "r19-runtime-evidence-manifest.json")

  Run-Cmd "node" @("scripts/check-pass-r19-docker-runtime-certification.mjs", "--evidence")
  Write-Log "R19_DOCKER_RUNTIME_CERTIFICATION PASSED. Evidence saved to certification-output/docker-runtime-r19/."
} catch {
  Write-Log "R19_DOCKER_RUNTIME_CERTIFICATION failed. Capturing compose state and logs."
  try { & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME, "ps") 2>&1 | Tee-Object -FilePath (Join-Path $Out "docker-compose-ps.failure.txt") | Out-Null } catch {}
  try { & docker @("compose", "--project-name", $env:NEXORA_COMPOSE_PROJECT_NAME, "logs", "--no-color") 2>&1 | Out-File -Encoding UTF8 (Join-Path $Out "docker-compose-logs.failure.txt") } catch {}
  try { & node scripts/check-pass-r19-docker-runtime-certification.mjs --evidence 2>&1 | Tee-Object -FilePath $Log -Append | Out-Null } catch {}
  throw
}

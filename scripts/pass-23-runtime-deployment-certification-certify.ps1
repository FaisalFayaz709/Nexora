$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Out = Join-Path $Root "certification-output/pass-23-runtime-deployment"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Log = Join-Path $Out "pass-23-runtime-deployment-certification.log"
Set-Content -Path $Log -Value ""

$env:PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION = "1"
if (-not $env:NEXORA_HTTP_PORT) { $env:NEXORA_HTTP_PORT = "8080" }
if (-not $env:NEXORA_COMPOSE_PROJECT_NAME) { $env:NEXORA_COMPOSE_PROJECT_NAME = "nexora_pass23_cert" }
if (-not $env:NEXORA_API_BASE_URL) { $env:NEXORA_API_BASE_URL = "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/api/v1" }

function Write-Log([string]$Message) {
  $Message | Tee-Object -FilePath $Log -Append
}
function Run-Cmd([string]$Exe, [string[]]$Args) {
  Write-Log ""
  Write-Log ("$ " + $Exe + " " + ($Args -join " "))
  & $Exe @Args 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $Exe $($Args -join ' ')" }
}
function Compose([string[]]$Args) {
  & docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME @Args
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Args -join ' ')" }
}
function Wait-ForUrl([string]$Url, [string]$Target, [int]$Tries = 90) {
  for ($i = 1; $i -le $Tries; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -OutFile $Target
      Write-Log "Ready: $Url"
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Timed out waiting for $Url"
}

try {
  Write-Log "PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION"
  Write-Log ("UTC " + (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
  Write-Log "Compose project: $($env:NEXORA_COMPOSE_PROJECT_NAME)"
  Write-Log "HTTP gateway port: $($env:NEXORA_HTTP_PORT)"
  Write-Log "API base URL: $($env:NEXORA_API_BASE_URL)"

  if (-not (Test-Path "pnpm-lock.yaml")) {
    Write-Log "REQUIRED FILE MISSING: pnpm-lock.yaml"
    Write-Log "Generate it first on an online machine: pnpm install --lockfile-only"
    exit 1
  }

  Run-Cmd node @("--version")
  Run-Cmd corepack @("--version")
  Run-Cmd corepack @("enable")
  Run-Cmd corepack @("prepare", "pnpm@10.15.0", "--activate")
  Run-Cmd pnpm @("--version")
  Run-Cmd docker @("--version")
  Run-Cmd docker @("compose", "version")
  Run-Cmd pnpm @("install", "--frozen-lockfile")
  Run-Cmd pnpm @("pass:23:check")
  Run-Cmd pnpm @("verify:static")
  Run-Cmd pnpm @("lint")
  Run-Cmd pnpm @("typecheck")
  Run-Cmd pnpm @("test")
  Run-Cmd pnpm @("db:validate")
  Run-Cmd pnpm @("db:generate")
  Run-Cmd pnpm @("build")

  docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME config | Tee-Object -FilePath (Join-Path $Out "docker-compose.config.yml") | Tee-Object -FilePath $Log -Append | Out-Null
  Compose @("down", "--remove-orphans")
  Compose @("build")
  Compose @("up", "-d", "postgres", "redis", "minio")
  Compose @("up", "minio-init")
  Compose @("up", "migrator")
  Compose @("up", "-d", "api", "worker", "web", "nginx")

  Wait-ForUrl "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/healthz" (Join-Path $Out "nginx-healthz.txt")
  Wait-ForUrl "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/api/v1/health/live" (Join-Path $Out "api-live.json")
  Wait-ForUrl "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/api/v1/health/ready" (Join-Path $Out "api-ready.json")
  Wait-ForUrl "http://127.0.0.1:$($env:NEXORA_HTTP_PORT)/" (Join-Path $Out "web-home.html")

  docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME ps | Tee-Object -FilePath (Join-Path $Out "docker-compose-ps.txt") | Tee-Object -FilePath $Log -Append | Out-Null
  docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME logs --no-color --tail=300 | Set-Content -Path (Join-Path $Out "docker-compose-logs.tail.txt")
  docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME run --rm --entrypoint /bin/sh minio-init -lc "mc alias set local http://minio:9000 nexora-local change-me-local-only >/dev/null && printf 'PASS_23_RUNTIME_MINIO_PROOF %s
' \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" > /tmp/pass23-minio-proof.txt && mc cp /tmp/pass23-minio-proof.txt local/nexora-private/runtime-certification/pass23-minio-proof.txt >/dev/null && mc cat local/nexora-private/runtime-certification/pass23-minio-proof.txt" | Tee-Object -FilePath (Join-Path $Out "minio-upload-download-proof.txt") | Tee-Object -FilePath $Log -Append | Out-Null

  if (-not $env:NEXORA_PASS23_SKIP_FULL_WORKFLOW_E2E) {
    $env:RUN_FULL_WORKFLOW_E2E = "1"
    $env:RUNTIME_CERTIFICATION = "1"
    Run-Cmd pnpm @("full-workflow:e2e:certify")
  }
  if (-not $env:NEXORA_PASS23_RUN_SECURITY_SMOKE -or $env:NEXORA_PASS23_RUN_SECURITY_SMOKE -eq "1") {
    $env:SECURITY_SMOKE = "1"
    $env:RUNTIME_CERTIFICATION = "1"
    Run-Cmd pnpm @("security:smoke:certify")
  }

  $Manifest = @{
    pass = "PASS_23"
    gate = "PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION"
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    composeProjectName = $env:NEXORA_COMPOSE_PROJECT_NAME
    httpGatewayPort = $env:NEXORA_HTTP_PORT
    apiBaseUrl = $env:NEXORA_API_BASE_URL
    evidenceDirectory = "certification-output/pass-23-runtime-deployment"
    evidence = @("pass-23-runtime-deployment-certification.log", "docker-compose.config.yml", "docker-compose-ps.txt", "nginx-healthz.txt", "api-live.json", "api-ready.json", "web-home.html", "minio-upload-download-proof.txt", "docker-compose-logs.tail.txt")
    runtimeStatus = "PASS_23_DOCKER_DEPLOYMENT_RUNTIME_CERTIFIED_WITH_EVIDENCE"
  } | ConvertTo-Json -Depth 8
  Set-Content -Path (Join-Path $Out "pass-23-runtime-evidence-manifest.json") -Value $Manifest
  Run-Cmd node @("scripts/check-pass-23-runtime-deployment-certification.mjs", "--evidence")
  Write-Log "PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION PASSED. Evidence saved to certification-output/pass-23-runtime-deployment/."
} catch {
  Write-Log "PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION failed. Capturing Docker state and logs."
  try { docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME ps | Tee-Object -FilePath (Join-Path $Out "docker-compose-ps.failure.txt") | Tee-Object -FilePath $Log -Append | Out-Null } catch {}
  try { docker compose --project-name $env:NEXORA_COMPOSE_PROJECT_NAME logs --no-color | Set-Content -Path (Join-Path $Out "docker-compose-logs.failure.txt") } catch {}
  throw
}

# PASS_23_MARKERS: corepack prepare pnpm@10.15.0 --activate | pnpm install --frozen-lockfile | pnpm verify:static | pnpm lint | pnpm typecheck

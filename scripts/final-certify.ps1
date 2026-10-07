$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
$LogDir = Join-Path $Root "certification-output"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "final-certification.log"
Set-Content -Path $Log -Value ""
function Invoke-CertStep {
  param([Parameter(Mandatory=$true)][string]$Command,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
  Add-Content $Log ""
  Add-Content $Log ("$ " + $Command + " " + ($Arguments -join " "))
  & $Command @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Certification command failed: $Command $($Arguments -join ' ')" }
}
$env:RUN_INTEGRATION_TESTS = "1"
$env:RUNTIME_CERTIFICATION = "1"
$env:RUN_FULL_WORKFLOW_E2E = "1"
$env:RUN_FULL_WORKFLOW_E2E_STRICT = "1"
$env:RUN_PRODUCTION_RELEASE = "1"
if (-not $env:NEXORA_API_BASE_URL) { $env:NEXORA_API_BASE_URL = "http://127.0.0.1:8080/api/v1" }
Add-Content $Log "NEXORA Final Runtime Certification"
Add-Content $Log ("UTC " + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"))
Add-Content $Log "Runtime acceptance suites are enabled with RUN_INTEGRATION_TESTS=1 and RUNTIME_CERTIFICATION=1."
Invoke-CertStep node --version
Invoke-CertStep corepack --version
corepack enable
if ($LASTEXITCODE -ne 0) { throw "corepack enable failed" }
corepack prepare pnpm@10.15.0 --activate
if ($LASTEXITCODE -ne 0) { throw "Unable to activate pnpm 10.15.0" }
Invoke-CertStep pnpm --version
if (-not (Test-Path (Join-Path $Root "pnpm-lock.yaml"))) { throw "pnpm-lock.yaml is required. Run scripts/generate-lockfile.ps1 once in an online environment and commit the generated lockfile." }
Invoke-CertStep pnpm install --frozen-lockfile
Invoke-CertStep pnpm verify:static
Invoke-CertStep pnpm final-runtime-core-controls:check
Invoke-CertStep pnpm lint
Invoke-CertStep pnpm typecheck
Invoke-CertStep pnpm db:validate
Invoke-CertStep pnpm db:generate
Invoke-CertStep pnpm build
Invoke-CertStep docker compose config
Invoke-CertStep docker compose up -d postgres redis minio
Invoke-CertStep pnpm db:migrate:deploy
Invoke-CertStep pnpm db:migrate:status
Invoke-CertStep docker compose up -d api worker web nginx
Invoke-CertStep docker compose ps
Invoke-CertStep pnpm full-workflow:e2e:certify
Invoke-CertStep pnpm test
Invoke-CertStep pnpm security:smoke:certify
Invoke-CertStep pnpm backup-restore:certify
Invoke-CertStep pnpm production-release:certify
Write-Host "Final certification command chain completed. Attach $Log to the release record."

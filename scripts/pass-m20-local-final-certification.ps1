$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
$Log = "certification-output\pass-m20-local-final-certification.log"
Set-Content -Path $Log -Value ""
function Invoke-CertStep {
  param([Parameter(Mandatory=$true)][string]$Command,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
  "" | Tee-Object -FilePath $Log -Append
  "`$ $Command $($Arguments -join ' ')" | Tee-Object -FilePath $Log -Append
  & $Command @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  if ($LASTEXITCODE -ne 0) { throw "Certification command failed: $Command $($Arguments -join ' ')" }
}

$env:RUN_INTEGRATION_TESTS = "1"
$env:RUNTIME_CERTIFICATION = "1"
$env:RUN_FULL_WORKFLOW_E2E = "1"
$env:RUN_FULL_WORKFLOW_E2E_STRICT = "1"
$env:RUN_PRODUCTION_RELEASE = "1"
$env:SECURITY_SMOKE = "1"
if (-not $env:NEXORA_API_BASE_URL) {
  $Port = if ($env:NEXORA_HTTP_PORT) { $env:NEXORA_HTTP_PORT } else { "8080" }
  $env:NEXORA_API_BASE_URL = "http://127.0.0.1:$Port/api/v1"
}

"PASS M20 — Local final certification / dependency and runtime evidence unblocker" | Tee-Object -FilePath $Log -Append
("UTC " + [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")) | Tee-Object -FilePath $Log -Append

Invoke-CertStep node --version
Invoke-CertStep corepack --version
corepack enable
if ($LASTEXITCODE -ne 0) { throw "corepack enable failed" }
corepack prepare pnpm@10.15.0 --activate
if ($LASTEXITCODE -ne 0) { throw "corepack prepare pnpm@10.15.0 --activate failed" }
Invoke-CertStep pnpm --version

if (-not (Test-Path "pnpm-lock.yaml")) {
  "pnpm-lock.yaml is missing; generating real lockfile through pnpm registry resolution." | Tee-Object -FilePath $Log -Append
  Invoke-CertStep pnpm install --lockfile-only
}

Invoke-CertStep node scripts/check-lockfile-policy.mjs
Invoke-CertStep pnpm install --frozen-lockfile
Invoke-CertStep pnpm verify:static
Invoke-CertStep pnpm lint
Invoke-CertStep pnpm typecheck
Invoke-CertStep pnpm db:validate
Invoke-CertStep pnpm db:generate
Invoke-CertStep pnpm build
Invoke-CertStep pnpm test
Invoke-CertStep docker compose config
Invoke-CertStep docker compose build
Invoke-CertStep docker compose up -d postgres redis minio minio-init migrator api worker web nginx
Invoke-CertStep docker compose ps
Invoke-CertStep pnpm docker:runtime:certify
Invoke-CertStep pnpm full-workflow:e2e:certify
Invoke-CertStep pnpm security:smoke:certify
Invoke-CertStep pnpm backup-restore:certify
Invoke-CertStep pnpm production-release:certify
Invoke-CertStep pnpm production-go-nogo:check
Invoke-CertStep node scripts/check-pass-m20-runtime-evidence-pipeline.mjs

"PASS M20 local final certification chain finished. Review certification-output\production-go-nogo\current-decision.json before any manual GO." | Tee-Object -FilePath $Log -Append

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Out = Join-Path $Root "certification-output\pass-r22-final-runtime-unblocker"
$Log = Join-Path $Out "r22-final-runtime.log"
$Summary = Join-Path $Out "r22-step-summary.tsv"
$Result = Join-Path $Out "r22-final-runtime-result.json"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
Set-Content -Path $Log -Value ""
Set-Content -Path $Summary -Value "step`tstatus"

function Write-Log($Message) {
  $Message | Tee-Object -FilePath $Log -Append
}

function Add-Step($Name, $Status) {
  Add-Content -Path $Summary -Value "$Name`t$Status"
}

function Write-Result($Status, $FailedStep = $null) {
  $nodeScript = @"
const fs = require('fs');
const summaryPath = String.raw`$Summary`;
const rows = fs.existsSync(summaryPath)
  ? fs.readFileSync(summaryPath, 'utf8').trim().split(/\n/).slice(1).filter(Boolean).map((line) => {
      const [step, status] = line.split(/\t/);
      return { step, status };
    })
  : [];
const result = {
  pass: 'R22',
  name: 'Final runtime unblocker and production certification handoff',
  status: '$Status',
  failedStep: '$FailedStep' || null,
  generatedAt: new Date().toISOString(),
  productionGoClaimed: '$Status' === 'GO_CANDIDATE_RUNTIME_CERTIFIED',
  steps: rows
};
fs.writeFileSync(String.raw`$Result`, JSON.stringify(result, null, 2));
"@
  node -e $nodeScript
}

function Invoke-Step($Name, $ScriptBlock) {
  Write-Log "`n===== R22 STEP: $Name ====="
  try {
    & $ScriptBlock 2>&1 | Tee-Object -FilePath $Log -Append
    Add-Step $Name "PASS"
  } catch {
    Add-Step $Name "FAIL"
    Write-Log "R22 failed at step: $Name"
    Write-Log $_.Exception.Message
    Write-Result "NO_GO_RUNTIME_FAILED" $Name
    throw
  }
}

Write-Log "PASS R22 final runtime unblocker started at $((Get-Date).ToUniversalTime().ToString('s'))Z"

Invoke-Step "source handoff gate" { node scripts/check-pass-r22-final-runtime-unblocker.mjs --source-only }
Invoke-Step "node version" { node -e "const v=process.versions.node.split('.').map(Number); if(v[0]!==22){ console.error('Node 22.x is required. Found '+process.versions.node); process.exit(1); } console.log('Node '+process.versions.node+' OK');" }
Invoke-Step "corepack enable" { corepack enable }
Invoke-Step "activate pnpm" { corepack prepare pnpm@10.15.0 --activate }
Invoke-Step "pnpm version" { pnpm --version }

if (-not (Test-Path "pnpm-lock.yaml")) {
  Invoke-Step "generate pnpm lockfile" { pnpm install --lockfile-only }
} else {
  Write-Log "pnpm-lock.yaml already exists; skipping lockfile generation."
  Add-Step "generate pnpm lockfile" "SKIPPED_ALREADY_EXISTS"
}

Invoke-Step "frozen install" { pnpm install --frozen-lockfile }
Invoke-Step "R21 source audit" { pnpm pass:r21:source-check }
Invoke-Step "static verification" { pnpm verify:static }
Invoke-Step "format check" { pnpm format:check }
Invoke-Step "lint" { pnpm lint }
Invoke-Step "typecheck" { pnpm typecheck }
Invoke-Step "unit and integration tests" { pnpm test }
Invoke-Step "Prisma validation" { pnpm db:validate }
Invoke-Step "build" { pnpm build }
Invoke-Step "Docker compose config" { docker compose config }
Invoke-Step "Docker compose build" { docker compose build }
Invoke-Step "Docker compose up" { docker compose up -d }

Write-Log "Waiting for runtime services to settle..."
Start-Sleep -Seconds 20
Invoke-Step "Docker compose ps" { docker compose ps }
Invoke-Step "Nginx health" { curl.exe -fsS http://localhost:8080/healthz }
Invoke-Step "API live health" { curl.exe -fsS http://localhost:8080/api/v1/health/live }
Invoke-Step "API readiness health" { curl.exe -fsS http://localhost:8080/api/v1/health/ready }
Invoke-Step "Prisma generate" { pnpm db:generate }
Invoke-Step "Migration deploy" { pnpm db:migrate:deploy }
Invoke-Step "Migration status" { pnpm db:migrate:status }
Invoke-Step "Seed" { pnpm db:seed }
Invoke-Step "Strict browser E2E" { pnpm test:e2e:browser:strict }
Invoke-Step "Security smoke" { pnpm security:smoke:preflight }
Invoke-Step "Full workflow E2E certification" { pnpm full-workflow:e2e:certify }
Invoke-Step "Production release certification" { pnpm production-release:certify }
Invoke-Step "R22 final source/runtime evidence recheck" { node scripts/check-pass-r22-final-runtime-unblocker.mjs }

Write-Result "GO_CANDIDATE_RUNTIME_CERTIFIED"
Write-Log "R22 completed successfully. Current decision: GO_CANDIDATE_RUNTIME_CERTIFIED. Review evidence before production approval."

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$EvidenceDir = Join-Path $Root "certification-output/pass-24-operations-observability-backup-dr"
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
if (-not (Test-Path "pnpm-lock.yaml")) {
  Write-Error "PASS 24 HOLD: pnpm-lock.yaml is missing. Generate it with pnpm install --lockfile-only before runtime certification."
  exit 2
}
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm pass:24:check
pnpm verify:static
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
try { pnpm db:migrate:status } catch { Write-Warning "db:migrate:status did not complete in this shell; attach runtime evidence manually." }
$Manifest = Join-Path $EvidenceDir "pass-24-runtime-evidence-manifest.json"
@'
{
  "pass": "PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR",
  "status": "HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED",
  "note": "Populate this manifest with performance, backup/restore, observability, queue, incident, DR and rollback evidence before claiming GO."
}
'@ | Set-Content -Encoding UTF8 $Manifest
Write-Host "PASS 24 source/runtime preflight complete. Final GO still requires populated runtime evidence artifacts in $EvidenceDir."

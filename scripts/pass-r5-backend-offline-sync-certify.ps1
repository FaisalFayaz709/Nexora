$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
node scripts/check-pass-r5-backend-offline-sync-route.mjs @args
if (Test-Path "pnpm-lock.yaml") {
  pnpm contracts:check
  pnpm route-coverage:check
  pnpm field-service:check
  pnpm typecheck
  pnpm test --filter @nexora/backend
} else {
  Write-Warning "pnpm-lock.yaml missing; run pnpm install on a connected machine before full runtime/type/test certification."
}

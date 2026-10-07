$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpm -and (Test-Path "node_modules")) {
  pnpm --filter @nexora/backend test -- stock-reservation.service.test.ts inventory-core-policy.test.ts
} else {
  Write-Host "Dependency-backed Vitest tests skipped here: pnpm/node_modules are not available. Run after PASS M1 lockfile install."
}

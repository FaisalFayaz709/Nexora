$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/check-prisma-schema-migrations.mjs

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpm -and (Test-Path "pnpm-lock.yaml")) {
  pnpm install --frozen-lockfile
  pnpm db:validate
  pnpm db:generate
  if ($env:DATABASE_URL) {
    pnpm db:migrate:deploy
    pnpm db:seed
  } else {
    Write-Host "DATABASE_URL is not set; skipped db:migrate:deploy and db:seed runtime execution."
  }
} else {
  Write-Host "pnpm or pnpm-lock.yaml is unavailable; static M4 gate passed, runtime Prisma CLI gates remain local."
}

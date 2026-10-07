$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
node scripts/check-pass-r3-route-group-shell-compliance.mjs --source-only
if ((Get-Command pnpm -ErrorAction SilentlyContinue) -and (Test-Path pnpm-lock.yaml)) {
  pnpm install --frozen-lockfile
  pnpm frontend:shells:check
  pnpm --filter @nexora/frontend typecheck
} else {
  Write-Warning "pnpm install/typecheck skipped because pnpm or pnpm-lock.yaml is unavailable. Generate the lockfile on a connected workstation."
}

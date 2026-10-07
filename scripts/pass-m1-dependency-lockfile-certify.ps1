$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

corepack enable
corepack prepare pnpm@10.15.0 --activate

$forbidden = @("package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lockb")
foreach ($file in $forbidden) {
  if (Test-Path $file) {
    throw "Forbidden non-pnpm lockfile detected: $file. Remove it before continuing."
  }
}

pnpm --version
pnpm install --lockfile-only
node scripts/check-lockfile-policy.mjs
pnpm install --frozen-lockfile
pnpm dependencies:check

Write-Host "PASS M1 completed: real pnpm-lock.yaml exists, frozen install passed, and dependency foundation gate passed."

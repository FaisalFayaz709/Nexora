$ErrorActionPreference = "Stop"
node scripts/check-pass-r9-identity-organization-rbac-frontend.mjs --source-only
if (Test-Path "pnpm-lock.yaml") {
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  node scripts/check-pass-r9-identity-organization-rbac-frontend.mjs
} else {
  Write-Host "R9 source gate passed. Runtime certification skipped because pnpm-lock.yaml is missing; run Pass R1 locally first."
}

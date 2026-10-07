$ErrorActionPreference = "Stop"
node scripts/check-pass-r8-rhf-zod-forms.mjs --source-only
if (Test-Path "pnpm-lock.yaml") {
  pnpm frontend:forms:check
  pnpm typecheck
  pnpm lint
} else {
  Write-Host "pnpm-lock.yaml is missing; source-only R8 gate passed, runtime certification remains pending after R1 local lockfile generation."
}

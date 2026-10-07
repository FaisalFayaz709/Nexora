$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
pnpm --filter @nexora/backend test -- src/test/runtime-harness.smoke.test.ts | Tee-Object -FilePath "certification-output/runtime-harness-smoke.log"
Write-Host "Runtime harness preflight completed."

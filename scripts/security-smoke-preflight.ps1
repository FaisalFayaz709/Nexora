$ErrorActionPreference = "Stop"

Write-Host "Security smoke preflight"

if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required for security smoke tests" }
if (-not $env:REDIS_URL) { throw "REDIS_URL is required for security smoke tests" }
if (-not $env:MINIO_ENDPOINT) { throw "MINIO_ENDPOINT is required for upload security smoke tests" }

pnpm architecture:check
pnpm contracts:check
pnpm security:check
pnpm audit --audit-level high
$env:SECURITY_SMOKE="1"
$env:RUN_INTEGRATION_TESTS="1"
pnpm test

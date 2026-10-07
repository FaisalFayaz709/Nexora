$ErrorActionPreference = "Stop"
if (-not $env:NEXORA_API_BASE_URL) {
  $Port = if ($env:NEXORA_HTTP_PORT) { $env:NEXORA_HTTP_PORT } else { "8080" }
  $env:NEXORA_API_BASE_URL = "http://127.0.0.1:$Port/api/v1"
}
$env:RUN_FULL_WORKFLOW_E2E = "1"
# Set RUN_FULL_WORKFLOW_E2E_STRICT=1 only when executable full lifecycle evidence has been produced.
node scripts/full-workflow-e2e-certify.mjs

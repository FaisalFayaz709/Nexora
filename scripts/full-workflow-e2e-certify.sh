#!/usr/bin/env bash
set -euo pipefail
: "${NEXORA_API_BASE_URL:=http://127.0.0.1:${NEXORA_HTTP_PORT:-8080}/api/v1}"
export NEXORA_API_BASE_URL
export RUN_FULL_WORKFLOW_E2E=1
# Set RUN_FULL_WORKFLOW_E2E_STRICT=1 only when executable full lifecycle evidence has been produced.
node scripts/full-workflow-e2e-certify.mjs

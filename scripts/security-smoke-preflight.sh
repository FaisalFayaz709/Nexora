#!/usr/bin/env bash
set -euo pipefail

echo "Security smoke preflight"
echo "This script intentionally checks for the presence of runtime prerequisites before SECURITY_SMOKE=1 tests."

: "${DATABASE_URL:?DATABASE_URL is required for security smoke tests}"
: "${REDIS_URL:?REDIS_URL is required for security smoke tests}"
: "${MINIO_ENDPOINT:?MINIO_ENDPOINT is required for upload security smoke tests}"

pnpm architecture:check
pnpm contracts:check
pnpm security:check
pnpm audit --audit-level high
SECURITY_SMOKE=1 RUN_INTEGRATION_TESTS=1 pnpm test

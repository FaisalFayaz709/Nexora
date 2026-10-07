#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/certification-output"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/final-certification.log"
: > "$LOG"
run() { echo "" | tee -a "$LOG"; echo "\$ $*" | tee -a "$LOG"; "$@" 2>&1 | tee -a "$LOG"; }

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "REQUIRED FILE MISSING: $1" | tee -a "$LOG"
    return 1
  fi
}

export RUN_INTEGRATION_TESTS=1
export RUNTIME_CERTIFICATION=1
export RUN_FULL_WORKFLOW_E2E=1
export RUN_FULL_WORKFLOW_E2E_STRICT=1
export RUN_PRODUCTION_RELEASE=1
export NEXORA_API_BASE_URL="${NEXORA_API_BASE_URL:-http://127.0.0.1:${NEXORA_HTTP_PORT:-8080}/api/v1}"

echo "NEXORA Final Runtime Certification" | tee -a "$LOG"
date -u +"UTC %Y-%m-%dT%H:%M:%SZ" | tee -a "$LOG"
echo "Runtime acceptance suites are enabled with RUN_INTEGRATION_TESTS=1 and RUNTIME_CERTIFICATION=1." | tee -a "$LOG"

run node --version
run corepack --version
corepack enable
corepack prepare pnpm@10.15.0 --activate
run pnpm --version

require_file pnpm-lock.yaml
run pnpm install --frozen-lockfile
run pnpm verify:static
run pnpm final-runtime-core-controls:check
run pnpm lint
run pnpm typecheck
run pnpm db:validate
run pnpm db:generate
run pnpm build
run docker compose config
run docker compose up -d postgres redis minio
run pnpm db:migrate:deploy
run pnpm db:migrate:status
run docker compose up -d api worker web nginx
run docker compose ps
run pnpm full-workflow:e2e:certify
run pnpm test
run pnpm security:smoke:certify
run pnpm backup-restore:certify
run pnpm production-release:certify

echo "Final certification command chain completed. Attach this log to the release record." | tee -a "$LOG"

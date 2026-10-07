#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p certification-output
LOG="certification-output/pass-m20-local-final-certification.log"
: > "$LOG"
run() { echo "" | tee -a "$LOG"; echo "\$ $*" | tee -a "$LOG"; "$@" 2>&1 | tee -a "$LOG"; }

export RUN_INTEGRATION_TESTS=1
export RUNTIME_CERTIFICATION=1
export RUN_FULL_WORKFLOW_E2E=1
export RUN_FULL_WORKFLOW_E2E_STRICT=1
export RUN_PRODUCTION_RELEASE=1
export SECURITY_SMOKE=1
export NEXORA_API_BASE_URL="${NEXORA_API_BASE_URL:-http://127.0.0.1:${NEXORA_HTTP_PORT:-8080}/api/v1}"

echo "PASS M20 — Local final certification / dependency and runtime evidence unblocker" | tee -a "$LOG"
date -u +"UTC %Y-%m-%dT%H:%M:%SZ" | tee -a "$LOG"

run node --version
run corepack --version
corepack enable
corepack prepare pnpm@10.15.0 --activate
run pnpm --version

if [[ ! -f pnpm-lock.yaml ]]; then
  echo "pnpm-lock.yaml is missing; generating real lockfile through pnpm registry resolution." | tee -a "$LOG"
  run pnpm install --lockfile-only
fi

run node scripts/check-lockfile-policy.mjs
run pnpm install --frozen-lockfile
run pnpm verify:static
run pnpm lint
run pnpm typecheck
run pnpm db:validate
run pnpm db:generate
run pnpm build
run pnpm test
run docker compose config
run docker compose build
run docker compose up -d postgres redis minio minio-init migrator api worker web nginx
run docker compose ps
run pnpm docker:runtime:certify
run pnpm full-workflow:e2e:certify
run pnpm security:smoke:certify
run pnpm backup-restore:certify
run pnpm production-release:certify
run pnpm production-go-nogo:check
run node scripts/check-pass-m20-runtime-evidence-pipeline.mjs

echo "PASS M20 local final certification chain finished. Review certification-output/production-go-nogo/current-decision.json before any manual GO." | tee -a "$LOG"

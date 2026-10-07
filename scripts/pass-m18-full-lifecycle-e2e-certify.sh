#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/certification-output"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/pass-m18-full-lifecycle-e2e-certification.log"
: > "$LOG"
run() {
  echo "" | tee -a "$LOG"
  echo "\$ $*" | tee -a "$LOG"
  "$@" 2>&1 | tee -a "$LOG"
}

echo "PASS M18 Full Lifecycle E2E Certification Gate" | tee -a "$LOG"
date -u +"UTC %Y-%m-%dT%H:%M:%SZ" | tee -a "$LOG"
run node scripts/check-architecture.mjs
run node scripts/check-contracts.mjs
run node scripts/check-full-workflow-e2e.mjs
run node scripts/check-docker-runtime-topology.mjs
run node scripts/check-pass-m18-full-lifecycle-e2e-certification.mjs

echo "" | tee -a "$LOG"
echo "PASS M18 source-level full lifecycle E2E certification gate completed." | tee -a "$LOG"
echo "Strict live runtime remains blocked until pnpm-lock.yaml exists, Docker is running, and certification-output/full-lifecycle-e2e/runtime-results.json shows zero failed and zero skipped scenarios." | tee -a "$LOG"

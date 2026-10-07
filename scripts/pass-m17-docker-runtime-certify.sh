#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/certification-output"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/pass-m17-docker-runtime-topology-certification.log"
: > "$LOG"
run() {
  echo "" | tee -a "$LOG"
  echo "\$ $*" | tee -a "$LOG"
  "$@" 2>&1 | tee -a "$LOG"
}

echo "PASS M17 Docker runtime topology/evidence gate" | tee -a "$LOG"
date -u +"UTC %Y-%m-%dT%H:%M:%SZ" | tee -a "$LOG"
run node scripts/check-architecture.mjs
run node scripts/check-contracts.mjs
run node scripts/check-docker-runtime-topology.mjs

echo "" | tee -a "$LOG"
echo "PASS M17 source-level Docker runtime topology certification completed." | tee -a "$LOG"
echo "Live docker compose build/up remains controlled by scripts/docker-runtime-certify.sh after a real pnpm-lock.yaml exists." | tee -a "$LOG"

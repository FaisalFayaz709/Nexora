#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/certification-output/r20-cicd-hardening"
mkdir -p "$OUT"
LOG="$OUT/r20-cicd-hardening-certification.log"
: > "$LOG"

echo "R20_CI_CD_HARDENING" | tee -a "$LOG"
echo "UTC $(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee -a "$LOG"

echo "Running source-level CI/CD hardening gate..." | tee -a "$LOG"
node scripts/check-pass-r20-cicd-hardening.mjs --source-only 2>&1 | tee -a "$LOG"

cp certification-output/pass-r20-cicd-hardening-source-gate.json "$OUT/pass-r20-cicd-hardening-source-gate.json"

echo "R20_CI_CD_HARDENING source-level certification passed." | tee -a "$LOG"
echo "Evidence: certification-output/r20-cicd-hardening" | tee -a "$LOG"

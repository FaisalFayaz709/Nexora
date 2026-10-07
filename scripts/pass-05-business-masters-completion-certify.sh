#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certification-output
log="certification-output/PASS_05_BUSINESS_MASTERS_COMPLETION_LOG.txt"
echo "PASS 05 strict certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee "$log"
node scripts/check-pass-05-business-masters-completion.mjs 2>&1 | tee -a "$log"
echo "PASS 05 strict certification finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$log"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certification-output
log="certification-output/PASS_06_IMPORT_WIZARD_COMPLETION_LOG.txt"
echo "PASS 06 strict certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee "$log"
node scripts/check-pass-06-import-wizard-completion.mjs 2>&1 | tee -a "$log"
echo "PASS 06 strict certification finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$log"

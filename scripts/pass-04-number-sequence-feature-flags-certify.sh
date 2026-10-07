#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certification-output
{
  echo "PASS 04 strict certification started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node scripts/check-pass-04-number-sequence-feature-flags.mjs
  echo "PASS 04 strict certification finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} 2>&1 | tee certification-output/PASS_04_NUMBER_SEQUENCE_FEATURE_FLAGS_LOG.txt

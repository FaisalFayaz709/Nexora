#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-r6-screen-contracts.mjs --source-only
mkdir -p certification-output
{
  echo "PASS R6 screen-contract source certification"
  echo "Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node scripts/check-pass-r6-screen-contracts.mjs --source-only
} > certification-output/PASS_R6_SCREEN_CONTRACTS_SOURCE_ONLY.txt

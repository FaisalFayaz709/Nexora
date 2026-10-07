#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-r7-tanstack-grids.mjs --source-only
mkdir -p certification-output
{
  echo "PASS R7 TanStack grid source certification"
  echo "Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node scripts/check-pass-r7-tanstack-grids.mjs --source-only
} > certification-output/PASS_R7_TANSTACK_GRIDS_SOURCE_ONLY.txt

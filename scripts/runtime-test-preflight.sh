#!/usr/bin/env bash
set -euo pipefail
mkdir -p certification-output
pnpm --filter @nexora/backend test -- src/test/runtime-harness.smoke.test.ts | tee certification-output/runtime-harness-smoke.log
echo "Runtime harness preflight completed."

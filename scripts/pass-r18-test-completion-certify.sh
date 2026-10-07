#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-r18-test-completion.mjs --source-only | tee certification-output/PASS_R18_TEST_COMPLETION_SOURCE_ONLY.txt

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/check-finance.mjs

echo "PASS M10 finance gate certification PASSED."
echo "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

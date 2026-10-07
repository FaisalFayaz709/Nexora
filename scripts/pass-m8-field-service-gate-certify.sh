#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/check-field-service.mjs

echo "PASS M8 field-service gate certification PASSED."
echo "Dependency-backed format/lint/typecheck/test/build remain for local machine after PASS M1 lockfile completion."

#!/usr/bin/env bash
set -euo pipefail
mkdir -p certification-output/final-blueprint-compliance
node scripts/check-pass-r21-final-blueprint-compliance-audit.mjs --source-only | tee certification-output/final-blueprint-compliance/r21-final-blueprint-compliance-audit.log

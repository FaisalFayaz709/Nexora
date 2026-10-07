#!/usr/bin/env bash
set -euo pipefail
node scripts/check-pass-20-portals-and-saas-readiness.mjs --source-only | tee certification-output/PASS_20_PORTALS_AND_SAAS_READINESS_LOG.txt

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certification-output
node scripts/check-pass-19-reporting-search-dashboards.mjs "$@" | tee certification-output/PASS_19_REPORTING_SEARCH_DASHBOARDS_LOG.txt

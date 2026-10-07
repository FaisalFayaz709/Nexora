#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-reports-dashboards-search-calendar-timeline.mjs

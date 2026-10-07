#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-11-project-management-bom-budget-material-flow.mjs "$@" | tee certification-output/PASS_11_PROJECT_MANAGEMENT_BOM_BUDGET_MATERIAL_FLOW_LOG.txt

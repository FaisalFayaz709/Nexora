#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-15-finance-tax-bank-reconciliation.mjs "$@"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-inventory.mjs
node scripts/check-docs-source-reconciliation.mjs

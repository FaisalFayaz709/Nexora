#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-crm-portals.mjs
node scripts/check-portal-access-completion.mjs

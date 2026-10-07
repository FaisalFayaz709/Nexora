#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-13-field-service-offline-sync-completion.mjs "$@"

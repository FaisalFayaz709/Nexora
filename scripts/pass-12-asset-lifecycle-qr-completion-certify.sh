#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-pass-12-asset-lifecycle-qr-completion.mjs "$@"

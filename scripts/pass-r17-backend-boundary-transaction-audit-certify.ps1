$ErrorActionPreference = "Stop"
node scripts/check-architecture.mjs
node scripts/check-contracts.mjs
node scripts/check-pass-r5-backend-offline-sync-route.mjs --source-only
node scripts/check-pass-r17-backend-boundary-transaction-audit.mjs --source-only

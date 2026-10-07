$ErrorActionPreference = "Stop"
node scripts/check-pass-r3-route-group-shell-compliance.mjs --source-only
node scripts/check-pass-r4-central-api-query-system.mjs --source-only
node scripts/check-pass-r6-screen-contracts.mjs --source-only
node scripts/check-pass-r7-tanstack-grids.mjs --source-only
node scripts/check-pass-r8-rhf-zod-forms.mjs --source-only
node scripts/check-pass-r10-business-masters-frontend.mjs --source-only

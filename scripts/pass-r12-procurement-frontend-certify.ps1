$ErrorActionPreference = 'Stop'
node scripts/check-pass-r6-screen-contracts.mjs --source-only
node scripts/check-pass-r7-tanstack-grids.mjs --source-only
node scripts/check-pass-r8-rhf-zod-forms.mjs --source-only
node scripts/check-pass-r11-inventory-frontend.mjs --source-only
node scripts/check-pass-r12-procurement-frontend.mjs --source-only

$ErrorActionPreference = "Stop"
node scripts/check-pass-20-portals-and-saas-readiness.mjs --source-only | Tee-Object -FilePath certification-output/PASS_20_PORTALS_AND_SAAS_READINESS_LOG.txt

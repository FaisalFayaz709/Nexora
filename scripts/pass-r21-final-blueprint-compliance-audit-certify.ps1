$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path "certification-output\final-blueprint-compliance" | Out-Null
node scripts\check-pass-r21-final-blueprint-compliance-audit.mjs --source-only | Tee-Object -FilePath "certification-output\final-blueprint-compliance\r21-final-blueprint-compliance-audit.log"

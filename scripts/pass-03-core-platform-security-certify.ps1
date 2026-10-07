$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
New-Item -ItemType Directory -Force -Path "certification-output" | Out-Null
$Log = "certification-output/PASS_03_CORE_PLATFORM_SECURITY_LOG.txt"
"[PASS 03] Core platform, auth, RBAC, tenant isolation and organization certification started at $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))" | Tee-Object -FilePath $Log
"[PASS 03] Running core platform source gate" | Tee-Object -FilePath $Log -Append
node scripts/check-pass-03-core-platform-security.mjs --source-only 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 03] Running existing identity/organization gate" | Tee-Object -FilePath $Log -Append
node scripts/check-identity-organization.mjs 2>&1 | Tee-Object -FilePath $Log -Append
"[PASS 03] PASS_SOURCE_LEVEL" | Tee-Object -FilePath $Log -Append
"[PASS 03] Strict runtime proof still requires PASS 00 lockfile/install, PostgreSQL DATABASE_URL, seed data, typecheck and executable API/integration tests." | Tee-Object -FilePath $Log -Append

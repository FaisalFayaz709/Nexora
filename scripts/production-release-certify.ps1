$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$env:RUN_PRODUCTION_RELEASE = "1"
node scripts/production-release-certify.mjs

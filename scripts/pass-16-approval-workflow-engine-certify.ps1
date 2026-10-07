Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
node scripts/check-pass-16-approval-workflow-engine.mjs @args

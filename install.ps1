# Idempotently install the minimal-pwsh agent preset into the DSH user preset root.
# Usage: powershell -ExecutionPolicy Bypass -File .\install.ps1  (add -Force to overwrite)
param(
  [string]$DshHome,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'

if (-not $DshHome) {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
}
$target = Join-Path $DshHome '.agent-presets\minimal-pwsh'
$source = Join-Path $PSScriptRoot 'agent-presets\minimal-pwsh'

if (-not (Test-Path $source)) {
  throw "preset source not found at $source"
}

if (Test-Path $target) {
  if (-not $Force) {
    Write-Host "preset already installed at $target (rerun with -Force to overwrite)"
    exit 0
  }
  $backup = "$target.bak-$(Get-Date -Format 'yyyyMMddHHmmss')"
  Move-Item $target $backup
  Write-Host "backed up existing preset to $backup"
}

New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
Copy-Item -Recurse $source $target
Write-Host "installed preset to $target"
Write-Host 'restart dsh, then select 极简模式 (PowerShell) when creating a session'

[CmdletBinding()]
param(
    [ValidateSet('auto', 'live', 'fixture')]
    [string]$Mode = 'auto',
    [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$packageRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $packageRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22.14 or newer is required.'
}

if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'node_modules'))) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }
}

$env:MISSION_CONTROL_MODE = $Mode
& npm.cmd run dev -- --port $Port
exit $LASTEXITCODE

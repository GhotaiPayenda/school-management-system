#!/usr/bin/env pwsh
# Starts the PHP API and the Vite dev server together, then stops both on Ctrl+C.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
  npm run dev
} finally {
  Pop-Location
}
exit $LASTEXITCODE

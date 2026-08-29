<#
.SYNOPSIS
    Switch the active .env between development and production templates.
.EXAMPLE
    .\env.ps1 dev
    .\env.ps1 prod
#>
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "development", "prod", "production")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"

$src = switch ($Mode) {
    { $_ -in "dev", "development" } { ".env.development" }
    { $_ -in "prod", "production" } { ".env.production" }
}

if (-not (Test-Path $src)) {
    Write-Host "Missing $src" -ForegroundColor Red
    exit 1
}

if (Test-Path ".env") {
    Copy-Item ".env" ".env.bak" -Force
    Write-Host "Backed up existing .env -> .env.bak" -ForegroundColor Yellow
}

Copy-Item $src ".env" -Force
Write-Host "Active .env is now $src" -ForegroundColor Green

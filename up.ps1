<#
.SYNOPSIS
    LemonDBD Complete Runner - Strict mode uses --no-cache build and runs live tests.
.EXAMPLE
    .\up.ps1
    .\up.ps1 -Strict
    .\up.ps1 -Down
#>
param (
    [Alias("s")]
    [switch]$Strict,
    [switch]$Down
)

$ErrorActionPreference = "Stop"

# Handle explicit teardown request
if ($Down) {
    Write-Host "[STOP] Tearing down containers..." -ForegroundColor Yellow
    docker compose down
    exit 0
}

# ====================================================================
# [STEP 0] Teardown Any Running Containers
# ====================================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [Step 0] Stopping Existing Containers                  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
docker compose down

# ====================================================================
# [GATE 1] Pre-Flight: Dual-Stack Unit Tests (Local Windows Machine)
# ====================================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [Gate 1] Running Pre-Flight Unit Tests (Backend & Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1.1 Backend Unit Tests
Write-Host ""
Write-Host "> [1/2] Running Backend Unit Tests (pytest)..." -ForegroundColor Yellow
$env:PYTHONPATH = "$PSScriptRoot\backend"
python -m pytest backend/tests/unit -v --tb=short

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Backend unit tests did not pass!" -ForegroundColor Red
    Write-Host "[STOP] Docker build and startup has been ABORTED." -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Backend Unit Tests Passed." -ForegroundColor Green


# 1.2 Frontend Unit Tests & Checks
Write-Host ""
Write-Host "> [2/2] Running Frontend Unit Tests (npm run test:unit)..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\frontend"
try {
    npm run test:unit
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[FAIL] Frontend unit tests did not pass!" -ForegroundColor Red
        Write-Host "[STOP] Docker build and startup has been ABORTED." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
Write-Host "[PASS] Frontend Unit Tests Passed." -ForegroundColor Green


# ====================================================================
# [GATE 2] Build & Start Docker Cluster
# ====================================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [Gate 2] Building and Starting Docker Stack             " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($Strict) {
    Write-Host "> Strict Mode: Building all containers with --no-cache..." -ForegroundColor Yellow
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Docker image build failed!" -ForegroundColor Red
        exit 1
    }
    docker compose up -d --wait
} else {
    Write-Host "> Standard Mode: Building with layer cache..." -ForegroundColor Yellow
    docker compose up -d --build --wait
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Docker Compose failed to start healthy containers!" -ForegroundColor Red
    exit 1
}

Write-Host "[PASS] All containers are UP and HEALTHY." -ForegroundColor Green


# ====================================================================
# [GATE 3] Strict Mode: Live E2E Integration Tests
# ====================================================================
if ($Strict) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host " [Gate 3] Strict Mode: Running Dual-Stack Live Tests     " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    # 3.1 Backend Live Tests (PostgreSQL Clone)
    Write-Host ""
    Write-Host "> [1/2] Running Backend Live Tests (PostgreSQL Clone)..." -ForegroundColor Yellow
    $env:POSTGRES_HOST = "127.0.0.1"
    $env:POSTGRES_PORT = "5432"

    python -m pytest backend/tests/live -v

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[FAIL] Backend Live Tests Failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[PASS] Backend live tests passed." -ForegroundColor Green

    # 3.2 Frontend Live Tests
    Write-Host ""
    Write-Host "> [2/2] Running Frontend Live Tests (Next.js)..." -ForegroundColor Yellow
    Push-Location "$PSScriptRoot\frontend"
    try {
        npm run test:live
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "[FAIL] Frontend Live Tests Failed!" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Host "[PASS] Frontend live tests passed." -ForegroundColor Green

    Write-Host ""
    Write-Host "[SUCCESS] ALL UNIT & STRICT LIVE TESTS PASSED! System 100% verified." -ForegroundColor Green
}
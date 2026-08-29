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

    # [Gate 2b] The backend healthcheck (and --wait above) only proves
    # gunicorn is answering HTTP -- it says nothing about the initial DBD
    # data scrape, which runs in a background thread (see backend/run.py)
    # precisely so it doesn't block startup. On a fresh `down -v` reset that
    # scrape can still be filling the DB when the line above prints, and the
    # live test suite below assumes 50+ real characters already exist -- so
    # wait for that here instead of finding out via a wave of confusing
    # 500s/empty-array failures.
    Write-Host ""
    Write-Host "> Waiting for the initial character scrape to finish seeding the DB..." -ForegroundColor Yellow
    # NOTE: this queries Postgres directly through `docker compose exec`
    # instead of hitting the backend over the published host port. The HTTP
    # path was found to hang/timeout unpredictably right after a fresh
    # `up --wait` on Docker Desktop for Windows (the request never even
    # reached gunicorn's access log), which is a host-networking quirk, not
    # an application bug -- querying the DB in-network sidesteps it entirely
    # and is also just a more direct check of the thing we actually care about.
    $pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
    $pgDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "dbd_db" }
    $scrapeReady = $false
    for ($i = 1; $i -le 60; $i++) {
        $charCount = 0
        try {
            $raw = docker compose exec -T db psql -U $pgUser -d $pgDb -tAc "SELECT COUNT(*) FROM characters;" 2>$null
            if ($raw -and ($raw.Trim() -match '^\d+$')) {
                $charCount = [int]$raw.Trim()
            }
        } catch {
            $charCount = 0
            if ($i -eq 1 -or $i % 5 -eq 0) {
                Write-Host "  [scrape-wait-check] DB count query failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
            }
        }
        if ($charCount -ge 50) {
            Write-Host "[PASS] $charCount characters seeded -- data is ready." -ForegroundColor Green
            $scrapeReady = $true
            break
        }
        Write-Host "  ... $charCount/50+ characters so far, waiting ($i/60, ~3 min max)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    if (-not $scrapeReady) {
        Write-Host "[WARN] Character data still not seeded after 3 minutes -- continuing anyway, but live tests will likely fail. Check 'docker compose logs backend' for scrape errors." -ForegroundColor Red
    }

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
<#
.SYNOPSIS
    LemonDBD Complete Runner - Strict mode uses --no-cache build and runs live tests.
.EXAMPLE
    .\up.ps1
    .\up.ps1 -Strict
    .\up.ps1 -Perf
    .\up.ps1 -Perf smoke
    .\up.ps1 -Perf frontend
    .\up.ps1 -Perf writes
    .\up.ps1 -Perf queries
    .\up.ps1 -Perf full
    .\up.ps1 -Perf full -Vus 50 -Duration 1m
    .\up.ps1 -Down
#>
param (
    [Alias("s")]
    [switch]$Strict,
    [Alias("p")]
    [switch]$Perf,
    [Parameter(Position=0)]
    [string]$PerfSuite = "all",
    [Alias("v")]
    [int]$Vus = 0,
    [Alias("t")]
    [Alias("dur")]
    [string]$Duration = "",
    [switch]$Down
)

$ErrorActionPreference = "Stop"

# Handle explicit teardown request
if ($Down) {
    Write-Host "[STOP] Tearing down containers..." -ForegroundColor Yellow
    docker compose down
    exit 0
}

$isPerfRequested = $Perf -or $PSBoundParameters.ContainsKey('Perf') -or $PSBoundParameters.ContainsKey('PerfSuite')

$validSuites = @("smoke", "load", "stress", "spike", "soak", "frontend", "writes", "queries", "streaks", "full")

# Verify k6 is available in PATH if perf testing is requested
if ($isPerfRequested) {
    $k6Cmd = Get-Command k6 -ErrorAction SilentlyContinue
    if (-not $k6Cmd) {
        Write-Host ""
        Write-Host "[FAIL] k6 executable was not found in PATH!" -ForegroundColor Red
        Write-Host "Please install k6 to run performance tests." -ForegroundColor Red
        exit 1
    }

    if (-not [string]::IsNullOrWhiteSpace($PerfSuite) -and $PerfSuite -ne "all") {
        $chosen = $PerfSuite.ToLower().Trim()
        if ($validSuites -notcontains $chosen) {
            Write-Host ""
            Write-Host "[FAIL] Invalid perf suite '$PerfSuite'. Available suites: $($validSuites -join ', ')" -ForegroundColor Red
            exit 1
        }
    }
}

# If user just wants -Perf and containers are already running & healthy, we don't have to teardown/rebuild
$skipUpFlow = $false
if ($isPerfRequested -and -not $Strict) {
    try {
        $healthOut = & curl.exe -s --max-time 3 http://localhost/api/v1/health 2>$null
        if (-not ($healthOut -and $healthOut -match '"status"\s*:\s*"healthy"')) {
            $healthOut = & curl.exe -s --max-time 3 http://localhost:5000/api/v1/health 2>$null
        }
        if ($healthOut -and $healthOut -match '"status"\s*:\s*"healthy"') {
            Write-Host ""
            Write-Host "[INFO] Containers are already running and healthy. Skipping build & startup." -ForegroundColor Cyan
            $skipUpFlow = $true
        }
    } catch {
        $skipUpFlow = $false
    }
}

$pythonCmd = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }

if (-not $skipUpFlow) {
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
    & $pythonCmd -m pytest backend/tests/unit -v --tb=short

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
    # [GATE 2] Build & Start Docker Stack
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

    # [Gate 2b] Initial DBD data scrape readiness check
    # Wait for the initial character scrape to finish seeding the DB whenever
    # containers were freshly started and we need live or perf testing.
    if ($Strict -or $isPerfRequested) {
        Write-Host ""
        Write-Host "> Waiting for the initial character scrape to finish seeding the DB..." -ForegroundColor Yellow
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
            Write-Host "[WARN] Character data still not seeded after 3 minutes -- continuing anyway, but tests may fail. Check 'docker compose logs backend' for scrape errors." -ForegroundColor Red
        }
    }

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

        & $pythonCmd -m pytest backend/tests/live -v

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
}

# ====================================================================
# [GATE 4] K6 Performance Test Suite
# ====================================================================
if ($isPerfRequested) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host " [Gate 4] Running K6 Performance Tests                  " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    $targetSuites = @()
    if ([string]::IsNullOrWhiteSpace($PerfSuite) -or $PerfSuite -eq "all") {
        $targetSuites = $validSuites
    } else {
        $chosen = $PerfSuite.ToLower().Trim()
        if ($validSuites -notcontains $chosen) {
            Write-Host ""
            Write-Host "[FAIL] Invalid perf suite '$PerfSuite'. Available suites: $($validSuites -join ', ')" -ForegroundColor Red
            exit 1
        }
        $targetSuites = @($chosen)
    }

    $perfResults = @()
    $anyPerfFailed = $false
    $env:K6_TIMEOUT = "30s"
    if ($Vus -gt 0) {
        $env:TARGET_VUS = "$Vus"
        $env:VUS_COUNT = "$Vus"
    }
    if (-not [string]::IsNullOrWhiteSpace($Duration)) {
        $env:TARGET_DURATION = "$Duration"
    }

    foreach ($suite in $targetSuites) {
        $suiteRelPath = "k6/suites/$suite.js"
        $suiteFullPath = "$PSScriptRoot\$suiteRelPath"
        if (-not (Test-Path $suiteFullPath)) {
            Write-Host ""
            Write-Host "[FAIL] Test suite file not found: $suiteFullPath" -ForegroundColor Red
            exit 1
        }

        Write-Host ""
        Write-Host "> Running K6 Performance Suite: $suite ($suiteRelPath)..." -ForegroundColor Yellow

        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        Push-Location $PSScriptRoot
        try {
            k6 run $suiteRelPath
            $suiteExitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
        $sw.Stop()
        $duration = [math]::Round($sw.Elapsed.TotalSeconds, 2)

        if ($suiteExitCode -eq 0) {
            Write-Host "[PASS] K6 Suite '$suite' Passed in ${duration}s." -ForegroundColor Green
            $perfResults += [PSCustomObject]@{ Suite = $suite; Status = "PASSED"; Duration = $duration }
        } else {
            Write-Host "[FAIL] K6 Suite '$suite' Failed with exit code $suiteExitCode in ${duration}s!" -ForegroundColor Red
            $perfResults += [PSCustomObject]@{ Suite = $suite; Status = "FAILED"; Duration = $duration }
            $anyPerfFailed = $true
        }
    }

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host "              PERFORMANCE TEST SUMMARY                 " -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    Write-Host ("{0,-15} | {1,-10} | {2}" -f "Suite Name", "Status", "Duration")
    Write-Host "----------------+------------+----------"
    foreach ($res in $perfResults) {
        $statusColor = if ($res.Status -eq "PASSED") { "Green" } else { "Red" }
        Write-Host ("{0,-15} | {1,-10} | {2}s" -f $res.Suite, $res.Status, $res.Duration) -ForegroundColor $statusColor
    }
    Write-Host "========================================================" -ForegroundColor Magenta

    if ($anyPerfFailed) {
        Write-Host ""
        Write-Host "[FAIL] One or more performance test suites failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "[PASS] All specified performance tests passed!" -ForegroundColor Green
}

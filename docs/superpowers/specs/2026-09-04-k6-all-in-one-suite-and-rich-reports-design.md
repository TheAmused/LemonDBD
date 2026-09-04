# Design Specification: All-in-One Comprehensive K6 Suite & Rich Performance Dashboard

**Date:** 2026-09-04  
**Status:** Approved  
**Author:** Antigravity  
**Branch:** `feature/k6-performance-tests`  
**Target:** Live 6-container Docker Compose application (`http://localhost`) with zero additional containers.

---

## 1. Executive Summary

This design addresses two core capabilities:
1. **All-in-One Comprehensive Master Test Suite (`k6/suites/full.js`)**:
   A single, unified test suite executing all workloads simultaneously across specialized concurrent virtual user (VU) pools:
   - Frontend SSR and static asset delivery
   - High-concurrency database write transactions (authenticated voting and custom build creations)
   - Heavy query execution and catalog filtering
   - End-to-end user journeys (auth, profile, catalog exploration, randomizer, and streaks)
   The suite supports dynamic VU and duration configuration via CLI flags and environment variables (`-Vus`, `-Duration`, `K6_VUS`, `K6_DURATION`).
2. **Production-Grade Rich HTML Performance Dashboard (`k6/lib/report_helper.js`)**:
   A complete overhaul of the test report generator into a modern, user-friendly, self-contained, offline-compatible HTML dashboard displaying:
   - Executive SLA Pass/Fail Status Banner
   - Core KPI cards (Total Requests, Req/s, Max VUs, Failure Rate, Data Sent/Received)
   - Full latency percentile spectrum (Min, Median, Avg, p90, p95, p99, Max)
   - SLA Threshold Compliance Checklist with exact targets vs. measured results
   - Architectural Tier Breakdown Table (SSR vs. Writes vs. Queries vs. Static vs. Auth)
   - Self-contained SVG/CSS comparative latency bar charts
   - HTTP Status Code distribution bar

---

## 2. All-in-One Comprehensive Suite Architecture (`k6/suites/full.js`)

### 2.1 Concurrency & Scenario Allocation
Using Grafana k6's multi-scenario engine (`options.scenarios`), the suite creates 4 concurrent, independently running worker pools:

| Scenario Name | Role / Function | Default Share | Default VUs (of 40) |
| :--- | :--- | :--- | :--- |
| `frontend_browsers` | Browses SSR pages (`/`, `/perks`, `/characters`, `/randomizer`, `/smash-or-pass`) and static assets (`/favicon.ico`) | 25% | 10 VUs |
| `write_bots` | Rapid authenticated voting and custom build creation with read-after-write verification | 25% | 10 VUs |
| `query_scanners` | 100-item catalog filtering, prefix search autocompletes, and synergy calculations | 25% | 10 VUs |
| `journey_users` | Weighted end-to-end user journeys (browsing, searching, streaks, auth profiles) | 25% | 10 VUs |

### 2.2 Dynamic Configuration Interface
The script parses environment variables with sensible defaults:
- `K6_VUS` or `VUS`: Total number of virtual users across all pools (Default: `40`).
- `K6_DURATION` or `DURATION`: Run duration (Default: `'1m'`).
- Per-scenario overrides (optional):
  - `FRONTEND_VUS`: Explicit VU count for `frontend_browsers`.
  - `WRITE_VUS`: Explicit VU count for `write_bots`.
  - `QUERY_VUS`: Explicit VU count for `query_scanners`.
  - `JOURNEY_VUS`: Explicit VU count for `journey_users`.

If total `K6_VUS` is supplied without per-scenario overrides, VUs are automatically split evenly (with remainder assigned to `journey_users`).

### 2.3 Thresholds & SLAs
The suite enforces unified thresholds combining:
- `http_req_failed`: `['rate<0.01']`
- `http_req_duration`: `['p(95)<400']`
- `http_req_duration{type:ssr}`: `['p(95)<350']`
- `http_req_duration{type:static}`: `['p(95)<50']`
- `http_req_duration{type:write}`: `['p(95)<400']`
- `http_req_duration{type:query}`: `['p(95)<300']`

---

## 3. Rich HTML Performance Dashboard (`k6/lib/report_helper.js`)

### 3.1 Design Principles
- **Self-Contained & 100% Offline**: No external CDN scripts, remote fonts, or network dependencies.
- **Theme & Aesthetics**: LemonDBD Cyber Obsidian dark mode (`#0b0f19` canvas, `#111827` cards, `#1e293b` borders, amber `#f59e0b` accents, emerald `#10b981` pass, rose `#f43f5e` fail, cyan `#06b6d4` information).
- **High-Density, Intuitive Layout**: Structured for rapid executive review and deep technical triage.

### 3.2 Key Dashboard Sections
1. **Executive Header**:
   - Title: `LemonDBD Performance Benchmark Report`
   - Run Metadata: Suite name, timestamp, execution duration, test URL.
   - Status Pill: `PASSED` (emerald) or `FAILED` (rose).
2. **KPI Highlights Grid**:
   - `Total Requests`: Count + throughput (req/s).
   - `Peak Concurrency`: Max VUs active.
   - `Failure Rate`: Percentage with pass/fail indicator.
   - `Network I/O`: Total data sent and received.
3. **Response Time Percentile Spectrum**:
   - Table and visual meter: Min, Median (p50), Average, p90, p95, p99, and Max.
4. **SLA Threshold Compliance Checklist**:
   - Table displaying each evaluated threshold:
     - Metric & Tag
     - SLA Target (e.g. `p(95) < 400ms`)
     - Measured Value (e.g. `124.5ms`)
     - Status (`PASS` / `FAIL`)
5. **Architectural Tier Breakdown**:
   - Tabular breakdown of tagged workloads:
     - Frontend SSR (`type:ssr`)
     - Static Delivery (`type:static`)
     - Database Writes (`type:write`)
     - Heavy Queries (`type:query`)
     - Authentication (`auth_duration`)
   - Metrics: Request count, Avg duration, p95, p99, Failure rate.
6. **Pure CSS/SVG Comparative Bar Chart**:
   - Visual bars comparing p50, p95, and p99 across all architectural tiers.
7. **HTTP Status Code Breakdown**:
   - Summary and visual distribution bar: 2xx (Success), 3xx (Redirect), 4xx (Client Error), 5xx (Server Error).

---

## 4. Test Runner CLI Integration

All test runners (`up.ps1`, `up.sh`, `run_tests.py`, `package.json`) will support the `full` suite along with `-Vus` and `-Duration` parameters.

### 4.1 PowerShell (`up.ps1`)
```powershell
.\up.ps1 -Perf full
.\up.ps1 -Perf full -Vus 60 -Duration 2m
```
- Parameters:
  - `-Perf` switch or `-PerfSuite full`
  - `-Vus <int>` (maps to `K6_VUS`)
  - `-Duration <string>` (maps to `K6_DURATION`)

### 4.2 Bash (`up.sh`)
```bash
./up.sh -p full
./up.sh -p full -v 60 -d 2m
```
- Flags:
  - `-p|--perf full`
  - `-v|--vus <int>`
  - `-d|--duration <string>`

### 4.3 Python Orchestrator (`run_tests.py`)
```bash
py run_tests.py --perf full
py run_tests.py --perf full --vus 60 --duration 2m
```
- Arguments:
  - `--perf choices=[..., 'full']`
  - `--vus <int>`
  - `--duration <string>`

### 4.4 NPM Scripts (`k6/package.json`)
```bash
npm run perf:full
```

---

## 5. Verification Plan
1. **Sanity Verification**: Update `k6/lib/test_sanity.js` to validate `full` configurations and rich HTML generation.
2. **Live Suite Run**: Run `k6 run k6/suites/full.js --env K6_VUS=20 --env K6_DURATION=15s` against `http://localhost`.
3. **HTML Report Inspection**: Verify `k6/reports/full-report.html` renders all tables, SLA checklists, SVG charts, and KPI badges cleanly in offline mode.
4. **Runner Parity Verification**: Test CLI parameters on PowerShell, Bash, and Python runners with `-Vus` and `-Duration`.

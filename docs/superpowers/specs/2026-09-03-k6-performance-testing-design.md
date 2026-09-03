# System Design Specification: K6 Live Performance Testing Suite

**Date:** 2026-09-03  
**Project:** LemonDBD  
**Branch:** `feature/k6-performance-tests`  
**Status:** Approved  

---

## 1. Overview & Objectives

Implement a comprehensive, modular Grafana K6 performance testing suite to evaluate, benchmark, and optimize LemonDBD running live against the full Docker stack (Nginx, Backend Flask API, Frontend Next.js, PostgreSQL, Umami, PgAdmin).

### Key Constraints & Requirements:
1. **No Extra Docker Containers**: Keep the exact 6 core containers (`dbd_db`, `dbd_backend`, `dbd_frontend`, `dbd_nginx`, `dbd_umami`, `dbd_pgadmin`). K6 executes directly from the host (`k6.exe` on Windows, `k6` on Linux/macOS) targeting the live endpoints.
2. **Real-Life Traffic Scenarios**: Test authentic user journeys rather than synthetic repetitive GET loops, including catalog browsing with pagination/filters, search keystroke autocompletion, interactive Smash-or-Pass voting (database writes), randomizer calculations, and user authentication.
3. **Full Spectrum Load Profiles**: Support Smoke (1–2 VUs verification), Load (sustained peak daytime traffic), Stress (saturation and connection pool discovery), Spike (sudden surge recovery), and Soak (endurance and connection leak detection).
4. **First-Class Workflow Integration**: Integrate performance test execution into:
   - `up.ps1` via `-Perf` parameter
   - `up.sh` via `--perf` parameter
   - `run_tests.py` via `--perf [suite]` option
5. **Observability & HTML Dashboards**: Support K6's built-in real-time interactive web dashboard (`K6_WEB_DASHBOARD=true`) and automated standalone HTML/JSON report summaries.

---

## 2. Directory Structure

```text
k6/
├── config/
│   ├── env.js                # Dynamic target URLs (default: http://localhost, ports, overrides)
│   ├── thresholds.js         # SLA criteria (p95 latencies, failure rates, custom trends)
│   └── stages.js             # Stage definitions (smoke, load, stress, spike, soak)
├── lib/
│   ├── http_client.js        # Wrapped HTTP calls with tags, custom Trend timers, and assertions
│   ├── auth.js               # Dynamic virtual user registration/login, JWT bearer handling
│   ├── data_generator.js     # Authentic DBD queries, character names, perk filters, random picks
│   └── report_helper.js      # Bundled HTML and JSON summary generation
├── scenarios/
│   ├── browse_perks.js       # Browsing perks, details, pagination, language switches (40% load)
│   ├── search_autocomplete.js# Typing in perk/character search with debouncing (25% load)
│   ├── smash_or_pass.js      # Pair fetching, voting (DB write transaction), leaderboard (20% load)
│   ├── randomizer_streaks.js # Random loadout generation and streak challenge queries (10% load)
│   └── auth_profile.js       # Register, login, token refresh, and /api/v1/auth/me (5% load)
├── suites/
│   ├── smoke.js              # Sanity verification across all scenarios (1-2 VUs, 20s)
│   ├── load.js               # Multi-scenario realistic day traffic mix (up to 40 VUs, ~2m)
│   ├── stress.js             # Ramping concurrency up to 120-150 VUs to probe pool exhaustion
│   ├── spike.js              # Traffic shock (0 -> 120 VUs in 10s) and recovery verification
│   └── soak.js               # Steady endurance test (15-20 VUs, 5-10m)
└── reports/                  # Generated HTML/JSON reports (.gitignored)
```

---

## 3. Scenario Specifications

### 3.1 Catalog Explorer (`browse_perks.js`)
- **Flow**:
  1. `GET /api/v1/stats/summary` (initial vault stats cache)
  2. `GET /api/v1/perks?limit=50&category=survivor`
  3. `GET /api/v1/perks?limit=50&category=killer&lang=pl` (multilingual cache)
  4. `GET /api/v1/characters`
  5. `GET /api/v1/perks/{identifier}` (random perk selected from step 2)
  6. Think-time: `sleep(1 - 2.5s)`

### 3.2 Search & Autocomplete (`search_autocomplete.js`)
- **Flow**:
  - Simulates fast keystrokes into the search bar:
    1. `GET /api/v1/perks/suggestions?q=dead`
    2. `GET /api/v1/perks/suggestions?q=dead%20hard`
    3. `GET /api/v1/characters/suggestions?q=hunt`
  - High frequency, low latency target (`p95 < 120ms`).
  - Think-time: `sleep(0.3 - 0.8s)`.

### 3.3 Smash or Pass Mini-Game (`smash_or_pass.js`)
- **Flow**:
  1. `GET /api/v1/smash-or-pass/pair` (receives two character candidates)
  2. `POST /api/v1/smash-or-pass/vote` with `winner_id` and `loser_id` (tests Postgres write transactions)
  3. `GET /api/v1/smash-or-pass/leaderboard?limit=20`
  4. Think-time: `sleep(1 - 3s)`.

### 3.4 Randomizer & Streaks (`randomizer_streaks.js`)
- **Flow**:
  1. `GET /api/v1/generator/random?role=survivor&count=4`
  2. `GET /api/v1/generator/random?role=killer&count=4`
  3. `GET /api/v1/streaks/gauntlet`
  4. `GET /api/v1/streaks/chaos`
  5. Think-time: `sleep(1 - 2s)`.

### 3.5 Authentication & User Profile (`auth_profile.js`)
- **Flow**:
  1. Generate unique virtual user credentials (`k6_user_<VU>_<timestamp>@test.local`).
  2. `POST /api/v1/auth/register`
  3. `POST /api/v1/auth/login` -> extract Bearer JWT
  4. `GET /api/v1/auth/me` with `Authorization: Bearer <jwt>`
  5. Think-time: `sleep(2 - 4s)`.

---

## 4. Load Profiles & Concurrency Stages

| Suite | Purpose | Target VUs | Duration | Primary Thresholds |
|---|---|---|---|---|
| **Smoke** | Sanity & readiness | 1-2 | 20s | 100% checks pass, p95 < 200ms |
| **Load** | Real-world peak simulation | 0 -> 25 -> 40 -> 0 | ~2m | Failed < 1%, p95 < 300ms, p99 < 600ms |
| **Stress** | Breaking point & pool limit | 10 -> 50 -> 100 -> 150 | ~4m | No unhandled 500s; identify degradation plateau |
| **Spike** | Burst shock & buffer test | 0 -> 120 (10s) -> 10 | ~1m | System recovers quickly to baseline latency |
| **Soak** | Connection & memory stability | 15 steady | 5-10m | Consistent latency, 0 connection dropouts |

---

## 5. Tooling Integration

### 5.1 `up.ps1`
Add `-Perf` parameter:
```powershell
param (
    [Alias("s")] [switch]$Strict,
    [Alias("p")] [string]$Perf,
    [switch]$Down
)
```
When `-Perf` is supplied (e.g. `.\up.ps1 -Perf load` or `.\up.ps1 -Perf smoke`), the script verifies containers are UP, checks `k6` presence, and executes the specified K6 suite directly on the host.

### 5.2 `up.sh`
Add `-p | --perf [suite]` argument handling:
```bash
-p|--perf)
  PERF="$2"
  shift 2
  ;;
```
Executes the specified suite with `k6 run`.

### 5.3 `run_tests.py`
Add `--perf` CLI argument:
```bash
py run_tests.py --perf smoke
py run_tests.py --perf load
```
Orchestrates execution of the K6 suite, checks return codes, parses metric outcomes, and incorporates results into the `TEST EXECUTION SUMMARY` table.

---

## 6. Verification & Optimization Strategy

1. **Verify Stack Readiness**: Check backend health, Nginx proxy, and PostgreSQL connection.
2. **Execute Smoke Suite**: Ensure all 5 user scenarios pass with 0 errors.
3. **Execute Load Suite**: Measure p95, p99, and request throughput under realistic multi-user load.
4. **Profile & Optimize**:
   - Inspect Gunicorn worker/thread utilization under concurrency.
   - Inspect PostgreSQL query latency on `/api/v1/perks` and `/api/v1/smash-or-pass/vote`.
   - Verify Nginx loopback/private subnet exemption logic for rate limiting.
5. **Report Artifact**: Generate standalone HTML report and verify real-time dashboard functionality.

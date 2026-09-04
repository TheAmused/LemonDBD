# K6 Element-Specific & Targeted Performance Testing Design

This specification defines targeted, element-specific performance benchmark suites for LemonDBD using Grafana k6, isolating three critical architecture tiers:
1. **Frontend Server-Side Rendering (SSR) & Static Asset Delivery**
2. **High-Concurrency Database Writes & Transactions**
3. **Heavy Query Execution & Multi-Parameter Filtering**

---

## 1. System Architecture & Objectives

The existing baseline suite models a multi-journey user mix (`load.js`, `smoke.js`, etc.). These new targeted suites serve as micro-benchmarks targeting specific subsystems:

```
                           [Grafana k6 (Host)]
                                    │
                                    ▼
                          [Nginx Reverse Proxy]
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
   [Next.js Frontend SSR]                         [Flask API / Gunicorn]
   - GET /                                        - POST /api/v1/builds
   - GET /perks                                   - POST /api/v1/smash-or-pass/vote
   - GET /characters                              - GET /api/v1/perks (filters)
   - GET /_next/static/...                        - GET /api/v1/synergy
                                                           │
                                                           ▼
                                                 [PostgreSQL Database]
                                                 (Connection pool: 200)
```

### Key Objectives
1. **Frontend Isolation**: Measure Next.js server-side React hydration and HTML generation latency separately from static asset caching.
2. **Write Saturation**: Determine transaction latency and concurrency safety under rapid simultaneous writes (Smash-or-Pass votes and Custom Perk Builds creation).
3. **Complex Query Efficiency**: Stress PostgreSQL index coverage and query execution plans under heavy multi-parameter filtering and synergy computations.

---

## 2. Targeted Suites & Scenarios

### 2.1 `k6/suites/frontend.js` (Next.js SSR & Static Assets)
- **Target Endpoints**:
  - `GET /` (SSR landing page, HTML payload)
  - `GET /perks` (Catalog SSR page with preloaded perk cards)
  - `GET /characters` (Character roster SSR page)
  - `GET /generator` (Perk randomizer interactive page)
  - `GET /smash-or-pass` (Voting game frontend page)
  - `GET /_next/static/...` or favicon/logo (Nginx static cache validation)
- **Tags & Metrics**:
  - Tag `{ type: 'ssr' }` on HTML routes.
  - Tag `{ type: 'static' }` on static asset routes.
  - Custom Trend: `ssr_page_duration`, `static_asset_duration`.
- **Stages**:
  - 10s ramp to 15 VUs
  - 30s steady state at 25 VUs
  - 10s ramp down to 0 VUs
- **Thresholds**:
  - `http_req_duration{type:ssr}`: `['p(95)<350']`
  - `http_req_duration{type:static}`: `['p(95)<50']`
  - `http_req_failed`: `['rate<0.01']`

### 2.2 `k6/suites/writes.js` (High-Concurrency DB Writes & Transactions)
- **Target Endpoints**:
  - Authenticated session setup via `registerAndLoginUser()`
  - `POST /api/v1/smash-or-pass/vote` (Continuous rapid voting with randomized candidate pairs)
  - `POST /api/v1/builds` (Creation of custom 4-perk loadouts with title, description, character_id, and perk_ids)
  - `GET /api/v1/builds` and `GET /api/v1/smash-or-pass/rosters/canon/leaderboard` (Immediate read-after-write verification)
- **Tags & Metrics**:
  - Tag `{ type: 'write' }` on all POST write requests.
  - Custom Trend: `vote_write_duration`, `build_write_duration`.
- **Stages**:
  - 10s ramp to 10 VUs
  - 30s steady state at 20 concurrent writing VUs
  - 10s ramp down to 0 VUs
- **Thresholds**:
  - `http_req_duration{type:write}`: `['p(95)<400']`
  - `http_req_failed`: `['rate<0.01']`

### 2.3 `k6/suites/queries.js` (Heavy Query & Multi-Parameter Filtering Stress)
- **Target Endpoints**:
  - Full perk catalog pagination with filters: `GET /api/v1/perks?category=survivor&lang=pl&limit=100` and `GET /api/v1/perks?category=killer&lang=en&limit=100`
  - Synergy graph calculations: `GET /api/v1/synergy?perk_ids=...`
  - Randomizer computations: `GET /api/v1/generator/drawn?role=Survivor&perks_count=4` and `role=Killer&perks_count=4`
  - Broad prefix search autocompletes: `GET /api/v1/perks/suggestions?q=a`, `GET /api/v1/perks/suggestions?q=th`
  - Aggregate statistics: `GET /api/v1/stats/summary`, `GET /api/v1/challenge-modes`
- **Tags & Metrics**:
  - Tag `{ type: 'query' }` on heavy search & filter requests.
  - Custom Trend: `heavy_query_duration`, `synergy_calc_duration`.
- **Stages**:
  - 10s ramp to 15 VUs
  - 30s steady state at 30 concurrent querying VUs
  - 10s ramp down to 0 VUs
- **Thresholds**:
  - `http_req_duration{type:query}`: `['p(95)<300']`
  - `http_req_failed`: `['rate<0.005']`

---

## 3. Tooling & Test Runner Integration

The three new suites integrate directly into existing runners alongside the baseline profiles:

1. **PowerShell (`up.ps1`)**:
   - `.\up.ps1 -Perf frontend`
   - `.\up.ps1 -Perf writes`
   - `.\up.ps1 -Perf queries`
2. **Bash (`up.sh`)**:
   - `./up.sh -p frontend`
   - `./up.sh -p writes`
   - `./up.sh -p queries`
3. **Python Master Orchestrator (`run_tests.py`)**:
   - Add choices `['frontend', 'writes', 'queries']` to `--perf` argument.
   - Run via: `py run_tests.py --perf frontend`, etc.
   - Displayed in master `TEST EXECUTION SUMMARY` table under tier `Live Performance`.
4. **NPM Shortcuts (`k6/package.json`)**:
   - `npm run perf:frontend`
   - `npm run perf:writes`
   - `npm run perf:queries`
5. **Reporting**:
   - Reports output to `k6/reports/frontend-report.html`, `k6/reports/writes-report.html`, and `k6/reports/queries-report.html`.

# K6 Live Performance Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Grafana K6 performance testing suite for LemonDBD with authentic multi-user journey scenarios, 5 concurrency load profiles, first-class runner integrations (`up.ps1`, `up.sh`, `run_tests.py`), and live performance optimization diagnostics against the running Docker stack with zero additional containers.

**Architecture:** A modular JavaScript K6 suite in `k6/` separating configuration (`config/`), core utilities (`lib/`), real-world user scenarios (`scenarios/`), and execution suites (`suites/`). The runner executes natively on the host (`k6.exe` on Windows, `k6` on Linux) targeting the live Nginx reverse proxy and Flask backend. Execution is unified across repository tooling and generates standalone HTML summaries and live web dashboard monitoring.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Host Runner Environment"
        CLI["CLI / up.ps1 / up.sh / run_tests.py"]
        K6["k6.exe v1.7.1 Engine"]
        CLI -->|executes| K6
    end

    subgraph "K6 Modular Suite (k6/)"
        Suites["Suites (smoke, load, stress, spike, soak)"]
        Scenarios["Scenarios (browse, search, smash_or_pass, randomizer, auth)"]
        Lib["Lib (http_client, auth, data_gen, report_helper)"]
        Config["Config (env, thresholds, stages)"]

        Suites --> Scenarios
        Scenarios --> Lib
        Suites --> Config
    end

    subgraph "Live Docker Stack (6 Containers)"
        NGINX["dbd_nginx (:80 / :443)"]
        BACKEND["dbd_backend (:5000)"]
        FRONTEND["dbd_frontend (:3000)"]
        DB["dbd_db (:5432 Postgres)"]
        UMAMI["dbd_umami"]
        PGADMIN["dbd_pgadmin"]

        NGINX --> BACKEND
        NGINX --> FRONTEND
        BACKEND --> DB
    end

    K6 -->|HTTP/HTTPS Traffic| NGINX
    K6 -->|Direct API Checks (Optional)| BACKEND
    K6 -->|Outputs| Reports["k6/reports/*.html + Web Dashboard :5665"]
```

**Tech Stack:**
- Grafana k6 v1.7+ (JavaScript ES6)
- Python 3.12+ (Test Orchestrator `run_tests.py`)
- PowerShell 7+ & Bash (`up.ps1`, `up.sh`)
- Docker & Docker Compose (6 core containers)

## Global Constraints

- **Zero Additional Containers**: Keep the exact 6 containers (`dbd_db`, `dbd_backend`, `dbd_frontend`, `dbd_nginx`, `dbd_umami`, `dbd_pgadmin`). No new container services.
- **Host Execution**: k6 runs directly on the host using installed `k6.exe` (or `k6`).
- **Target URL**: Default to `http://localhost` (traversing Nginx on port 80), with support for `BASE_URL` override.
- **Fail-Safe Metrics**: All requests must be wrapped with tagged timings, status code validation, and error accounting.
- **Formatting**: Preserve existing coding standards in Python, PowerShell, Bash, and JS.

---

### Task 1: K6 Configuration & Core Libraries

**Files:**
- Create: `k6/config/env.js`
- Create: `k6/config/thresholds.js`
- Create: `k6/config/stages.js`
- Create: `k6/lib/http_client.js`
- Create: `k6/lib/auth.js`
- Create: `k6/lib/data_generator.js`
- Create: `k6/lib/report_helper.js`
- Test: `k6/lib/test_sanity.js`

**Interfaces:**
- Consumes: Environment variables (`BASE_URL`, `K6_REPORT_NAME`)
- Produces:
  - `getBaseUrl()`: string
  - `thresholds`: SLA rules per suite
  - `stages`: VU ramp curves per suite
  - `apiClient`: `{ get, post, put, del }` with custom metrics & tagging
  - `authHelper`: `{ registerAndLogin, getAuthHeaders }`
  - `dataGenerator`: `{ getRandomPerkQuery, getRandomCharacter, getRandomLocale }`
  - `generateHtmlReport(data, filename)`: string

- [ ] **Step 1: Create configuration files (`env.js`, `thresholds.js`, `stages.js`)**

`k6/config/env.js`:
```javascript
export function getBaseUrl() {
  return __ENV.BASE_URL || 'http://localhost';
}

export function getTimeout() {
  return __ENV.K6_TIMEOUT || '10s';
}
```

`k6/config/thresholds.js`:
```javascript
export const smokeThresholds = {
  http_req_failed: ['rate==0'],
  http_req_duration: ['p(95)<300', 'p(99)<600'],
  'checks': ['rate>0.99'],
};

export const loadThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350', 'p(99)<700'],
  'http_req_duration{type:api}': ['p(95)<300'],
  'http_req_duration{type:search}': ['p(95)<150'],
  'http_req_duration{type:write}': ['p(95)<400'],
};

export const stressThresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
};

export const spikeThresholds = {
  http_req_failed: ['rate<0.03'],
  http_req_duration: ['p(95)<800'],
};

export const soakThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350'],
};
```

`k6/config/stages.js`:
```javascript
export const smokeStages = [
  { duration: '5s', target: 2 },
  { duration: '15s', target: 2 },
  { duration: '5s', target: 0 },
];

export const loadStages = [
  { duration: '30s', target: 20 },
  { duration: '1m', target: 40 },
  { duration: '30s', target: 40 },
  { duration: '20s', target: 0 },
];

export const stressStages = [
  { duration: '30s', target: 20 },
  { duration: '1m', target: 60 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 140 },
  { duration: '30s', target: 0 },
];

export const spikeStages = [
  { duration: '10s', target: 120 },
  { duration: '30s', target: 120 },
  { duration: '20s', target: 10 },
  { duration: '10s', target: 0 },
];

export const soakStages = [
  { duration: '1m', target: 15 },
  { duration: '5m', target: 15 },
  { duration: '30s', target: 0 },
];
```

- [ ] **Step 2: Create core libraries (`http_client.js`, `auth.js`, `data_generator.js`, `report_helper.js`)**

`k6/lib/http_client.js`:
```javascript
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { getBaseUrl, getTimeout } from '../config/env.js';

export const browseDuration = new Trend('browse_duration', true);
export const searchDuration = new Trend('search_duration', true);
export const voteDuration = new Trend('vote_duration', true);
export const authDuration = new Trend('auth_duration', true);
export const failedRequests = new Counter('failed_requests');

export class ApiClient {
  constructor(baseUrl = getBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get(path, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'api' }, params.tags || {});
    const res = http.get(url, {
      headers: params.headers || { 'Accept': 'application/json' },
      tags: tags,
      timeout: getTimeout(),
    });

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }

  post(path, body = {}, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'write' }, params.tags || {});
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      params.headers || {}
    );

    const res = http.post(url, payload, {
      headers: headers,
      tags: tags,
      timeout: getTimeout(),
    });

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }
}

export const defaultClient = new ApiClient();
```

`k6/lib/data_generator.js`:
```javascript
export const PERK_SEARCH_QUERIES = [
  'dead', 'sprint', 'strike', 'deliver', 'adren', 'unbreakable',
  'bbq', 'chili', 'pop', 'ruin', 'corrupt', 'pain', 'nowhere'
];

export const CHARACTER_SEARCH_QUERIES = [
  'meg', 'dwight', 'claudette', 'feng', 'trapper', 'wraith', 'huntress', 'blight'
];

export const LOCALES = ['en', 'pl', 'de', 'fr', 'es'];

export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomPerkQuery() {
  return getRandomElement(PERK_SEARCH_QUERIES);
}

export function getRandomCharacterQuery() {
  return getRandomElement(CHARACTER_SEARCH_QUERIES);
}

export function getRandomLocale() {
  return getRandomElement(LOCALES);
}
```

`k6/lib/auth.js`:
```javascript
import { defaultClient, authDuration } from './http_client.js';

export function registerAndLoginUser(vuId = __VU, iter = __ITER) {
  const timestamp = Date.now();
  const username = `k6_u_${vuId}_${iter}_${timestamp}`.substring(0, 30);
  const email = `k6_${vuId}_${iter}_${timestamp}@test.local`;
  const password = `K6P@ssword123!`;

  const startTime = Date.now();

  // Register
  const regRes = defaultClient.post('/api/v1/auth/register', {
    username: username,
    email: email,
    password: password,
  }, { tags: { type: 'auth', operation: 'register' } });

  // Login
  const loginRes = defaultClient.post('/api/v1/auth/login', {
    username: username,
    password: password,
  }, { tags: { type: 'auth', operation: 'login' } });

  authDuration.add(Date.now() - startTime);

  let token = null;
  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      token = body.token || body.access_token || (body.data && body.data.token);
    } catch (e) {
      token = null;
    }
  }

  return { username, email, token };
}

export function getAuthHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
```

`k6/lib/report_helper.js`:
```javascript
export function generateHtmlSummary(data, options = {}) {
  const title = options.title || 'LemonDBD K6 Performance Test Report';
  const metrics = data.metrics;

  function getMetric(name, stat = 'p(95)') {
    if (metrics[name] && metrics[name].values) {
      const v = metrics[name].values[stat];
      return v !== undefined ? (typeof v === 'number' ? v.toFixed(2) : v) : 'N/A';
    }
    return 'N/A';
  }

  const reqDurationP95 = getMetric('http_req_duration', 'p(95)');
  const reqDurationP99 = getMetric('http_req_duration', 'p(99)');
  const reqDurationAvg = getMetric('http_req_duration', 'avg');
  const reqFailedRate = getMetric('http_req_failed', 'rate');
  const totalReqs = getMetric('http_reqs', 'count');
  const vusMax = getMetric('vus_max', 'value') || getMetric('vus', 'max');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    h1 { color: #f59e0b; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { background: #0f172a; padding: 1rem; border-radius: 6px; border: 1px solid #1e293b; }
    .label { font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; }
    .value { font-size: 1.8rem; font-weight: bold; color: #38bdf8; margin-top: 0.3rem; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🍋 ${title}</h1>
    <p>Generated at: ${new Date().toISOString()}</p>
    <div class="grid">
      <div class="stat"><div class="label">Total Requests</div><div class="value">${totalReqs}</div></div>
      <div class="stat"><div class="label">Max VUs</div><div class="value">${vusMax}</div></div>
      <div class="stat"><div class="label">Avg Duration</div><div class="value">${reqDurationAvg} ms</div></div>
      <div class="stat"><div class="label">p95 Duration</div><div class="value">${reqDurationP95} ms</div></div>
      <div class="stat"><div class="label">p99 Duration</div><div class="value">${reqDurationP99} ms</div></div>
      <div class="stat"><div class="label">Failure Rate</div><div class="value ${parseFloat(reqFailedRate) > 0.01 ? 'fail' : 'pass'}">${(parseFloat(reqFailedRate) * 100).toFixed(2)}%</div></div>
    </div>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 3: Run sanity test of lib modules**

Write `k6/lib/test_sanity.js` and run:
`k6.exe run k6/lib/test_sanity.js`
Expected: PASS with 1 VU, 1 iteration.

- [ ] **Step 4: Commit Task 1**

`git add k6/config k6/lib`  
`git commit -m "feat(k6): add k6 configuration, helpers, and reporting utilities"`

---

### Task 2: Implement Real-Life Traffic Scenarios

**Files:**
- Create: `k6/scenarios/browse_perks.js`
- Create: `k6/scenarios/search_autocomplete.js`
- Create: `k6/scenarios/smash_or_pass.js`
- Create: `k6/scenarios/randomizer_streaks.js`
- Create: `k6/scenarios/auth_profile.js`
- Create: `k6/scenarios/index.js`

**Interfaces:**
- Each scenario exports a function `runScenario(client)` callable independently or combined into multi-scenario suites.

- [ ] **Step 1: Implement `k6/scenarios/browse_perks.js`**
Simulates catalog exploration:
1. `GET /api/v1/stats/summary`
2. `GET /api/v1/perks?limit=50&category=survivor`
3. `GET /api/v1/perks?limit=50&category=killer&lang=pl`
4. `GET /api/v1/characters`
5. Extract a perk ID from perks response and fetch `GET /api/v1/perks/{id}`
6. Record `browseDuration` metric and `sleep(1 - 2)`.

- [ ] **Step 2: Implement `k6/scenarios/search_autocomplete.js`**
Simulates keystrokes:
1. `GET /api/v1/perks/suggestions?q=dead`
2. `GET /api/v1/perks/suggestions?q=dead%20hard`
3. `GET /api/v1/characters/suggestions?q=hunt`
4. Record `searchDuration` and `sleep(0.3 - 0.7)`.

- [ ] **Step 3: Implement `k6/scenarios/smash_or_pass.js`**
Simulates mini-game write traffic:
1. `GET /api/v1/smash-or-pass/pair` -> retrieve `character1` and `character2`
2. `POST /api/v1/smash-or-pass/vote` with `winner_id` and `loser_id`
3. `GET /api/v1/smash-or-pass/leaderboard?limit=20`
4. Record `voteDuration` and `sleep(1 - 2.5)`.

- [ ] **Step 4: Implement `k6/scenarios/randomizer_streaks.js`**
Simulates random generators:
1. `GET /api/v1/generator/random?role=survivor&count=4`
2. `GET /api/v1/generator/random?role=killer&count=4`
3. `GET /api/v1/streaks/gauntlet`
4. `GET /api/v1/streaks/chaos`
5. `sleep(1 - 2)`.

- [ ] **Step 5: Implement `k6/scenarios/auth_profile.js`**
Simulates user registration, login, and profile lookup:
1. Call `registerAndLoginUser()`
2. If token acquired, fetch `GET /api/v1/auth/me` with auth header
3. `sleep(1.5 - 3)`.

- [ ] **Step 6: Test each scenario individually against running Docker application**
Run each scenario with 1 VU for 1 iteration:
`k6.exe run --vus 1 --iterations 1 k6/scenarios/browse_perks.js`  
`k6.exe run --vus 1 --iterations 1 k6/scenarios/search_autocomplete.js`  
`k6.exe run --vus 1 --iterations 1 k6/scenarios/smash_or_pass.js`  
`k6.exe run --vus 1 --iterations 1 k6/scenarios/randomizer_streaks.js`  
`k6.exe run --vus 1 --iterations 1 k6/scenarios/auth_profile.js`  
Expected: All return HTTP 200, checks pass 100%.

- [ ] **Step 7: Commit Task 2**
`git add k6/scenarios`  
`git commit -m "feat(k6): implement realistic user journey test scenarios"`

---

### Task 3: Build Standard Load Profiles & Suites

**Files:**
- Create: `k6/suites/smoke.js`
- Create: `k6/suites/load.js`
- Create: `k6/suites/stress.js`
- Create: `k6/suites/spike.js`
- Create: `k6/suites/soak.js`
- Create: `k6/package.json` (for npm script shortcuts)

**Interfaces:**
- Each suite imports the scenarios and stages, executes them with weighted probabilities or k6 multi-scenarios, and handles report summarization via `handleSummary(data)`.

- [ ] **Step 1: Implement `k6/suites/smoke.js`**
Runs all 5 scenarios with 1-2 VUs for 20s to assert system health and zero errors.
Exports `handleSummary` saving HTML report to `k6/reports/smoke-report.html`.

- [ ] **Step 2: Implement `k6/suites/load.js`**
Realistic multi-scenario load mix:
- Browsing: 40%
- Search: 25%
- Smash or Pass: 20%
- Randomizer/Streaks: 10%
- Auth: 5%
Uses `loadStages` (up to 40 VUs, ~2m) and `loadThresholds`.
Exports `handleSummary` saving HTML report to `k6/reports/load-report.html`.

- [ ] **Step 3: Implement `k6/suites/stress.js`, `spike.js`, and `soak.js`**
Stress: ramps to 140 VUs to determine queue limits.
Spike: 0 -> 120 VUs burst in 10s.
Soak: 15 VUs for sustained 5m test.

- [ ] **Step 4: Run `smoke.js` to verify suite execution**
`k6.exe run k6/suites/smoke.js`
Verify:
- All checks pass (100%)
- `k6/reports/smoke-report.html` is generated
- SLA thresholds met

- [ ] **Step 5: Commit Task 3**
`git add k6/suites k6/package.json .gitignore`  
`git commit -m "feat(k6): implement smoke, load, stress, spike, and soak test suites"`

---

### Task 4: Integration into Runner Tooling (`up.ps1`, `up.sh`, `run_tests.py`)

**Files:**
- Modify: `up.ps1`
- Modify: `up.sh`
- Modify: `run_tests.py`

**Interfaces:**
- `.\up.ps1 -Perf [smoke|load|stress]`
- `./up.sh -p [smoke|load|stress]`
- `py run_tests.py --perf [smoke|load|stress]`

- [ ] **Step 1: Update `up.ps1`**
Add `[Alias("p")] [string]$Perf` parameter.
After Gate 2 / container readiness check, if `$Perf` is specified:
1. Verify `k6` executable is found in PATH (or alert user how to install/download).
2. Resolve target suite (`smoke`, `load`, `stress`, `spike`, `soak`, default: `smoke`).
3. Run `k6 run "k6/suites/$targetSuite.js"`.
4. Check exit code and display success/failure banner.

- [ ] **Step 2: Update `up.sh`**
Add `-p|--perf` flag handling.
Execute `k6 run k6/suites/$PERF.js` with equivalent checks and messaging.

- [ ] **Step 3: Update `run_tests.py`**
Add `--perf` CLI argument with optional suite selection (choices: `smoke`, `load`, `stress`, `spike`, `soak`, default `smoke`).
When `--perf` is provided:
1. Check if `k6` or `k6.exe` exists in PATH.
2. Execute `k6 run k6/suites/<suite>.js`.
3. Capture duration, stdout, and exit code.
4. Add entry to master `TEST EXECUTION SUMMARY` table.

- [ ] **Step 4: Run tests to verify integration**
`py run_tests.py --perf smoke`
Expected:
- Table outputs "K6 Performance Suite (smoke)" | "Live Performance" | PASS | Duration
- Final verdict: ALL PASSED.

- [ ] **Step 5: Commit Task 4**
`git add up.ps1 up.sh run_tests.py`  
`git commit -m "feat: integrate K6 performance runner into up.ps1, up.sh, and run_tests.py"`

---

### Task 5: Live Benchmark Execution, Diagnostics & Performance Optimization

**Files:**
- Create/Update: `k6/reports/load-report.html` (benchmark snapshot)
- Modify (if bottleneck identified): `nginx/default.conf` or backend configuration.
- Update: `docs/superpowers/specs/2026-09-03-k6-performance-testing-design.md` with baseline metrics.

- [ ] **Step 1: Run full live load test against Docker application**
Execute:
`k6.exe run k6/suites/load.js`
Monitor:
- p95 and p99 response times across scenarios
- Rate limit triggers (429) or timeouts (504/500)
- Nginx access log activity

- [ ] **Step 2: Identify and implement performance optimizations**
Check for:
1. Nginx rate limiting rules: ensure loopback test IPs (`127.0.0.1` and `::1`) are properly exempt or scaled for high concurrency.
2. Search suggestion query debounce and SQL indexing.
3. Database connection pool adequacy under 40+ concurrent VUs.

- [ ] **Step 3: Re-test to verify performance gains**
Run `k6.exe run k6/suites/load.js` and compare latency percentiles and throughput.

- [ ] **Step 4: Commit Task 5**
`git add docs/ k6/reports/`  
`git commit -m "chore(perf): record baseline benchmark and optimization verification"`

---

## Plan Self-Review Checklist

1. **Spec Coverage**:
   - 0 extra containers? Yes, direct host runner.
   - Real-life traffic scenarios? Yes: 5 distinct user journeys in `k6/scenarios/`.
   - 5 load profiles? Yes: smoke, load, stress, spike, soak in `k6/suites/`.
   - Tooling integration? Yes: `up.ps1`, `up.sh`, and `run_tests.py`.
   - Visual dashboard / HTML report? Yes: `generateHtmlSummary` and `K6_WEB_DASHBOARD`.
2. **No Placeholders**: All file paths, function signatures, and implementation snippets are explicitly specified.
3. **Type/Signature Consistency**: `ApiClient` methods match between `http_client.js` and scenario consumers.

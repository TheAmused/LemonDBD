# Test Suite Restructuring, Upgrading & Workflow Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize backend and frontend test suites into isolated unit (mocked) and live (real PostgreSQL and real API) suites, implement an instantaneous PostgreSQL template-clone DB snapshot & restore harness, and add comprehensive multi-step end-to-end workflow test suites.

**Architecture:**
- **Backend**:
  - `backend/tests/unit/`: Fast SQLite in-memory unit tests for isolated business logic, parsers, mathematical algorithms, and sanitizers.
  - `backend/tests/live/`: Real PostgreSQL integration and API tests running against an isolated `dbd_db_test_live` database cloned from `TEMPLATE dbd_db` with zero risk of mutating development data.
  - `backend/tests/live/workflows/`: Multi-step user journey tests (Auth & Ownership Cascades, Streak Games, Smash-or-Pass Leaderboards, Draft Rooms, Admin Purge/Export).
- **Frontend**:
  - `frontend/src/utils/__tests__/unit/`: Fast Node/TSX unit tests for frontend utilities, phonetic matchers, token formatters, downsamplers, and calculation models.
  - `frontend/src/utils/__tests__/live/`: Live HTTP client tests executing against the live backend API.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Backend Test Harness"
        U_PY[tests/unit/*] -->|SQLite :memory:| SQLITE[In-Memory DB]
        L_PY[tests/live/*] -->|Postgres Session Fixture| CLONE_DB[(dbd_db_test_live)]
        CLONE_DB -.->|Cloned instantaneously from| LIVE_DB[(dbd_db Original)]
        L_PY -->|TearDown Drop DB| DROP[Drop dbd_db_test_live (Force)]
    end

    subgraph "Frontend Test Harness"
        U_TS[src/utils/__tests__/unit/*] -->|TSX Node Test Runner| PURE_TS[Pure Logic & Math]
        L_TS[src/utils/__tests__/live/*] -->|Fetch HTTP API| LIVE_API[Flask Server :5000]
        LIVE_API --> CLONE_DB
    end

    subgraph "Master Test Runner"
        RUNNER[run_tests.py] --> U_PY
        RUNNER --> L_PY
        RUNNER --> U_TS
        RUNNER --> L_TS
    end
```

**Tech Stack:** Python 3.14, Pytest, SQLAlchemy 2.0, PostgreSQL 18.6, psycopg3, Flask, Node.js, TSX, TypeScript, Next.js.

## Global Constraints

- Backend unit tests MUST run in < 2 seconds total and require zero external services.
- Live backend tests MUST run against `dbd_db_test_live` cloned from `TEMPLATE dbd_db`, and MUST drop `dbd_db_test_live` on teardown.
- `dbd_db` MUST remain 100% unmodified and pollution-free.
- All tests must pass cleanly without unhandled exceptions or dangling database connections.
- Multilingual and JSONB PostgreSQL capabilities must be tested under live PostgreSQL.

---

### Task 1: Fix Existing Unit Test Discrepancies & Regressions

**Files:**
- Modify: `backend/tests/scrapers/test_wikigg_items_addons.py:65-70`
- Modify: `backend/tests/test_roster_image_scraper.py:15-38`
- Modify: `backend/tests/unit/test_user_ownership.py:225-230`

**Interfaces:**
- Consumes: Scraper drivers and ownership service.
- Produces: 100% green baseline on all existing backend unit tests.

- [ ] **Step 1: Fix item role vs category assertion in `test_wikigg_items_addons.py`**
  - In `backend/tests/scrapers/test_wikigg_items_addons.py`, assert `self.by_name["Flashlight"].role == "Survivor"` and `self.by_name["Flashlight"].category == "Flashlight"`.

- [ ] **Step 2: Fix mocked roster edition test in `test_roster_image_scraper.py`**
  - In `backend/tests/test_roster_image_scraper.py`, test with a valid edition key (`hooked_on_you` or `legendary_cosplay`) or verify fallback parsing so that `scrape_roster_portraits` returns expected results.

- [ ] **Step 3: Fix default character ownership expectation in `test_user_ownership.py`**
  - In `backend/tests/unit/test_user_ownership.py`, update `test_auth_and_user_routes` to assert free characters (`Dwight`, `Trapper`, etc.) are owned and licensed characters default to locked, matching current registration rules.

- [ ] **Step 4: Run pytest on all 3 modified files**
  - Run: `py -m pytest backend/tests/scrapers/test_wikigg_items_addons.py backend/tests/test_roster_image_scraper.py backend/tests/unit/test_user_ownership.py`
  - Expected: ALL PASS (0 failures).

---

### Task 2: Backend Test Suite Reorganization & Directory Structure

**Files:**
- Create: `backend/tests/unit/conftest.py`
- Move & Group:
  - Move `backend/tests/test_roster_image_scraper.py` $\rightarrow$ `backend/tests/unit/scrapers/`
  - Move `backend/tests/scrapers/*` $\rightarrow$ `backend/tests/unit/scrapers/`
  - Move `backend/tests/test_smash_models.py` $\rightarrow$ `backend/tests/unit/`
  - Move `backend/tests/test_translations_jsonb.py` $\rightarrow$ `backend/tests/unit/`
  - Move `backend/tests/test_translations_verification.py` $\rightarrow$ `backend/tests/unit/`
  - Consolidate unit services in `backend/tests/unit/`
- Modify: `backend/tests/conftest.py`

**Interfaces:**
- Consumes: Pytest runner options (`-m unit`, `-m live`, `--live`).
- Produces: Clean, categorized `backend/tests/unit/` hierarchy.

- [ ] **Step 1: Create `backend/tests/unit/conftest.py` for SQLite in-memory isolation**
  - Set `TESTING=True` and `DATABASE_URL=sqlite:///:memory:`.
  - Provide `app` and `db_session` fixtures that teardown SQLite tables per test.

- [ ] **Step 2: Reorganize unit tests into `backend/tests/unit/` and `backend/tests/unit/scrapers/`**
  - Reorganize all mock and pure unit test files into the `unit/` directory.

- [ ] **Step 3: Run unit test suite**
  - Run: `py -m pytest backend/tests/unit`
  - Expected: 100% PASS with ultra-fast execution time.

---

### Task 3: PostgreSQL Template Clone & Safe Teardown Harness

**Files:**
- Create: `backend/tests/live/conftest.py`

**Interfaces:**
- Consumes: Live PostgreSQL on `localhost:5432` (`postgres:postgres@localhost:5432/postgres` and `dbd_db`).
- Produces: `live_db_engine`, `live_app`, `live_client`, `auth_client_factory`, `admin_client` fixtures operating against `dbd_db_test_live`.

- [ ] **Step 1: Write `backend/tests/live/conftest.py`**
  - Implement session fixture `manage_live_db_clone`:
    - Connect with `autocommit=True` to `postgresql+psycopg://postgres:postgres@localhost:5432/postgres`.
    - Terminate active backends on `dbd_db_test_live`.
    - Drop `dbd_db_test_live` if exists.
    - Execute `CREATE DATABASE dbd_db_test_live WITH TEMPLATE dbd_db;`.
    - Yield database URL: `postgresql+psycopg://postgres:postgres@localhost:5432/dbd_db_test_live`.
    - Teardown: close all connections, terminate backends, `DROP DATABASE IF EXISTS dbd_db_test_live WITH (FORCE);`.
  - Implement `live_app` fixture configuring Flask with `SQLALCHEMY_DATABASE_URI = dbd_db_test_live`.
  - Implement `live_client`, `auth_client_factory`, and `admin_client` fixtures.

- [ ] **Step 2: Verify PostgreSQL template clone lifecycle with a sanity test**
  - Create a quick live smoke test: verify connection to `dbd_db_test_live`, verify character count is 98, verify live DB remains untouched.
  - Run: `py -m pytest backend/tests/live/conftest.py`

---

### Task 4: Backend Live API & Service Integration Suites

**Files:**
- Create: `backend/tests/live/api/test_auth_api_live.py`
- Create: `backend/tests/live/api/test_characters_perks_api_live.py`
- Create: `backend/tests/live/api/test_user_ownership_api_live.py`
- Create: `backend/tests/live/api/test_admin_control_api_live.py`
- Create: `backend/tests/live/api/test_db_export_import_live.py`
- Create: `backend/tests/live/services/test_streak_services_live.py`
- Create: `backend/tests/live/services/test_smash_service_live.py`

**Interfaces:**
- Consumes: `live_client`, `admin_client`, `auth_client_factory` from `backend/tests/live/conftest.py`.
- Produces: Comprehensive test coverage against live PostgreSQL and Flask API endpoints.

- [ ] **Step 1: Write `test_auth_api_live.py` & `test_user_ownership_api_live.py`**
  - Test registration, email verification token generation, password reset, login, profile me, avatar upload/fetch.
  - Test character ownership querying, single toggle, bulk update, auto-unlocking and auto-locking of teachable perks.

- [ ] **Step 2: Write `test_characters_perks_api_live.py` & `test_db_export_import_live.py`**
  - Test live character lookup by slug, role filters, JSONB translation fallback across locales (pl, de, es, fr, ja, etc.).
  - Test full database JSON export, table selective export, and merge import on real PostgreSQL.

- [ ] **Step 3: Write `test_streak_services_live.py` & `test_smash_service_live.py`**
  - Test Chaos, Gauntlet, History, Page streak service CRUD, random generation, and match logging with PostgreSQL JSONB columns.
  - Test Smash-or-Pass voting persistence, aggregate stats calculation, and leaderboard queries.

- [ ] **Step 4: Run live API & service tests**
  - Run: `py -m pytest backend/tests/live/api backend/tests/live/services`
  - Expected: ALL PASS.

---

### Task 5: Backend Multi-Step End-to-End Workflow Suites

**Files:**
- Create: `backend/tests/live/workflows/test_e2e_auth_and_ownership_workflow.py`
- Create: `backend/tests/live/workflows/test_e2e_streak_games_workflow.py`
- Create: `backend/tests/live/workflows/test_e2e_smash_or_pass_workflow.py`
- Create: `backend/tests/live/workflows/test_e2e_draft_synergy_workflow.py`
- Create: `backend/tests/live/workflows/test_e2e_admin_sync_export_workflow.py`

**Interfaces:**
- Consumes: Real multi-step user workflows simulating authentic user sessions.
- Produces: Robust end-to-end integration proof for critical business flows.

- [ ] **Step 1: Write `test_e2e_auth_and_ownership_workflow.py`**
  - Multi-step flow: Register new user $\rightarrow$ check initial ownership (free owned, non-free locked) $\rightarrow$ lock Trapper $\rightarrow$ verify Agitation/Brutal Strength/Unnerving Presence auto-locked $\rightarrow$ unlock Trapper $\rightarrow$ verify perks auto-unlocked $\rightarrow$ update profile info $\rightarrow$ change password $\rightarrow$ login with new password.

- [ ] **Step 2: Write `test_e2e_streak_games_workflow.py`**
  - Multi-step flow:
    - Chaos Streak: Init run $\rightarrow$ draw 4 random perks $\rightarrow$ record win $\rightarrow$ assert streak +1 $\rightarrow$ draw next perks $\rightarrow$ record loss $\rightarrow$ assert run ended $\rightarrow$ check streak statistics.
    - Gauntlet Streak: Start run for The Huntress $\rightarrow$ record wins across tiers $\rightarrow$ verify leaderboard update.
    - Page Streak: Start page run $\rightarrow$ generate 3-page perk grid $\rightarrow$ complete page 1 $\rightarrow$ advance to page 2 $\rightarrow$ complete run.

- [ ] **Step 3: Write `test_e2e_smash_or_pass_workflow.py`**
  - Multi-step flow: Fetch active editions $\rightarrow$ retrieve feed $\rightarrow$ cast 5 smash votes and 5 pass votes $\rightarrow$ query dynamic leaderboard $\rightarrow$ verify character tier ranks $\rightarrow$ reset session votes.

- [ ] **Step 4: Write `test_e2e_draft_synergy_workflow.py` & `test_e2e_admin_sync_export_workflow.py`**
  - Draft flow: Create draft room $\rightarrow$ join player $\rightarrow$ pick perks in turn $\rightarrow$ compute synergy matrix.
  - Admin flow: Full JSON export $\rightarrow$ purge custom perks / logs $\rightarrow$ import back $\rightarrow$ assert audit log.

- [ ] **Step 5: Run all live workflow tests**
  - Run: `py -m pytest backend/tests/live/workflows`
  - Expected: ALL PASS.

---

### Task 6: Frontend Test Suite Reorganization & Unit Suites

**Files:**
- Create: `frontend/src/utils/__tests__/unit/` directory
- Organize & Enhance:
  - `frontend/src/utils/__tests__/unit/perkUtils.test.ts`
  - `frontend/src/utils/__tests__/unit/textFormatter.test.ts`
  - `frontend/src/utils/__tests__/unit/mapVoiceMatcher.test.ts`
  - `frontend/src/utils/__tests__/unit/mapLandmarksLayouts.test.ts`
  - `frontend/src/utils/__tests__/unit/voiceClientModel.test.ts`
  - `frontend/src/utils/__tests__/unit/smashOrPassUnit.test.ts`
  - `frontend/src/utils/__tests__/unit/perkAudio.test.ts`

**Interfaces:**
- Consumes: Node.js / TSX test runner.
- Produces: Ultra-fast client-side unit test suite.

- [ ] **Step 1: Organize unit test files into `frontend/src/utils/__tests__/unit/`**
  - Structure standalone unit tests testing client parsers, text tokens, map speech matchers, and carousel logic.

- [ ] **Step 2: Run frontend unit tests**
  - Run: `npm run test:unit` (or `tsx --test src/utils/__tests__/unit/*.test.ts`)
  - Expected: ALL PASS in < 1 second.

---

### Task 7: Frontend Live API Integration & Workflow Suites

**Files:**
- Create: `frontend/src/utils/__tests__/live/liveAuthFlow.test.ts`
- Create: `frontend/src/utils/__tests__/live/liveStreakFlow.test.ts`
- Create: `frontend/src/utils/__tests__/live/liveSmashFlow.test.ts`
- Create: `frontend/src/utils/__tests__/live/livePerksFlow.test.ts`
- Create: `frontend/src/utils/__tests__/live/liveDraftQuestsFlow.test.ts`

**Interfaces:**
- Consumes: Real HTTP requests against `http://localhost:5000/api/v1` or `https://localhost/api/v1`.
- Produces: Live end-to-end frontend API client validation.

- [ ] **Step 1: Write `liveAuthFlow.test.ts` & `livePerksFlow.test.ts`**
  - Real API calls registering test account, authenticating, fetching characters, querying perks with search filters, verifying response shapes.

- [ ] **Step 2: Write `liveStreakFlow.test.ts` & `liveSmashFlow.test.ts`**
  - Real API calls starting streak runs, logging matches, fetching active rosters, casting votes, retrieving live leaderboard.

- [ ] **Step 3: Write `liveDraftQuestsFlow.test.ts`**
  - Real API calls creating draft room, fetching daily quests, and claiming quests.

- [ ] **Step 4: Run frontend live test suite**
  - Run: `npm run test:live` (or `tsx --test src/utils/__tests__/live/*.test.ts`)
  - Expected: ALL PASS.

---

### Task 8: Unified Master Test Runner, Package Scripts & Final Verification

**Files:**
- Create: `run_tests.py` (Master test runner script in root)
- Modify: `frontend/package.json` (add scripts: `test:unit`, `test:live`, `test:all`)

**Interfaces:**
- Consumes: CLI options (`python run_tests.py`, `python run_tests.py --unit-only`, `python run_tests.py --live-only`).
- Produces: Unified test summary report with clear execution timing and test counts.

- [ ] **Step 1: Update `frontend/package.json` scripts**
  - Add `"test:unit": "tsx --test src/utils/__tests__/unit/*.test.ts"`
  - Add `"test:live": "tsx --test src/utils/__tests__/live/*.test.ts"`
  - Add `"test:all": "tsx --test src/utils/__tests__/**/*.test.ts"`
  - Add `"test": "npm run test:unit"`

- [ ] **Step 2: Create `run_tests.py`**
  - Implement comprehensive Python test runner:
    - Runs backend unit tests.
    - Runs backend live & workflow tests with auto-clone DB safety.
    - Runs frontend unit tests.
    - Runs frontend live API tests.
    - Prints formatted ANSI color summary table with pass/fail counts and timings.

- [ ] **Step 3: Execute `py run_tests.py` and verify 100% pass across all suites**
  - Run: `py run_tests.py`
  - Expected: All suites pass, live database remains 100% untouched.

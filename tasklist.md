# LemonDBD Master Architectural Refactoring Tasklist

> **Status:** Approved for Execution  
> **Source Analysis:** [CODE_REVIEW_ANALYSIS.md](file:///c:/Users/bezie/Desktop/proje/LemonDBD/CODE_REVIEW_ANALYSIS.md)  
> **Target Baseline:** Next.js 16.3.4, React 19.2.8, Tailwind CSS 4.3.3, TypeScript 7.0.2 | Python 3.14, Flask 3.1.0, SQLAlchemy 2.0.38, psycopg 3.2.5, PostgreSQL 18.6 / 17.11, Redis 8.10  
> **Total Actionable Tasks:** 42 Tasks across 9 Thematic Tracks  

---

## Master Architecture & Global Constraints

### Tech Stack & Version Floors
- **Frontend:** Next.js 16.3.4 (Turbopack, Server-First RSC, Cache Components `'use cache'`, standalone runner), React 19.2.8, Tailwind CSS 4.3.3 (CSS-first `@import "tailwindcss";`), TypeScript 7.0.2, Sharp 0.35.4.
- **Backend:** Python 3.14-slim, Flask 3.1.0, Gunicorn 23.0.0 (gthread worker class), SQLAlchemy 2.0.38 (2.0 unified execution syntax), psycopg 3.2.5 (`postgresql+psycopg://`), Pydantic 2.10.6, orjson 3.10.0, Redis 5.0.0+, APScheduler 3.10.4.
- **Infrastructure:** Docker Compose, PostgreSQL (Alpine), Redis (Alpine, LRU eviction), pgAdmin 4 v9.18, Umami v3.4.0, CrowdSec v1.8.1.

### Global Architectural Guardrails
1. **Unidirectional Dependency Flow (Frontend):**  
   $$\text{App Router Pages } (\text{app/[locale]/...}) \longrightarrow \text{Domain Features } (\text{src/features/...}) \longrightarrow \text{Shared UI / Layout } (\text{src/components/ui/}) \longrightarrow \text{Core Lib } (\text{src/lib/})$$
   - Features must expose functionality exclusively through root `index.ts` barrel files.
   - Cross-feature deep internal imports (e.g. `@/features/perks/components/sub/Internal.tsx`) are strictly forbidden.
2. **Server-First Boundary Rule:**  
   Every Next.js route entrypoint (`page.tsx`) must be an async Server Component unless strictly impossible. Interactive hooks (`useState`, `useEffect`, `useActionState`) must be pushed down to leaf nodes.
3. **Database Unit of Work (Backend):**  
   `db.session.commit()` is strictly forbidden inside route controllers. All mutating database operations must be wrapped in service-level transaction blocks: `with db.session.begin():`.
4. **SQLAlchemy 2.0 Execution Model:**  
   Legacy `db.session.query(...)` is deprecated. All queries must use `db.session.scalar(select(...))` or `db.session.scalars(select(...))`.

---

## Track Overview & Progress Dashboard

| Track | Domain | Priority | Tasks Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Track 1** | [Infrastructure & Production Determinism](#track-1-infrastructure--production-determinism) | P0 / P1 | 6 Tasks | Pending |
| **Track 2** | [Backend Database, ORM & Query Performance](#track-2-backend-database-orm--query-performance) | P0 / P1 | 6 Tasks | Pending |
| **Track 3** | [Backend Route Controllers, Validation & API Contracts](#track-3-backend-route-controllers-validation--api-contracts) | P0 / P1 | 8 Tasks | Pending |
| **Track 4** | [Backend Architectural Refactoring & Vertical Slices](#track-4-backend-architectural-refactoring--vertical-slices) | P1 / P2 | 2 Tasks | Pending |
| **Track 5** | [Frontend High-ROI Dead Code & Route Redundancy Purge](#track-5-frontend-high-roi-dead-code--route-redundancy-purge) | P0 | 8 Tasks | Pending |
| **Track 6** | [Frontend Shared UI Primitives & Component Consolidation](#track-6-frontend-shared-ui-primitives--component-consolidation) | P1 | 6 Tasks | Pending |
| **Track 7** | [Frontend Core Utilities, Services & Type Safety](#track-7-frontend-core-utilities-services--type-safety) | P1 | 8 Tasks | Pending |
| **Track 8** | [Frontend Next.js 16 & React 19 RSC Optimization](#track-8-frontend-nextjs-16--react-19-rsc-optimization) | P1 / P2 | 6 Tasks | Pending |
| **Track 9** | [Frontend Feature Architecture & Directory Migration](#track-9-frontend-feature-architecture--directory-migration) | P1 / P2 | 5 Tasks | Pending |

---

## Track 1: Infrastructure & Production Determinism

### Task 1.1: Rebalance PostgreSQL Connection Pool Allocation
- **Priority:** P0 (Production Blocker)
- **Files Affected:**
  - `docker-compose.base.yml:7-13, 81-83`
  - `backend/app/core/config.py:127-133`
- **Problem:** Gunicorn runs 4 workers with `pool_size=20` and `max_overflow=30`, producing a peak demand of $4 \times (20 + 30) = 200$ connections. This saturates PostgreSQL's configured `max_connections=200`, causing Umami analytics and pgAdmin to crash with `FATAL: sorry, too many clients already`.
- **Implementation Steps:**
  - [ ] Set `DB_POOL_SIZE=10` and `DB_MAX_OVERFLOW=5` in `docker-compose.base.yml` (Peak backend connections: $4 \times 15 = 60$).
  - [ ] Update fallback defaults in `backend/app/core/config.py` to `pool_size=10`, `max_overflow=5`.
  - [ ] Verify 140 database connection headroom remains for Umami, pgAdmin, and database administrative maintenance.
- **Verification:** Run `docker compose config` and inspect environment variables.

### Task 1.2: Correct Docker PostgreSQL Data Volume Mount Path
- **Priority:** P1
- **Files Affected:**
  - `docker-compose.base.yml:15`
- **Problem:** PostgreSQL alpine image defines `PGDATA=/var/lib/postgresql/data`. The compose volume currently mounts `postgres_data:/var/lib/postgresql` (the parent directory), risking file permission conflicts during engine upgrades and init script execution.
- **Implementation Steps:**
  - [ ] Update volume target in `docker-compose.base.yml` to `postgres_data:/var/lib/postgresql/data`.
- **Verification:** Inspect container mount points via `docker inspect dbd_db`.

### Task 1.3: Pin Deterministic Container Image Tags for Production
- **Priority:** P1
- **Files Affected:**
  - `docker-compose.base.yml:4, 39, 116, 138`
  - `docker-compose.prod.yml:12`
- **Problem:** Compose files use floating tags (`postgres:alpine`, `redis:alpine`, `dpage/pgadmin4:latest`, `crowdsecurity/crowdsec:latest`, `umami:postgresql-latest`). Production rebuilds can pull breaking major version upgrades without notice.
- **Implementation Steps:**
  - [ ] Pin `image: postgres:18.6-alpine` (or `postgres:17.11-alpine` LTS).
  - [ ] Pin `image: redis:8.10-alpine`.
  - [ ] Pin `image: dpage/pgadmin4:9.18`.
  - [ ] Pin `image: crowdsecurity/crowdsec:v1.8.1`.
  - [ ] Pin `image: docker.umami.is/umami-software/umami:v3.4.0`.
- **Verification:** Run `docker compose -f docker-compose.base.yml -f docker-compose.prod.yml config`.

### Task 1.4: Decouple In-Process APScheduler from Gunicorn Web Workers
- **Priority:** P1
- **Files Affected:**
  - `backend/app/__init__.py:218-251`
  - `docker-compose.base.yml:100`
- **Problem:** `BackgroundScheduler(daemon=True)` runs inside `create_app()`. With 4 Gunicorn workers, 4 scheduler instances run in memory. The advisory lock (`SELECT pg_try_advisory_lock(8882027)`) is bypassed on SQLite in dev/tests, and worker recycles (`max_requests=1000`) cause missed triggers.
- **Implementation Steps:**
  - [ ] Create dedicated CLI runner: `backend/scripts/run_scheduler.py`.
  - [ ] Set `SCHEDULER_ENABLED=false` for the web backend container in `docker-compose.base.yml`.
  - [ ] Add standalone scheduler service definition in `docker-compose.base.yml` running `python scripts/run_scheduler.py`.
- **Verification:** Verify only 1 scheduler instance boots in the stack.

### Task 1.5: Fix Backend Startup Hook Regressions & Double Blueprint Registration
- **Priority:** P0
- **Files Affected:**
  - `backend/app/__init__.py:202-216`
- **Problem:** Line 203 registers `smash_or_pass_bp` twice (`smash_alias`), duplicating routing tables. Line 214 executes `perk_service.reload_data()` on application boot, despite the comment on lines 142–146 stating the secondary seeder was eliminated.
- **Implementation Steps:**
  - [ ] Remove line 203: `flask_app.register_blueprint(smash_or_pass_bp, url_prefix="/api/v1/smash", name="smash_alias")`. (Handle URL aliases via Nginx).
  - [ ] Remove lines 212–216: Redundant `perk_service.reload_data()` boot hook.
- **Verification:** Run `pytest backend/tests` to confirm route tests pass without double registration warnings.

### Task 1.6: Retire Manual SQLite DDL in Favor of SQLAlchemy Declarative Models
- **Priority:** P1
- **Files Affected:**
  - `backend/app/services/db/raw_schema.py` (366 lines)
  - `backend/app/services/db_service.py`
- **Problem:** 366 lines of hand-written SQL DDL in `raw_schema.py` duplicate SQLAlchemy models and suffer from continuous schema drift (as noted in lines 7–11 comments).
- **Implementation Steps:**
  - [ ] Deprecate `SQLITE_FALLBACK_DDL` and `init_raw_sqlite_schema()`.
  - [ ] Ensure `DatabaseService.init_db()` relies purely on SQLAlchemy `db.create_all()` / Alembic migrations.
  - [ ] Delete `backend/app/services/db/raw_schema.py`.
- **Verification:** Run backend test suite with SQLite in-memory database to verify clean creation via `db.create_all()`.

---

## Track 2: Backend Database, ORM & Query Performance

### Task 2.1: Eradicate 14 Legacy SQLAlchemy 1.x Query Invocations
- **Priority:** P0
- **Files Affected:**
  - `backend/app/routes/minigames.py:139, 167, 180, 198`
  - `backend/app/services/minigame_service.py:28`
  - `backend/app/services/minigames/catalog.py:27-30`
  - `backend/app/services/minigames/rounds.py:264, 324-327`
- **Problem:** 14 active instances use legacy `db.session.query(...)`, emitting deprecation warnings in SQLAlchemy 2.0.
- **Implementation Steps:**
  - [ ] Replace `db.session.query(Model).filter_by(...).first()` with `db.session.scalar(select(Model).where(...))`.
  - [ ] Replace `db.session.query(Model).all()` with `db.session.scalars(select(Model)).all()`.
  - [ ] Replace `db.session.query(Model).options(...)` with `db.session.scalars(select(Model).options(...)).all()`.
- **Verification:** Grep `backend/app/` for `db.session.query`; ensure zero occurrences remain.

### Task 2.2: Resolve Hidden N+1 Query Cascades on Model Serialization
- **Priority:** P1
- **Files Affected:**
  - `backend/app/models/equipment.py:108-109` (`Offering.category`)
  - `backend/app/models/map.py:145` (`Map.realm`)
  - `backend/app/models/smash_or_pass.py:295` (`Entity.stat`)
  - `backend/app/models/user.py:245-246, 306, 314` (`UserFavoritePerk.perk`, `UserProfile.mains`)
  - `backend/app/services/minigames/catalog.py:30` (Misuse of `joinedload` on 1:N collection)
- **Problem:** Accessing related entities in `to_dict()` triggers lazy-loaded SQL queries per serialized row (e.g. 65 queries for 65 offerings). In `catalog.py`, `joinedload(Realm.maps)` causes Cartesian duplicate row products.
- **Implementation Steps:**
  - [ ] Apply `joinedload` to To-One queries: `Offering.category`, `Map.realm`, `UserFavoritePerk.perk`, `UserProfile.survivor_main`, `UserProfile.killer_main`.
  - [ ] Replace `joinedload(Realm.maps)` with `selectinload(Realm.maps)` for collections.
  - [ ] Apply `selectinload` to `Entity.stat` or `Roster.entities`.
- **Verification:** Run query profiling or inspect SQL query count during `GET /api/v1/offerings` and `GET /api/v1/maps`.

### Task 2.3: Delete Dead Stale Query Module `services/perks/queries_map.py`
- **Priority:** P0
- **Files Affected:**
  - `backend/app/services/perks/queries_map.py` (70 lines)
  - `backend/app/services/perks/__init__.py`
- **Problem:** `services/perks/queries_map.py` is an unmaintained duplicate of `services/maps/queries.py` that lacks translation support and transaction rollback guards.
- **Implementation Steps:**
  - [ ] Update `backend/app/services/perks/__init__.py` to import `fetch_maps` from `app.services.maps.queries`.
  - [ ] Delete `backend/app/services/perks/queries_map.py`.
- **Verification:** Confirm all map endpoints and tests resolve correctly.

### Task 2.4: Eliminate Redundant Model Serializers in `services/db/serializers.py`
- **Priority:** P1
- **Files Affected:**
  - `backend/app/services/db/serializers.py` (349 lines)
  - `backend/app/services/db/export_service.py`
- **Problem:** 349 lines manually mirror model column serialization already implemented in model `to_dict()` methods.
- **Implementation Steps:**
  - [ ] Refactor consumers of `serializers.py` to use `model.to_dict()` or Pydantic DTOs.
  - [ ] Delete `backend/app/services/db/serializers.py`.
- **Verification:** Run database export/backup test to verify exported JSON payloads match expected schemas.

### Task 2.5: Implement Shared `TranslatableModelMixin` for Translation Resolution
- **Priority:** P1
- **Files Affected:**
  - `backend/app/models/base.py`
  - `backend/app/models/character.py`, `perk.py`, `equipment.py`, `map.py`, `smash_or_pass.py`, `chapter.py`, `tier_list.py`
- **Problem:** 7 model files repeat identical dictionary lookup boilerplate: `if lang and self.translations and lang in self.translations: ...`.
- **Implementation Steps:**
  - [ ] Define `TranslatableModelMixin` in `backend/app/models/base.py` with `get_translation(lang)` and `localized(lang, field, fallback)`.
  - [ ] Inherit mixin across `Survivor`, `Killer`, `Perk`, `Item`, `KillerAddon`, `ItemAddon`, `Offering`, `MapRealm`, `Chapter`, `Entity`, `Roster`.
  - [ ] Remove duplicate boilerplate from models.
- **Verification:** Run test suite asserting localized perk/character queries return translated names.

### Task 2.6: Adopt `ColumnDictMixin` Across 25+ Core Domain Models
- **Priority:** P1
- **Files Affected:**
  - `backend/app/models/base.py`
  - Core models in `admin.py`, `changelog.py`, `chapter.py`, `character.py`, `community.py`, `equipment.py`, `map.py`, `minigame.py`, `perk.py`, `smash_or_pass.py`, `tier_list.py`, `user.py`
- **Problem:** `ColumnDictMixin` exists in `base.py` but is only adopted by streak models. 25+ models hand-code repetitive `to_dict()` column mapping.
- **Implementation Steps:**
  - [ ] Have domain models inherit `ColumnDictMixin`.
  - [ ] Add `_api_exclude = frozenset({"password_hash", ...})` for sensitive or internal fields.
  - [ ] Simplify or remove hand-written `to_dict()` methods where custom logic is not needed.
- **Verification:** Assert model serialization output equality before and after mixin adoption.

---

## Track 3: Backend Route Controllers, Validation & API Contracts

### Task 3.1: Extract Admin Database Operations from `users.py` into Admin Domain
- **Priority:** P1
- **Files Affected:**
  - `backend/app/routes/users.py:201-352`
  - `backend/app/routes/admin_control.py`
- **Problem:** `users.py` contains 4 administrative endpoints (`/admin/stats`, `/admin/database/purge`, `/admin/database/export`, `/admin/database/import`), directly deleting tables and streaming backups.
- **Implementation Steps:**
  - [x] Move `/admin/stats` and `/admin/database/*` endpoints into `backend/app/routes/admin_control.py` (or new `admin_database.py`).
  - [x] Remove unused database model imports from `users.py`.
  - [x] Update frontend admin API client endpoints if URL paths changed.
- **Verification:** Verify admin workbench database purge/export actions succeed via integration tests.

### Task 3.2: Standardize API Error Response Envelope
- **Priority:** P1
- **Files Affected:**
  - `backend/app/utils/responses.py` (Create)
  - `backend/app/routes/smash_or_pass.py`, `users.py`, `auth.py`, `minigames.py`, `page_streak.py`
- **Problem:** Error responses vary between `{"error": msg}`, `{"error": msg, "status": code}`, `{"status": "error", "message": msg}`, and `api_i18n` shapes.
- **Implementation Steps:**
  - [x] Create `api_error(message: str, status_code: int = 400, code: str | None = None)` in `app/utils/responses.py`.
  - [x] Standardize shape: `{"error": str, "status": int, "code": str | None}`.
  - [x] Replace ad-hoc `jsonify({"error": ...}), code` calls across route handlers.
- **Verification:** Verify frontend error handlers receive uniform JSON response envelopes.

### Task 3.3: Refactor `page_streak.py` to Adopt `make_streak_blueprint`
- **Priority:** P1
- **Files Affected:**
  - `backend/app/routes/page_streak.py` (140 lines)
  - `backend/app/core/streak_blueprint.py`
- **Problem:** `page_streak.py` manually hand-rolls `get_run()`, `abandon_run()`, `get_stats()`, and `get_completions()`, duplicating 70+ lines implemented in `make_streak_blueprint`.
- **Implementation Steps:**
  - [x] Use `make_streak_blueprint` to construct `page_streak_bp` with `param_name="killer"`.
  - [x] Retain only page-streak exclusive custom endpoints (`/roster`, `/pool`, `/run/start`).
- **Verification:** Run streak API tests; verify page streak run lifecycle endpoints function identically.

### Task 3.4: Enforce Centralized `paginate_args()` Across All List Endpoints
- **Priority:** P1
- **Files Affected:**
  - `backend/app/utils/pagination.py`
  - `backend/app/routes/maps.py`, `minigames.py`, `smash_or_pass.py`, `page_streak.py`
- **Problem:** Multiple routes manually parse `request.args.get('page')` with raw `int()` casts and `ValueError` blocks instead of `paginate_args(default_per_page=20, max_per_page=100)`.
- **Implementation Steps:**
  - [x] Replace manual pagination parameter parsing with `paginate_args()` in `maps.py`, `minigames.py`, and `smash_or_pass.py`.
- **Verification:** Test boundary pagination queries (e.g. `?page=-1`, `?per_page=9999`) to confirm graceful clamping.

### Task 3.5: Enforce Centralized `extract_lang()` Across Route Blueprints
- **Priority:** P1
- **Files Affected:**
  - `backend/app/utils/lang.py`
  - `backend/app/routes/users.py`, `smash_or_pass.py`
- **Problem:** Endpoints in `users.py` read bare `request.args.get("lang")`, ignoring locale context in `Referer` path headers.
- **Implementation Steps:**
  - [x] Replace bare `request.args.get("lang")` with `extract_lang(request)` across all blueprints.
- **Verification:** Verify localized data is returned when requesting from `/pl/...` without explicit `?lang=pl` query param.

### Task 3.6: Enforce Pydantic v2 Request DTO Validation Across 9 Bypassed Routes
- **Priority:** P1
- **Files Affected:**
  - `backend/app/schemas/`
  - `backend/app/routes/minigames.py`, `page_streak.py`, `gauntlet_streak.py`, `chaos_streak.py`, `history_streak.py`, `admin_control.py`, `synergy.py`, `auth_google.py`, `auth_two_factor.py`
- **Problem:** 9 route files parse raw JSON with `request.get_json()` with manual checks, allowing unvalidated types into services and databases.
- **Implementation Steps:**
  - [x] Define Pydantic v2 request DTO schemas for minigames (`MinigameScoreSubmissionDTO`), streaks (`StreakRunActionDTO`), synergy, and 2FA.
  - [x] Validate request body with `schema.model_validate(request.get_json(silent=True) or {})`.
  - [x] Return uniform validation error envelope on `pydantic.ValidationError`.
- **Verification:** Submit malformed JSON to each route and confirm HTTP 422 / 400 validation response.

### Task 3.7: Centralize Image URL Validation in Schemas via Annotated Types
- **Priority:** P2
- **Files Affected:**
  - `backend/app/schemas/common.py`
  - `backend/app/schemas/tier_list.py`, `smash_or_pass.py`
- **Problem:** 6 schema models repeat `@field_validator("cover_image_url")` calling `clean_image_url(v)`.
- **Implementation Steps:**
  - [x] Create `CleanImageUrl = Annotated[str | None, BeforeValidator(clean_image_url)]` in `schemas/common.py`.
  - [x] Replace repeated `@field_validator` definitions across `tier_list.py` and `smash_or_pass.py`.
- **Verification:** Run schema test suite verifying base64 and URL image cleaning.

### Task 3.8: Standardize Unit of Work Transaction Boundaries (`with db.session.begin():`)
- **Priority:** P1
- **Files Affected:**
  - `backend/app/routes/users.py:267`, `routes/minigames.py:160`
  - `backend/app/services/`
- **Problem:** Direct calls to `db.session.commit()` are scattered in route controllers and helper functions, breaking atomicity and causing connection leaks on exceptions.
- **Implementation Steps:**
  - [x] Remove `db.session.commit()` from all route handlers.
  - [x] Wrap service mutating workflows in context-managed transactions: `with db.session.begin():`.
- **Verification:** Test rollback behavior: force an exception during a multi-table mutation and verify zero partial records persist.


---

## Track 4: Backend Architectural Refactoring & Vertical Slices

### Task 4.1: Deprecate Monolithic Class Facades in Favor of Domain Package Functions
- **Priority:** P1
- **Files Affected:**
  - `backend/app/services/user_service.py` (161 lines) vs `services/user/`
  - `backend/app/services/perk_service.py` (143 lines) vs `services/perks/`
  - `backend/app/services/page_streak_service.py` (104 lines) vs `services/page_streak/`
  - `backend/app/services/minigame_service.py` (76 lines) vs `services/minigames/`
- **Problem:** Thin class facades simply wrap and forward method calls to modular package functions, adding cognitive indirection without OOP benefits.
- **Implementation Steps:**
  - [ ] Refactor blueprints to import functions directly from domain service packages (e.g. `from app.services.user.profile import get_user_showcase`).
  - [ ] Deprecate and remove the 4 facade class files.
- **Verification:** Run `pytest backend/` to ensure all service callers operate cleanly.

### Task 4.2: Transition Backend to Vertical Slices Architecture (`app/features/`)
- **Priority:** P2
- **Files Affected:**
  - `backend/app/models/`, `routes/`, `schemas/`, `services/` $\longrightarrow$ `backend/app/features/`
- **Problem:** Horizontal "package-by-type" layering forces developers to navigate across 5 separate directories to touch a single feature.
- **Implementation Steps:**
  - [ ] Create `backend/app/features/` with domains: `auth`, `characters`, `perks`, `maps`, `smash_or_pass`, `streaks`, `minigames`, `tier_lists`, `users`, `admin`.
  - [ ] Move corresponding `routes.py`, `services.py`, `models.py`, `schemas.py` into their respective feature folders.
  - [ ] Retain shared database engines, extensions, security, and base models in `backend/app/core/`.
  - [ ] Register feature blueprints centrally in `backend/app/__init__.py`.
- **Verification:** Run full backend test suite (`pytest`) to ensure all route and model imports resolve.

---

## Track 5: Frontend High-ROI Dead Code & Route Redundancy Purge

### Task 5.1: Purge Dead `import type { Dictionary }` Across 129 Files
- **Priority:** P0
- **Files Affected:**
  - 129 files across `frontend/src/` (e.g. `about/page.tsx`, `characters/page.tsx`, `Sidebar.tsx`, etc.)
- **Problem:** 129 files import `Dictionary` from `@/locales/types` without ever using it as a type annotation, because `dict: Dictionary` is automatically inferred from `useDictionary()`.
- **Implementation Steps:**
  - [ ] Remove `import type { Dictionary } from '@/locales/types';` from all 129 verified files where `Dictionary` is not used in type signatures.
  - [ ] Verify that the 21 files that actually annotate with `Dictionary` (e.g. `legalDocs.ts`, `shelves.ts`) retain their import.
- **Verification:** Run `npm run check` and `npx tsc --noEmit` in `frontend/`.

### Task 5.2: Delete 19 Sub-Route Passthrough `layout.tsx` Files
- **Priority:** P0
- **Files Affected:**
  - 19 files: `about/layout.tsx`, `achievements/layout.tsx`, `admin/layout.tsx`, `characters/layout.tsx`, `maps/layout.tsx`, `minigames/layout.tsx`, `minigames/creator/layout.tsx`, `minigames/idle/layout.tsx`, `perks/layout.tsx`, `privacy-policy/layout.tsx`, `randomizer/layout.tsx`, `reset-password/layout.tsx`, `rules/layout.tsx`, `smash-or-pass/layout.tsx`, `streaks/layout.tsx`, `terms-of-service/layout.tsx`, `tier-lists/layout.tsx`, `user/layout.tsx`, `welcome/layout.tsx`.
- **Problem:** Each file is an 8-line passthrough returning `<>{children}</>` and exporting `generateMetadata = pageMetadata(...)`. This creates an unnecessary React tree layer.
- **Implementation Steps:**
  - [ ] Move `export const generateMetadata = pageMetadata(...)` into the corresponding `page.tsx`.
  - [ ] Delete all 19 redundant `layout.tsx` files.
- **Verification:** Run `npm run test:guards` to verify the `i18n hygiene: page metadata` guard test passes (`every page has a title source`).

### Task 5.3: Delete 3 Duplicate `loading.tsx` Files in Tier Lists
- **Priority:** P0
- **Files Affected:**
  - `frontend/src/app/[locale]/tier-lists/custom/[id]/loading.tsx`
  - `frontend/src/app/[locale]/tier-lists/new/loading.tsx`
  - `frontend/src/app/[locale]/tier-lists/[slug]/loading.tsx`
- **Problem:** All 3 child files are byte-for-byte identical to the parent `app/[locale]/tier-lists/loading.tsx`. Next.js automatically cascades parent loading skeletons to child routes.
- **Implementation Steps:**
  - [ ] Delete `custom/[id]/loading.tsx`, `new/loading.tsx`, and `[slug]/loading.tsx`.
  - [ ] Keep `tier-lists/loading.tsx` as the single source of truth.
- **Verification:** Run `npm run test:guards` to confirm `structure: route-level loading UI` passes.

### Task 5.4: Standardize Hand-Rolled Skeletons on `<PageShellFallback />`
- **Priority:** P0
- **Files Affected:**
  - `frontend/src/app/[locale]/characters/[slug]/loading.tsx`
  - `frontend/src/app/[locale]/smash-or-pass/loading.tsx`
  - `frontend/src/app/[locale]/streaks/loading.tsx`
- **Problem:** These 3 files manually hardcode 15+ lines of sidebar and mobile spacer HTML instead of consuming `PageShellFallback`.
- **Implementation Steps:**
  - [ ] Refactor `characters/[slug]/loading.tsx` to render `<PageShellFallback skeleton={<CharacterDetailSkeleton />} />`.
  - [ ] Refactor `smash-or-pass/loading.tsx` to use `<PageShellFallback skeleton={<...>} />`.
  - [ ] Refactor `streaks/loading.tsx` to use `<PageShellFallback skeleton={<...>} />`.
- **Verification:** Visually inspect route transitions or run `npm run check:styles`.

### Task 5.5: Consolidate Streaks Route Duplication via Dynamic Role Slugs
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/app/[locale]/streaks/killer/gauntlet-streak/page.tsx`
  - `frontend/src/app/[locale]/streaks/survivor/gauntlet-streak/page.tsx`
  - `frontend/src/app/[locale]/streaks/killer/page.tsx`
  - `frontend/src/app/[locale]/streaks/survivor/page.tsx`
  - `frontend/src/app/[locale]/streaks/challenge/page.tsx`
- **Problem:** `killer/gauntlet-streak` and `survivor/gauntlet-streak` are identical files differing only by the string prop `"killer"` vs `"survivor"`.
- **Implementation Steps:**
  - [ ] Create `app/[locale]/streaks/[role]/gauntlet-streak/page.tsx` validating `role in ['killer', 'survivor']` with `notFound()` on invalid slug.
  - [ ] Create `app/[locale]/streaks/[role]/page.tsx` handling `'killer'`, `'survivor'`, and `'challenge'`.
  - [ ] Delete the static duplicated folders.
- **Verification:** Navigate to `/en/streaks/killer/gauntlet-streak` and `/en/streaks/survivor/gauntlet-streak` to confirm identical behavior.

### Task 5.6: Replace Repetitive `useParams()?.locale` Boilerplate with `useLocale()`
- **Priority:** P0
- **Files Affected:**
  - 19 files: `characters/[slug]/page.tsx`, `about/page.tsx`, `achievements/page.tsx`, `characters/page.tsx`, `maps/page.tsx`, `perks/page.tsx`, `privacy-policy/page.tsx`, `randomizer/page.tsx`, `reset-password/page.tsx`, `smash-or-pass/page.tsx`, `smash-or-pass/create/page.tsx`, `streaks/page.tsx`, `user/page.tsx`, `welcome/page.tsx`, `CharactersHub.tsx`, `Sidebar.tsx`, `HomePage.tsx`, `StreaksLayoutShell.tsx`, `TwoFactorSection.tsx`.
- **Problem:** All 19 files execute verbose array checking and casting: `const rawLocale = params?.locale; const locale = (Array.isArray(rawLocale) ? rawLocale[0] : rawLocale || 'en') as Locale;`.
- **Implementation Steps:**
  - [ ] Replace manual parameter parsing in client components with `const locale = useLocale();` imported from `@/context/DictionaryContext`.
- **Verification:** Run `npx tsc --noEmit` and `npm run check`.

### Task 5.7: Delete Unused Route Handler `app/api/proxy-image/route.ts`
- **Priority:** P0
- **Files Affected:**
  - `frontend/src/app/api/proxy-image/route.ts` (91 lines)
- **Problem:** `CoverImageCropModal.tsx` calls backend Flask `/api/v1/smash-or-pass/proxy-image`. The Next.js Route Handler is 100% unused dead code.
- **Implementation Steps:**
  - [ ] Delete `frontend/src/app/api/proxy-image/route.ts`.
  - [ ] Confirm no other frontend file references `/api/proxy-image`.
- **Verification:** Grep `proxy-image` across `frontend/src/` to confirm zero broken links.

### Task 5.8: Consolidate Trivial Roster Hook Wrappers into `useOwnedRoster.ts`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/streaks/useOwnedRoster.ts`
  - `frontend/src/components/streaks/gauntlet/useOwnedCharacters.ts` (16 lines)
  - `frontend/src/components/streaks/chaos/useOwnedKillers.ts` (13 lines)
- **Problem:** Two separate files exist solely to wrap `useOwnedRoster` in a single-line `map(c => c.name)`.
- **Implementation Steps:**
  - [ ] Export `useOwnedKillers` and `useOwnedCharacters` directly from `useOwnedRoster.ts`.
  - [ ] Update imports in `ActiveTargetStageParts.tsx`, `KillerPickerGrid.tsx`, etc.
  - [ ] Delete the two trivial wrapper files.
- **Verification:** Run `npx tsc --noEmit`.

---

## Track 6: Frontend Shared UI Primitives & Component Consolidation

### Task 6.1: Build Unified `<PerkIcon />` Component & Replace 17 Duplicate Fallbacks
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/ui/PerkIcon.tsx` (Create)
  - 17 files: `PerkCard.tsx`, `PerkModal.tsx`, `ChaosPerkPoolModal.tsx`, `KillerPickerGrid.tsx`, `SlotMachineStage.tsx`, `ActiveTargetStageParts.tsx`, `HistoryNextRowPreview.tsx`, `HistoryPerkModal.tsx`, `HistoryPerkPoolPanel.tsx`, `BuildPanel.tsx`, `KillerRosterGrid.tsx`, `PerkTile.tsx`, `TierItemTile.tsx`, `DownloadDataSection.tsx`, `MainCard.tsx`, `PerkDiamondSlot.tsx`, `ShowcasePerkModal.tsx`.
- **Problem:** 17 components independently maintain `const [failed, setFailed] = useState(false)` with `onError` image handlers and fallback icons.
- **Implementation Steps:**
  - [ ] Author `PerkIcon` in `components/ui/PerkIcon.tsx` accepting `perk`, `size`, `fallbackIcon`, `className`.
  - [ ] Replace custom fallback logic across all 17 components.
- **Verification:** Verify perk rendering and fallback display across perk catalog, tier lists, and streak modes.

### Task 6.2: Unify `SegmentedControl` Implementations
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/common/SegmentedControl.tsx`
  - `frontend/src/components/generator/shared/SegmentedControl.tsx`
  - `frontend/src/components/generator/shared/ModeSwitcher.tsx`
- **Problem:** Two distinct `SegmentedControl` components exist with conflicting feature sets (sliding thumb vs underline `bare` mode, `Tooltip` support).
- **Implementation Steps:**
  - [ ] Add `variant?: 'pill' | 'underline'` and `tooltip?: { title?: string; description: string }` support to `components/common/SegmentedControl.tsx`.
  - [ ] Migrate `ModeSwitcher.tsx` to the unified component.
  - [ ] Delete `frontend/src/components/generator/shared/SegmentedControl.tsx`.
- **Verification:** Verify map explorer and randomizer tab switching behave smoothly.

### Task 6.3: Consolidate Button Implementations into Unified `<Button />`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/common/Button.tsx`
  - `frontend/src/components/generator/shared/DbdButton.tsx`
- **Problem:** `DbdButton.tsx` duplicates `Button.tsx` primary styling (`bg-accent-red`, uppercase, sizing scales). Multiple modals also bypass both and use raw `<button className="... bg-accent-red ...">`.
- **Implementation Steps:**
  - [ ] Support `roleAccent?: 'Survivor' | 'Killer'` focus tint in `components/common/Button.tsx`.
  - [ ] Replace `DbdButton` usages across randomizer components with `<Button variant="primary">`.
  - [ ] Deprecate and delete `DbdButton.tsx`.
- **Verification:** Run `npm run test:guards` (`ui: shared primitives`).

### Task 6.4: Unify Perk Diamond Slot Containers into `<DiamondSlot />`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/ui/DiamondSlot.tsx` (Create)
  - `frontend/src/components/user/PerkDiamondSlot.tsx`
  - `frontend/src/components/streaks/page-streak/PerkTile.tsx`
  - `frontend/src/components/streaks/ChallengePanel.tsx`
  - `frontend/src/components/streaks/gauntlet/ActiveTargetStageParts.tsx`
  - `frontend/src/components/user/MainCard.tsx`
- **Problem:** Dead by Daylight 45-degree diamond perk slots are implemented inconsistently (CSS `rotate-45` rotation vs SVG polygon clipping).
- **Implementation Steps:**
  - [ ] Create `DiamondSlot.tsx` providing uniform diamond shape, selection glow, empty state, and tooltip integration.
  - [ ] Adopt across streaks and user profile showcases.
- **Verification:** Visually inspect diamond perk slots in gauntlet streaks and profile showcase.

### Task 6.5: Standardize Empty & Not Found Displays on `<EmptyState />`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/common/EmptyState.tsx`
  - `frontend/src/app/[locale]/characters/[slug]/page.tsx:78-95`
  - `frontend/src/components/tier-lists/TierPool.tsx`
  - `frontend/src/components/smash-or-pass/hub/DeckFinished.tsx`
- **Problem:** `characters/[slug]/page.tsx` hand-rolls custom 404 markup instead of using `<EmptyState />` or `<ErrorPage variant="not-found" />`.
- **Implementation Steps:**
  - [ ] Replace hand-rolled 404 containers with `<EmptyState />`.
- **Verification:** Navigate to `/en/characters/non-existent-character` and verify clean 404 empty state.

### Task 6.6: Replace Hand-Rolled Modal Backdrops with Central `<Modal />` Primitive
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/components/common/Modal.tsx`
  - `frontend/src/components/smash-or-pass/RosterSelectModal.tsx`
  - `frontend/src/components/smash-or-pass/hub/RosterModals.tsx`
- **Problem:** `RosterSelectModal` and `RosterModals` write raw `<div className="fixed inset-0 z-50 ...">` shells, duplicating escape listeners, click outside, and accessibility focus trapping.
- **Implementation Steps:**
  - [ ] Wrap `RosterSelectModal` and `RosterModals` with `<Modal isOpen={...} onClose={...}>`.
- **Verification:** Run `npm run test:guards` (`ui: shared primitives: modals and dialogs go through the shared <Modal>`).

---

## Track 7: Frontend Core Utilities, Services & Type Safety

### Task 7.1: Centralize Browser File Download Boilerplate in `src/lib/download.ts`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/lib/download.ts` (Create)
  - `frontend/src/services/userProfileApi.ts:150-160`
  - `frontend/src/components/common/ExportModal.tsx`
  - `frontend/src/components/scraper-config/useExportTab.ts`
  - `frontend/src/components/user/RecoveryCodesPanel.tsx`
  - `frontend/src/utils/minigames/jsonExportImport.ts`
- **Problem:** 5 files independently create invisible DOM anchor elements (`createObjectURL`, `a.click()`, `revokeObjectURL`).
- **Implementation Steps:**
  - [ ] Create `downloadBlob(blob: Blob, filename: string)` and `downloadText(content: string, filename: string)` in `src/lib/download.ts`.
  - [ ] Adopt across all 5 files.
- **Verification:** Trigger user GDPR data export and minigame JSON export to verify clean file download.

### Task 7.2: Replace Raw `navigator.clipboard` Calls with `copyTextWithFallback()`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/utils/clipboard.ts`
  - `frontend/src/components/user/RecoveryCodesPanel.tsx:33`
  - `frontend/src/components/user/TwoFactorSetupModal.tsx`
- **Problem:** 2FA recovery panels bypass `copyTextWithFallback` and call raw `navigator.clipboard.writeText`, failing on older browsers or restrictive iframes.
- **Implementation Steps:**
  - [ ] Replace raw clipboard calls with `copyTextWithFallback`.
- **Verification:** Test 2FA recovery key copy button.

### Task 7.3: Unify 4 Slug & Character Name Sanitizers into `src/lib/slug.ts`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/lib/slug.ts`
  - `frontend/src/utils/staticUrl.ts` (`sanitizeName`)
  - `frontend/src/utils/perkUtils.tsx` (`sanitizeCharacterNameForAvatar`)
  - `frontend/src/components/character-detail/types.tsx` (`getCharacterSlug`)
- **Problem:** 4 independent functions perform identical Unicode normalization, punctuation stripping, and separator collapsing. `sanitizeName` and `sanitizeCharacterNameForAvatar` are character-for-character identical.
- **Implementation Steps:**
  - [ ] Unify canonical slugification and avatar name normalization in `src/lib/slug.ts`.
  - [ ] Re-export from legacy utility files for backward compatibility during migration.
- **Verification:** Run unit tests for slug resolution.

### Task 7.4: Fix Misplaced Utilities: Rename `perkUtils.tsx` and Refactor `types.tsx`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/utils/perkUtils.tsx` $\longrightarrow$ `frontend/src/utils/perkUtils.ts`
  - `frontend/src/components/character-detail/types.tsx`
  - `frontend/src/utils/characterUtils.ts`
- **Problem:** `perkUtils.tsx` contains zero JSX but has a `.tsx` extension. `character-detail/types.tsx` has a `.tsx` extension and contains 12 executable helper functions mixed with types.
- **Implementation Steps:**
  - [ ] Rename `perkUtils.tsx` to `perkUtils.ts`.
  - [ ] Move 12 helper functions (`getRarityRank`, `formatLocalizedReleaseDate`, etc.) into `src/utils/characterUtils.ts`.
  - [ ] Rename `character-detail/types.tsx` to `types.ts` containing purely type definitions.
- **Verification:** Run `npx tsc --noEmit` to ensure all imports resolve.

### Task 7.5: Standardize Unified API Fetch Client & Error Handling
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/lib/api-client.ts` (Create)
  - `frontend/src/services/` (`smashApi.ts`, `changelogApi.ts`, `minigameApi.ts`, `scoreboardApi.ts`, `twoFactorApi.ts`, `streakApiClient.ts`)
- **Problem:** Services duplicate private `handleResponse(response)` or `parseOrThrow(res)` error parsers.
- **Implementation Steps:**
  - [ ] Create `apiFetchJson<T>(endpoint, options)` in `src/lib/api-client.ts` with base URL resolution, credential injection, and structured error throwing.
  - [ ] Adopt across API client files.
- **Verification:** Verify error toast displays when backend returns 4xx/5xx responses.

### Task 7.6: Migrate Ad-Hoc Local Storage to `createVersionedStore`
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/utils/versionedStore.ts`
  - `frontend/src/utils/minigames/storage.ts`
  - `frontend/src/utils/onboardingStorage.ts`
- **Problem:** `minigames/storage.ts` and `onboardingStorage.ts` bypass `versionedStore` and hand-roll raw `safeStorage.getItem()` / `JSON.parse` wrappers.
- **Implementation Steps:**
  - [ ] Migrate both files to `createVersionedStore()` with schema versioning and safe quota fallback.
- **Verification:** Verify minigame high scores and onboarding state persist across browser sessions.

### Task 7.7: Consolidate 67 Duplicate Interface & Type Declarations
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/types/`
  - Multiple components defining duplicate `Particle`, `OnboardingCharacter`, `TierDefinition`, `SegmentedControlProps`, etc.
- **Problem:** 67 type names are redefined locally across multiple files rather than imported from central type contracts.
- **Implementation Steps:**
  - [x] Centralize domain types in `src/types/` (`character.ts`, `tier_list.ts`, `particles.ts`).
  - [x] Import centralized types in components.
- **Verification:** Run `npx tsc --noEmit`.

### Task 7.8: Fix Failing Pre-Existing Quality Guards in `TierListCards.tsx`
- **Priority:** P0 (Build Hygiene)
- **Files Affected:**
  - `frontend/src/components/tier-lists/TierListCards.tsx`
- **Problem:** `npm run test:guards` currently fails due to 2 unused exports (`DEFAULT_OFFICIAL_COVERS`, `DEFAULT_CUSTOM_COVER`) and 2 sub-44px touch-target buttons in `TierListCards.tsx`.
- **Implementation Steps:**
  - [x] Remove `export` keyword from `DEFAULT_OFFICIAL_COVERS` and `DEFAULT_CUSTOM_COVER` if only used internally.
  - [x] Add touch target padding (`p-1` or `min-h-[44px] min-w-[44px]`) to the 2 sub-44px buttons.
- **Verification:** Run `npm run test:guards` and ensure 100% of suites pass.

---

## Track 8: Frontend Next.js 16 & React 19 RSC Optimization

### Task 8.1: Invert Client Boundaries: Convert 25 Static Pages to Server Components
- **Priority:** P1
- **Files Affected:**
  - 25 files: `about/page.tsx`, `rules/page.tsx`, `terms-of-service/page.tsx`, `privacy-policy/page.tsx`, `characters/page.tsx`, `characters/[slug]/page.tsx`, `tier-lists/page.tsx`, `tier-lists/[slug]/page.tsx`, `tier-lists/new/page.tsx`, `tier-lists/custom/[id]/page.tsx`, `streaks/page.tsx`, `welcome/page.tsx`, `achievements/page.tsx`, `maps/page.tsx`, `perks/page.tsx`, `randomizer/page.tsx`, `reset-password/page.tsx`, `smash-or-pass/page.tsx`, `smash-or-pass/create/page.tsx`, `minigames/page.tsx`, `minigames/play/page.tsx`, `minigames/idle/page.tsx`, `minigames/creator/page.tsx`, `admin/page.tsx`, `user/page.tsx`.
- **Problem:** 65.8% of pages declare `'use client'` at line 1, bundling immutable static text into client JavaScript and disabling Turbopack prerendering.
- **Implementation Steps:**
  - [x] Strip `'use client'` from page entrypoints.
  - [x] Convert pages into `async function Page({ params })`.
  - [x] Push `'use client'` down to interactive child leaf components (`CharactersHub`, `LegalDocPage`, `MapExplorer`).
  - [x] Wrap dynamic client sections in `<Suspense fallback={<...>} />`.
- **Verification:** Run `npm run build` and verify client JS bundle sizes decrease significantly (~200KB reduction).

### Task 8.2: Eliminate Client-Side Data Waterfalls with Next.js 16 Cache Components
- **Priority:** P1
- **Files Affected:**
  - `frontend/src/hooks/usePrivacyInfo.ts`
  - `frontend/src/app/[locale]/about/page.tsx`, `privacy-policy/page.tsx`
  - `frontend/src/app/[locale]/streaks/page.tsx`
- **Problem:** Routes fetch static backend data in client `useEffect` hooks, causing skeleton-to-spinner flashing. `streaks/page.tsx` performs client-side `router.replace` navigation.
- **Implementation Steps:**
  - [x] Fetch `privacy-info` directly on the server in `about` and `privacy-policy` using Next.js 16 `'use cache'`.
  - [x] Replace `streaks/page.tsx` client `useEffect` redirect with instant server-side `redirect()` using cookies.
- **Verification:** Inspect network tab on `/about` to verify zero client-side fetch requests for privacy info.

### Task 8.3: Standardize Dynamic Route Parameters to Asynchronous Promise Signature
- **Priority:** P1
- **Files Affected:**
  - All dynamic routes in `frontend/src/app/[locale]/`
- **Problem:** Inconsistent parameter access across pages (`use(params)`, `useParams()`, and `await params`). Next.js 16 strictly requires async `Promise` parameter handling.
- **Implementation Steps:**
  - [x] Standardize page prop signature:
    ```tsx
    export default async function Page({
      params,
      searchParams,
    }: {
      params: Promise<{ locale: Locale; slug?: string }>;
      searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
    }) {
      const { locale, slug } = await params;
      const query = await searchParams;
    }
    ```
- **Verification:** Run `npm run build` without Next.js async parameter runtime warnings.

### Task 8.4: Re-Enable Next.js Image Optimization with Sharp in `next.config.ts`
- **Priority:** P1
- **Files Affected:**
  - `frontend/next.config.ts:9-11`
- **Problem:** `images.unoptimized: true` disables Next.js's built-in image optimization server despite Sharp `^0.35.4` being installed, degrading mobile network performance.
- **Implementation Steps:**
  - [x] Set `unoptimized: false` (or remove `unoptimized: true`) in `next.config.ts`.
  - [x] Configure remote image domains or patterns if external CDNs are loaded.
- **Verification:** Inspect network panel on character roster grid; verify images serve as scaled WebP/AVIF.

### Task 8.5: Lift `<PageShell>` to Root/Group Layout
- **Priority:** P2
- **Files Affected:**
  - `frontend/src/app/[locale]/layout.tsx`
  - All 38 `page.tsx` files
- **Problem:** `layout.tsx` omits `<PageShell>`, forcing every page file to re-mount it manually, triggering unnecessary sidebar unmounts/remounts during navigation.
- **Implementation Steps:**
  - [x] Mount `<PageShell>` inside `app/[locale]/layout.tsx` (or invert boundaries with Server Components directly).
  - [x] Remove manual `<PageShell>` wrapper tags from all individual page components where Server Components hoist layout.
- **Verification:** Click between `/characters`, `/perks`, and `/maps`; confirm Sidebar remains mounted with zero flickering.

### Task 8.6: Strip Obsolete `import React from 'react'` Across Frontend Modules
- **Priority:** P2
- **Files Affected:**
  - Over 200 files across `frontend/src/`
- **Problem:** React 19 supports the modern JSX transform natively. Explicit React default imports are obsolete boilerplate.
- **Implementation Steps:**
  - [x] Remove `import React from 'react';` from files that only require JSX.
  - [x] Keep named hook imports (`import { useState, useEffect } from 'react';`).
- **Verification:** Run `npm run check`.

---

## Track 9: Frontend Feature Architecture & Directory Migration

### Task 9.1: Organize Bounded Context Domains in `src/features/`
- **Priority:** P1
- **Files Affected:**
  - Create: `src/features/auth/`, `src/features/characters/`, `src/features/perks/`, `src/features/maps/`, `src/features/smash-or-pass/`, `src/features/streaks/`, `src/features/tier-lists/`, `src/features/minigames/`, `src/features/admin/`
- **Problem:** Frontend code is scattered across horizontal layers (`components/`, `hooks/`, `services/`, `utils/`, `types/`), imposing high cognitive friction during feature work.
- **Implementation Steps:**
  - [x] Create domain feature directories with internal sub-folders (`components/`, `hooks/`, `api/`, `utils/`, `types.ts`).
  - [x] Create `index.ts` in each feature exporting only its public API.
- **Verification:** Verify feature public exports are importable via `@/features/[feature]`.

### Task 9.2: Establish `src/lib/` for Cross-Cutting Core Infrastructure
- **Priority:** P1
- **Files Affected:**
  - Create `src/lib/cn.ts`, `src/lib/api-client.ts`, `src/lib/download.ts`, `src/lib/storage.ts`, `src/lib/slug.ts`, `src/lib/clipboard.ts`
- **Problem:** Reusable generic utilities are currently intermingled with domain-specific files in `src/utils/`.
- **Implementation Steps:**
  - [x] Relocate core infrastructure utilities into `src/lib/`.
- **Verification:** Run `npx tsc --noEmit`.

### Task 9.3: Migrate 42 "Junk-Drawer" Utilities from `src/utils/` to Bounded Features
- **Priority:** P2
- **Files Affected:**
  - 42 files in `src/utils/`
- **Problem:** `src/utils/` contains map voice scripts, streak preferences, audio player helpers, and smash watermarks dumped together.
- **Implementation Steps:**
  - [x] Move 5 map voice scripts (`mapVoiceData.ts`, etc.) to `src/features/maps/voice/` or bounded feature exports.
  - [x] Move streak difficulty and effect helpers to `src/features/streaks/utils/` or bounded feature exports.
  - [x] Move smash persona and watermark helpers to `src/features/smash-or-pass/utils/` or bounded feature exports.
  - [x] Move perk audio and slot calculators to `src/features/perks/utils/` or bounded feature exports.
- **Verification:** Ensure `src/utils/` contains only truly generic utilities or is deprecated in favor of `src/lib/`.

### Task 9.4: Colocate Page-Exclusive Components into App Router Private `_components/`
- **Priority:** P2
- **Files Affected:**
  - Components used exclusively on a single route
- **Problem:** Page-exclusive components pollute the global component tree.
- **Implementation Steps:**
  - [x] Route-exclusive components colocated and boundary-guarded via feature slices and private components.
- **Verification:** Verify Next.js routes treat `_components` as private (ignored by routing).

### Task 9.5: Enforce Public API Barrels & ESLint Guardrails
- **Priority:** P1
- **Files Affected:**
  - `frontend/eslint.config.mjs`
- **Problem:** Without automated lint rules, developers will bypass `index.ts` barrels and create brittle deep imports.
- **Implementation Steps:**
  - [x] Add `no-restricted-imports` rule in ESLint blocking imports matching `@/features/*/*` while permitting `@/features/*`.
- **Verification:** Run `npm run lint` and verify deep feature imports are flagged as errors.

---

## Master Execution Strategy & Phasing

```mermaid
flowchart TD
    subgraph "Phase 1: Critical Stability & Dead Code Purge (P0)"
        T11["1.1 Rebalance DB Pool (Max 200 Headroom)"]
        T15["1.5 Fix Boot Hooks & Double Blueprint"]
        T21["2.1 Eradicate 14 Legacy SQL 1.x Queries"]
        T23["2.3 Delete Stale queries_map.py"]
        T51["5.1 Purge Dead Dictionary Imports (129 files)"]
        T52["5.2 Delete 19 Sub-Route Layouts"]
        T53["5.3 Delete 3 Duplicate loading.tsx"]
        T56["5.6 Replace useParams()?.locale with useLocale()"]
        T57["5.7 Delete Dead proxy-image Route Handler"]
        T78["7.8 Fix Failing Pre-Existing Quality Guards"]
    end

    subgraph "Phase 2: Core Performance & Duplication Eradication (P1)"
        T12["1.2 Fix Postgres Volume Mount"]
        T13["1.3 Pin Deterministic Container Tags"]
        T14["1.4 Decouple In-Process APScheduler"]
        T16["1.6 Retire SQLite Raw DDL"]
        T22["2.2 Solve N+1 Query Cascades"]
        T24["2.4 Retire Redundant Serializers"]
        T25["2.5 Shared TranslatableModelMixin"]
        T26["2.6 ColumnDictMixin on 25+ Models"]
        T31["3.1 Move Admin DB Ops from users.py"]
        T32["3.2 Standardize API Error Envelope"]
        T33["3.3 Adopt make_streak_blueprint"]
        T34["3.4 Enforce paginate_args()"]
        T36["3.6 Pydantic DTOs on 9 Bypassed Routes"]
        T38["3.8 Service Transaction Blocks (Unit of Work)"]
        T61["6.1 Create PerkIcon / SafeImage (17 files)"]
        T62["6.2 Unify SegmentedControl"]
        T63["6.3 Consolidate Button & DbdButton"]
        T71["7.1 Centralize download.ts (5 files)"]
        T73["7.3 Unify Slug & Name Sanitizers"]
        T74["7.4 Fix perkUtils.ts & types.ts"]
        T75["7.5 Unified api-client.ts"]
        T81["8.1 Invert Client Boundaries to RSC (25 pages)"]
        T82["8.2 Next.js 16 Cache Components ('use cache')"]
        T84["8.4 Re-Enable Image Optimization (Sharp)"]
    end

    subgraph "Phase 3: Structural Architecture & Directory Migration (P2)"
        T41["4.1 Eliminate 11 Service Facades"]
        T42["4.2 Backend Vertical Slices (app/features)"]
        T85["8.5 Lift PageShell to Root Layout"]
        T91["9.1 Establish Frontend src/features/"]
        T92["9.2 Establish src/lib/"]
        T93["9.3 Migrate 42 Utils from src/utils/"]
        T94["9.4 Colocate Page _components/"]
        T95["9.5 ESLint Public API Barrel Guardrails"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

---

## Quality Gate & Verification Checklist

Before considering the refactoring complete, every one of the following verification commands must pass with zero errors:

- [x] **Frontend Type Checking:** `cd frontend && npx tsc --noEmit`
- [x] **Frontend Quality & Architectural Guards:** `cd frontend && npm run test:guards`
- [x] **Frontend i18n & Style Audits:** `cd frontend && npm run check`
- [x] **Frontend Production Build:** `cd frontend && npm run build`
- [x] **Backend Unit & Integration Tests:** `cd backend && pytest`
- [x] **Docker Compose Stack Validation:** `docker compose -f docker-compose.base.yml -f docker-compose.prod.yml config`

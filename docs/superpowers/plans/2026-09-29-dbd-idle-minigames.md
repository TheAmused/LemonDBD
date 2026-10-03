# Dead by Daylight Minigames & DBDIdle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully dynamic, interchangeable Dead by Daylight Minigames ecosystem featuring **DBDIdle** (13 verified guesser modes), PostgreSQL-cached official daily/repeatable challenges, and a **Tier-List-style Custom Challenge Creator** with local-first storage, JSON file export/import, short link sharing, and admin-only official publishing.

**Architecture:** 
- The backend provides a unified PostgreSQL caching and evaluation engine (`minigame_daily_challenges`, `minigame_repeatable_challenges`, `minigame_shared_links`, `minigame_user_stats`) that deterministically seeds daily puzzles, evaluates guesses server-side to prevent client cheating, and caches shared custom links.
- The frontend provides a new **Minigames** navigation tab with a central Hub (`/minigames`), an interchangeable multi-round **Challenge Runner** (`/minigames/play`), and a drag-and-drop **Minigame Creator** (`/minigames/creator`) following the TierListCreator pattern.
- Custom challenges live 100% in client `localStorage` by default, can be exported/imported as `.json` files, shared via backend-cached short links, or published as official trials exclusively by authenticated admins.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Frontend (Next.js 16 App Router)"
        Nav["Sidebar.tsx (/minigames)"] --> Hub["Minigames Hub (/minigames)"]
        Hub --> Play["Challenge Runner (/minigames/play)"]
        Hub --> Creator["Minigame Creator (/minigames/creator)"]
        
        Play --> G1["Classic Guesser"]
        Play --> G2["Realm Guesser"]
        Play --> G3["Audio & Terror Radius"]
        Play --> G4["Perk & Distortion"]
        Play --> G5["Power & Addon"]
        Play --> G6["Quote & Emoji"]
        
        Creator --> LocalStore["localStorage (lemondbd_custom_minigames)"]
        Creator --> JsonIO["JSON Export / Import (.json)"]
        Creator --> ShareModal["Share Short Link Modal"]
        Creator --> AdminPub["Admin: Publish as Official"]
    end

    subgraph "Backend API (Flask & PostgreSQL)"
        ShareModal -->|POST /api/v1/minigames/share| SharedTable[("minigame_shared_links")]
        AdminPub -->|POST /api/v1/minigames/official (AdminOnly)| DailyTable[("minigame_daily_challenges")]
        Play -->|GET /api/v1/minigames/daily| DailyTable
        Play -->|GET /api/v1/minigames/repeatable| RepeatTable[("minigame_repeatable_challenges")]
        Play -->|POST /api/v1/minigames/session/:id/guess| Engine["Minigame Evaluation Service"]
    end
```

**Tech Stack:**
- **Backend:** Flask, Flask-SQLAlchemy 3.1+, PostgreSQL 16 (JSONB columns), psycopg 3, Flask-Migrate (Alembic), PyJWT.
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, `@dnd-kit/core` & `@dnd-kit/sortable`, Lucide icons, Canvas Confetti, Web Audio API sound synthesis.

---

## Global Constraints

- **Language & Locales:** Must support all 5 locales (`en`, `es`, `pl`, `de`, `ja`) with complete type-safe dictionary entries in [`frontend/src/locales/types.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/locales/types.ts).
- **PostgreSQL Caching:** All official daily puzzles, repeatable sessions, and shared short-link payloads MUST be cached and served from PostgreSQL.
- **Cheating Prevention:** Solution targets MUST be kept server-side or obfuscated; guess evaluations (comparison tiles, clues, audio reveals) are returned upon guess submission.
- **Interchangeable Rounds:** A challenge is an ordered array of 1 to N interchangeable rounds of any guesser mode.
- **Local-First Custom Games:** Non-official custom challenges reside in `localStorage`, export/import via `.json`, and only touch PostgreSQL if explicitly shared via short link.
- **Admin Security:** Only users with `is_admin = True` can post or edit official challenges (`@admin_required`).

---

## Tasks

### Task 1: PostgreSQL Minigames Database Models & Alembic Migration

**Files:**
- Create: `backend/app/models/minigame.py`
- Modify: `backend/app/models/__init__.py:1-40`
- Create: `backend/migrations/versions/xxxx_add_minigames_tables.py`
- Test: `backend/tests/test_minigame_models.py`

**Interfaces:**
- Produces: `MinigameDailyChallenge`, `MinigameRepeatableChallenge`, `MinigameSharedLink`, `MinigameUserStat` SQLAlchemy models.

- [ ] **Step 1: Write the failing unit test**

```python
# backend/tests/test_minigame_models.py
import pytest
from datetime import date, datetime, timezone
from app.core.extensions import db
from app.models.minigame import (
    MinigameDailyChallenge,
    MinigameRepeatableChallenge,
    MinigameSharedLink,
    MinigameUserStat,
)

def test_create_minigame_daily_challenge(app):
    with app.app_context():
        challenge = MinigameDailyChallenge(
            challenge_date=date(2026, 9, 29),
            game_mode="fog_trial",
            title="The Fog Infiltration Trial",
            description="4-stage realm, audio, and killer trial.",
            rounds=[
                {
                    "round_number": 1,
                    "mode": "realm_guesser",
                    "target_type": "realm",
                    "target_id": 1,
                    "max_attempts": 6,
                    "config": {"starting_zoom": 400}
                }
            ],
            is_active=True,
        )
        db.session.add(challenge)
        db.session.commit()

        retrieved = MinigameDailyChallenge.query.filter_by(
            challenge_date=date(2026, 9, 29), game_mode="fog_trial"
        ).first()
        assert retrieved is not None
        assert retrieved.title == "The Fog Infiltration Trial"
        assert len(retrieved.rounds) == 1
        assert retrieved.rounds[0]["mode"] == "realm_guesser"

def test_shared_link_model(app):
    with app.app_context():
        link = MinigameSharedLink(
            short_code="dbd-test1",
            payload={"title": "Custom Test", "rounds": []}
        )
        db.session.add(link)
        db.session.commit()

        retrieved = MinigameSharedLink.query.filter_by(short_code="dbd-test1").first()
        assert retrieved is not None
        assert retrieved.payload["title"] == "Custom Test"
        assert retrieved.views_count == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec dbd_backend pytest tests/test_minigame_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.minigame'`

- [ ] **Step 3: Implement `backend/app/models/minigame.py`**

```python
# backend/app/models/minigame.py
import uuid
from datetime import date, datetime
from typing import Any
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JSON_DICT, JSON_LIST, utcnow

def _json_column(**kw: Any):
    return mapped_column(JSONB().with_variant(JSON_DICT, "sqlite"), **kw)

class MinigameDailyChallenge(Base):
    __tablename__ = "minigame_daily_challenges"
    __table_args__ = (
        UniqueConstraint("challenge_date", "game_mode", name="uq_minigame_daily_date_mode"),
        Index("ix_minigame_daily_date_active", "challenge_date", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    challenge_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    rounds: Mapped[list[dict[str, Any]]] = mapped_column(JSONB().with_variant(JSON_LIST, "sqlite"), default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

class MinigameRepeatableChallenge(Base):
    __tablename__ = "minigame_repeatable_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(150), default="Repeatable Challenge", nullable=False)
    rounds: Mapped[list[dict[str, Any]]] = mapped_column(JSONB().with_variant(JSON_LIST, "sqlite"), default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

class MinigameSharedLink(Base):
    __tablename__ = "minigame_shared_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    short_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    creator_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    payload: Mapped[dict[str, Any]] = _json_column(nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

class MinigameUserStat(Base):
    __tablename__ = "minigame_user_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "game_mode", name="uq_minigame_user_mode_stat"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guess_distribution: Mapped[dict[str, int]] = _json_column(default=dict, nullable=False)
    last_played_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
```

- [ ] **Step 4: Register models and create migration**
Export models in `backend/app/models/__init__.py` and execute migration on PostgreSQL.
Run: `docker exec dbd_backend flask db migrate -m "add minigames tables"`
Run: `docker exec dbd_backend flask db upgrade`

- [ ] **Step 5: Verify tests pass**
Run: `docker exec dbd_backend pytest tests/test_minigame_models.py -v`
Expected: PASS (2 passed)

---

### Task 2: Backend Minigame Engine & Clue Evaluator Service

**Files:**
- Create: `backend/app/services/minigame_service.py`
- Test: `backend/tests/test_minigame_service.py`

**Interfaces:**
- Consumes: `Survivor`, `Killer`, `Chapter`, `Perk`, `Realm`, `MapRealm` models.
- Produces:
  - `MinigameService.get_or_create_daily(game_mode, target_date)`
  - `MinigameService.create_repeatable(game_mode, session_id)`
  - `MinigameService.evaluate_round_guess(round_data, guess_id, current_attempts)`

- [ ] **Step 1: Write the failing service test**

```python
# backend/tests/test_minigame_service.py
import pytest
from datetime import date
from app.services.minigame_service import MinigameService

def test_daily_challenge_generation_and_caching(app):
    with app.app_context():
        service = MinigameService()
        d = date(2026, 9, 29)
        challenge1 = service.get_or_create_daily(game_mode="classic", target_date=d)
        assert challenge1 is not None
        assert challenge1["game_mode"] == "classic"
        assert len(challenge1["rounds"]) >= 1

        # Second fetch must hit cache and return exact same challenge
        challenge2 = service.get_or_create_daily(game_mode="classic", target_date=d)
        assert challenge1["id"] == challenge2["id"]

def test_classic_character_attribute_evaluation(app):
    with app.app_context():
        service = MinigameService()
        round_data = {
            "mode": "classic_character",
            "target_type": "killer",
            "target_id": 1,
            "max_attempts": 6
        }
        result = service.evaluate_round_guess(round_data, guess_type="survivor", guess_id=1)
        assert result["is_correct"] is False
        assert result["attributes"]["role"] == "incorrect"
        assert result["attributes"]["gender"] == "correct"
        assert result["attributes"]["release_year"]["status"] == "correct"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec dbd_backend pytest tests/test_minigame_service.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement `backend/app/services/minigame_service.py`**
Implement:
- Character canonical attributes mapper (merges `Survivor`, `Killer`, `Chapter`, and `Entity` genders).
- 13-mode guess evaluators (Attribute feedback, zoom level reduction, sound layer reveals).
- Deterministic pseudo-random seed generator: `hashlib.sha256(f"{target_date}:{mode}".encode()).hexdigest()` to guarantee identical daily challenges across all nodes without race conditions.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec dbd_backend pytest tests/test_minigame_service.py -v`
Expected: PASS

---

### Task 3: Backend API Endpoints & Admin Control

**Files:**
- Create: `backend/app/routes/minigames.py`
- Modify: `backend/app/__init__.py:150-185` (register `minigames_bp`)
- Test: `backend/tests/test_minigames_routes.py`

**Interfaces:**
- Endpoints:
  - `GET /api/v1/minigames/catalog`: returns all characters, perks, realms for autocomplete.
  - `GET /api/v1/minigames/daily`: retrieves or caches daily challenge for date & mode.
  - `GET /api/v1/minigames/repeatable`: generates/retrieves repeatable trial session.
  - `POST /api/v1/minigames/session/<id>/guess`: validates round guess against cached session.
  - `POST /api/v1/minigames/share`: generates short-code and stores payload in `minigame_shared_links`.
  - `GET /api/v1/minigames/share/<short_code>`: fetches shared challenge.
  - `POST /api/v1/minigames/official`: `@admin_required` endpoint to publish/seed official trials.

- [ ] **Step 1: Write routes test**

```python
# backend/tests/test_minigames_routes.py
def test_get_catalog_returns_all_entities(client):
    res = client.get("/api/v1/minigames/catalog")
    assert res.status_code == 200
    data = res.get_json()
    assert "characters" in data
    assert len(data["characters"]) >= 90
    assert "realms" in data
    assert len(data["realms"]) == 21

def test_admin_post_official_challenge(client, admin_token, user_token):
    # Forbidden for non-admin
    res = client.post(
        "/api/v1/minigames/official",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"title": "Official Test", "game_mode": "daily_trial", "rounds": []}
    )
    assert res.status_code == 403

    # Allowed for admin
    res = client.post(
        "/api/v1/minigames/official",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Official Admin Gauntlet",
            "game_mode": "daily_trial",
            "challenge_date": "2026-09-30",
            "rounds": [{"mode": "realm_guesser", "target_id": 1}]
        }
    )
    assert res.status_code in (200, 201)
```

- [ ] **Step 2: Implement `backend/app/routes/minigames.py` and register in `backend/app/__init__.py`**
- [ ] **Step 3: Run test to verify it passes**
Run: `docker exec dbd_backend pytest tests/test_minigames_routes.py -v`
Expected: PASS

---

### Task 4: Frontend Types, Local Storage & API Client

**Files:**
- Create: `frontend/src/types/minigame.ts`
- Create: `frontend/src/services/minigameApi.ts`
- Create: `frontend/src/utils/minigames/storage.ts`
- Create: `frontend/src/utils/minigames/jsonExportImport.ts`
- Test: `frontend/src/__tests__/unit/minigameStorage.test.ts`

**Interfaces:**
- Produces:
  - TypeScript types: `MinigameMode`, `MinigameRoundConfig`, `MinigameChallengeDocument`, `GuessEvaluationResult`.
  - LocalStorage helpers: `getCustomChallenges()`, `saveCustomChallenge()`, `deleteCustomChallenge()`.
  - API methods: `fetchCatalog()`, `fetchDailyChallenge()`, `fetchRepeatableChallenge()`, `submitGuess()`, `createSharedLink()`, `fetchSharedLink()`, `publishOfficialChallenge()`.

- [ ] **Step 1: Write storage unit tests**
- [ ] **Step 2: Implement types, storage utilities, and API client**
- [ ] **Step 3: Run unit tests**
Run: `npm --prefix frontend run test:unit`
Expected: PASS

---

### Task 5: Navigation, Sidebar Integration & Internationalization (i18n)

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx:135-210`
- Modify: `frontend/src/locales/en/sidebar.ts`, `frontend/src/locales/pl/sidebar.ts`, `frontend/src/locales/es/sidebar.ts`, `frontend/src/locales/de/sidebar.ts`, `frontend/src/locales/ja/sidebar.ts`
- Create: `frontend/src/locales/en/minigames.ts`
- Create: `frontend/src/locales/pl/minigames.ts`, `es`, `de`, `ja`
- Modify: `frontend/src/locales/{en,pl,es,de,ja}/index.ts`

- [ ] **Step 1: Add `"minigames"` to `mainNavItems` in `Sidebar.tsx`**

```tsx
{
  id: 'minigames',
  label: dict?.sidebar?.minigames || 'Minigames',
  icon: Gamepad2,
  color: 'text-accent-red',
  activeBg: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
  href: `/${currentLocale}/minigames`,
}
```

- [ ] **Step 2: Add dictionary keys in all 5 languages for sidebar and minigames**
- [ ] **Step 3: Run type check & i18n validator**
Run: `npm --prefix frontend run check:i18n`
Expected: PASS (zero missing keys)

---

### Task 6: Frontend Core Interactive Guessers (Mode Components)

**Files:**
- Create: `frontend/src/components/minigames/common/CharacterAutocomplete.tsx`
- Create: `frontend/src/components/minigames/common/MinigameSoundEngine.ts`
- Create: `frontend/src/components/minigames/guessers/ClassicGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/RealmGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/PixelAvatarGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/PerkDistortionGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/AudioGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/PowerAddonGuesser.tsx`
- Create: `frontend/src/components/minigames/guessers/QuoteEmojiGuesser.tsx`

- [ ] **Step 1: Implement `MinigameSoundEngine.ts` (Web Audio API synthesizers for tile flips, buzzers, and victory fanfare)**
- [ ] **Step 2: Implement `CharacterAutocomplete.tsx` with fuzzy search, avatar portraits, and keyboard navigation**
- [ ] **Step 3: Implement `ClassicGuesser.tsx` with flip animations, green/yellow/red attribute indicators, and arrows**
- [ ] **Step 4: Implement `RealmGuesser.tsx` with landmark zoom crop, zoom-out transitions, and environmental tags**
- [ ] **Step 5: Implement `PixelAvatarGuesser.tsx` with dynamic canvas pixelation matrix and resolution doubling**
- [ ] **Step 6: Implement `AudioGuesser.tsx` with 32m/16m/chase audio playback controls, waveform bars, and volume slider**

---

### Task 7: Frontend Multi-Round Trial Runner & DBD Idle Hub

**Files:**
- Create: `frontend/src/components/minigames/runner/ChallengeRunner.tsx`
- Create: `frontend/src/components/minigames/runner/VictoryModal.tsx`
- Create: `frontend/src/app/[locale]/minigames/page.tsx` (Minigames Hub)
- Create: `frontend/src/app/[locale]/minigames/play/page.tsx` (Dynamic Player)
- Create: `frontend/src/app/[locale]/minigames/idle/page.tsx` (DBDIdle Classic Entry)

- [ ] **Step 1: Implement `ChallengeRunner.tsx`**
  - Manages active round index (`round 1 of N`), transitions between interchangeable modes, accumulates overall score.
- [ ] **Step 2: Implement `VictoryModal.tsx` with Canvas Confetti, guess breakdown, and copyable emoji share grid (e.g. `LemonDBD Trial #42 4/4 🟩🟨🟩🟩`)**
- [ ] **Step 3: Implement Minigames Hub (`page.tsx`) with Featured Daily Trial, Individual Mode tiles, My Custom Games carousel, and Creator launch button**
- [ ] **Step 4: Test in browser to verify fluid gameplay**

---

### Task 8: Frontend Minigame Challenge Creator (`TierListCreator` Pattern)

**Files:**
- Create: `frontend/src/components/minigames/creator/MinigameCreator.tsx`
- Create: `frontend/src/components/minigames/creator/RoundEditorCard.tsx`
- Create: `frontend/src/components/minigames/creator/ImportExportModal.tsx`
- Create: `frontend/src/components/minigames/creator/ShareLinkModal.tsx`
- Create: `frontend/src/app/[locale]/minigames/creator/page.tsx`

- [ ] **Step 1: Implement `RoundEditorCard.tsx` with `@dnd-kit/sortable` handles, mode selector, target picker, and clue cadence controls**
- [ ] **Step 2: Implement `MinigameCreator.tsx` managing challenge draft in `localStorage`, adding/removing/reordering rounds**
- [ ] **Step 3: Implement `ImportExportModal.tsx` for `.json` file download and drag-and-drop file upload with schema validation**
- [ ] **Step 4: Implement `ShareLinkModal.tsx` generating backend-cached short links (`?c=<code>`)**
- [ ] **Step 5: Add Admin Controls: If `user.isAdmin`, show "Publish as Official Daily / Featured Trial" button calling `POST /api/v1/minigames/official`**

---

### Task 9: End-to-End Verification & Integration Testing

- [ ] **Step 1: Run backend test suite**
Run: `docker exec dbd_backend pytest tests/test_minigame*.py -v`
Expected: All backend tests pass.

- [ ] **Step 2: Run frontend test suite & linters**
Run: `npm --prefix frontend run lint`
Run: `npm --prefix frontend run check:i18n`
Run: `npm --prefix frontend run build`
Expected: Next.js build succeeds with zero errors.

- [ ] **Step 3: Verify PostgreSQL caching**
Verify `minigame_daily_challenges` and `minigame_shared_links` persist rows across backend restarts.

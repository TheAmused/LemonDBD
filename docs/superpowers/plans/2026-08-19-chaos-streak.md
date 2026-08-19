# Chaos Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Chaos Streak challenge — a killer-only, casino-themed run where every round draws 4 random killer perks (no-repeat until the pool is exhausted) plus 2 addon rarity requirements, the player manually picks a remaining killer to play, and three difficulties (easy/medium/hell) differ only in checkpoint interval.

**Architecture:** Mirrors the existing Gauntlet feature's package layout exactly: a `models/chaos.py` pair of tables, a `services/chaos/` package (constants, roller, stats) behind a thin `ChaosService`, a Flask blueprint at `/api/v1/chaos-streak`, and a `components/streaks/chaos/` frontend directory with its own hook, mode modal, and board. No per-character target draw and no perk-limit ladder — the only new mechanical surface versus Gauntlet is the no-repeat perk pool and the addon rarity draw.

**Tech Stack:** Flask + SQLAlchemy + pytest (backend, already installed in the `dbd_backend` container's user site-packages this session), Next.js 16 + React 19 + TypeScript (frontend), Tailwind CSS, `requestAnimationFrame`-driven CSS transforms for the slot reels (no new frontend dependency).

**Spec:** `docs/superpowers/specs/2026-08-19-chaos-streak-design.md`

## Global Constraints

- Killer-only. No survivor variant, no entry added to `SURVIVOR_STREAK_PANELS`.
- No roster cap — every owned killer is eligible, unlike Gauntlet Original's 43-killer limit.
- Perk pool = every unlocked `Perk` with `category == "Killer"` (teachables of any killer plus general perks), not scoped to the picked killer.
- Checkpoint interval by difficulty: `{"easy": 5, "medium": 10, "hell": 0}`. `0` means no checkpoint — one loss fully resets the run.
- Win requires 3+ kills, communicated as text only (no numeric kill-count input), matching Gauntlet Original.
- Addon rarity pool: `["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]` — "Event" excluded. Two independent draws, duplicates allowed. Not part of the no-repeat perk pool.
- No dashes (`—`) or hyphen ranges in any UI copy — write out words instead (established project convention).
- All new backend modules get a `# path/to/file.py` header comment on line 1, matching the convention introduced by develop's reorganization.
- Every frontend `.tsx`/`.ts` file gets a `// path/to/file.tsx` header comment on line 1 (or line 2 if `'use client'` is line 1), matching the same convention.
- Backend tests run inside the `dbd_backend` container: `docker cp backend/app dbd_backend:/app/app`, `docker cp backend/tests dbd_backend:/app/tests`, then `docker exec dbd_backend sh -c "cd /app && python -m pytest <path> -q"`. If pytest is missing, install once with `docker exec -u root dbd_backend sh -c 'PYTHONUSERBASE=/home/appuser/.local pip install -q --user pytest; chown -R appuser /home/appuser/.local'`.
- Frontend checks run from `frontend/`: `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/next build`.
- Every task ends with a commit on branch `feature/chaos-streak` (already created off `develop` and pushed).

---

## Task 1: `ChaosRun` and `ChaosMatchLog` models, schemas, and schema bootstrapping

**Files:**
- Create: `backend/app/models/chaos.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/chaos.py`
- Modify: `backend/app/schemas/__init__.py`
- Modify: `backend/app/services/db/raw_schema.py`
- Test: `backend/tests/unit/test_chaos_models.py`

**Interfaces:**
- Produces: `ChaosRun` (SQLAlchemy model, `chaos_runs` table), `ChaosMatchLog` (`chaos_match_logs` table), both importable from `app.models`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_chaos_models.py`:

```python
# backend/tests/unit/test_chaos_models.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosRun, ChaosMatchLog, User


class TestChaosModels(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _make_user(self):
        user = User(username="chaosuser", email="chaos@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_chaos_run_round_trip(self):
        user = self._make_user()
        run = ChaosRun(
            user_id=user.id,
            difficulty="hell",
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            used_perks_json=json.dumps(["Hex: Ruin"]),
            checkpoint_used_perks_json="[]",
            current_perks_json=json.dumps([{"name": "Hex: Ruin"}]),
            current_addon_rarities_json=json.dumps(["Rare", "Rare"]),
            perks_revealed=False,
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["difficulty"], "hell")
        self.assertEqual(d["used_perks"], ["Hex: Ruin"])
        self.assertEqual(d["current_perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["current_addon_rarities"], ["Rare", "Rare"])
        self.assertFalse(d["perks_revealed"])

    def test_unique_constraint_on_user_and_difficulty(self):
        user = self._make_user()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell", current_character_id_placeholder=None)
                       if False else ChaosRun(user_id=user.id, difficulty="hell"))
        db.session.commit()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_chaos_match_log_round_trip(self):
        user = self._make_user()
        run = ChaosRun(user_id=user.id, difficulty="easy")
        db.session.add(run)
        db.session.commit()

        log = ChaosMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            perks_json=json.dumps([{"name": "Hex: Ruin"}]),
            addon_rarities_json=json.dumps(["Common", "Rare"]),
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["addon_rarities"], ["Common", "Rare"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_models.py -q"
```

Expected: FAIL with `ImportError: cannot import name 'ChaosRun' from 'app.models'`.

- [ ] **Step 3: Write the models**

Create `backend/app/models/chaos.py`:

```python
# backend/app/models/chaos.py
import json
from datetime import datetime
from typing import List
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class ChaosRun(Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    difficulty: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]")
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "difficulty": self.difficulty,
            "status": self.status,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_killers_json": self.completed_killers_json,
            "completed_killers": json.loads(self.completed_killers_json or "[]"),
            "checkpoint_killers_json": self.checkpoint_killers_json,
            "checkpoint_killers": json.loads(self.checkpoint_killers_json or "[]"),
            "used_perks_json": self.used_perks_json,
            "used_perks": json.loads(self.used_perks_json or "[]"),
            "checkpoint_used_perks_json": self.checkpoint_used_perks_json,
            "checkpoint_used_perks": json.loads(self.checkpoint_used_perks_json or "[]"),
            "current_perks_json": self.current_perks_json,
            "current_perks": json.loads(self.current_perks_json or "[]"),
            "current_addon_rarities_json": self.current_addon_rarities_json,
            "current_addon_rarities": json.loads(self.current_addon_rarities_json or "[]"),
            "perks_revealed": self.perks_revealed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChaosMatchLog(Base):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("chaos_runs.id", ondelete="CASCADE"), index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    perks_json: Mapped[str] = mapped_column(Text)
    addon_rarities_json: Mapped[str] = mapped_column(Text)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "addon_rarities_json": self.addon_rarities_json,
            "addon_rarities": json.loads(self.addon_rarities_json or "[]"),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
```

Edit `backend/app/models/__init__.py`: add the import and `__all__` entries. Find:

```python
from app.models.character import Character, Killer, Survivor
```

Add immediately after it:

```python
from app.models.chaos import ChaosMatchLog, ChaosRun
```

Find the `__all__` list's `"Character",` line and add after it:

```python
    "ChaosRun",
    "ChaosMatchLog",
```

- [ ] **Step 4: Add the Pydantic schema scaffolding**

Create `backend/app/schemas/chaos.py`:

```python
# backend/app/schemas/chaos.py
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ChaosMatchLogBase(BaseModel):
    killer_id: str
    result: str
    perks: List[Any] = []
    addon_rarities: List[str] = []
    streak_before: int
    streak_after: int


class ChaosMatchLogResponse(ChaosMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChaosRunBase(BaseModel):
    difficulty: str
    status: str = "in_progress"
    current_streak: int = 0
    best_streak: int = 0
    last_checkpoint_streak: int = 0
    perks_revealed: bool = False


class ChaosRunResponse(ChaosRunBase):
    id: int
    user_id: int
    completed_killers: List[str] = []
    checkpoint_killers: List[str] = []
    used_perks: List[str] = []
    checkpoint_used_perks: List[str] = []
    current_perks: List[Dict[str, Any]] = []
    current_addon_rarities: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
```

Edit `backend/app/schemas/__init__.py`. Find the `from app.schemas.gauntlet import (...)` block and add immediately after its closing `)`:

```python
from app.schemas.chaos import (
    ChaosMatchLogBase,
    ChaosMatchLogResponse,
    ChaosRunBase,
    ChaosRunResponse,
)
```

Find the `__all__` list's `"GauntletMatchLogResponse",` line and add after it:

```python
    "ChaosRunBase",
    "ChaosRunResponse",
    "ChaosMatchLogBase",
    "ChaosMatchLogResponse",
```

- [ ] **Step 5: Add the SQLite fallback DDL**

Edit `backend/app/services/db/raw_schema.py`. Find the `gauntlet_match_logs` `CREATE TABLE` block (it ends with `FOREIGN KEY (run_id) REFERENCES gauntlet_runs(id) ON DELETE CASCADE\n);`). Add immediately after it:

```sql

CREATE TABLE IF NOT EXISTS chaos_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_killers_json TEXT NOT NULL DEFAULT '[]',
    used_perks_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_used_perks_json TEXT NOT NULL DEFAULT '[]',
    current_perks_json TEXT NOT NULL DEFAULT '[]',
    current_addon_rarities_json TEXT NOT NULL DEFAULT '[]',
    perks_revealed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chaos_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    addon_rarities_json TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES chaos_runs(id) ON DELETE CASCADE
);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
docker cp backend/app dbd_backend:/app/app
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_models.py -q"
```

Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/chaos.py backend/app/models/__init__.py \
        backend/app/schemas/chaos.py backend/app/schemas/__init__.py \
        backend/app/services/db/raw_schema.py backend/tests/unit/test_chaos_models.py
git commit -m "feat(chaos-streak): add ChaosRun and ChaosMatchLog models"
```

---

## Task 2: Perk and addon rarity roller

**Files:**
- Create: `backend/app/services/chaos/__init__.py`
- Create: `backend/app/services/chaos/constants.py`
- Create: `backend/app/services/chaos/roller.py`
- Test: `backend/tests/unit/test_chaos_roller.py`

**Interfaces:**
- Consumes: `OwnershipService.get_user_characters(user_id, role)` and `OwnershipService.get_user_perks(user_id, category)` (both already exist, used identically by `app.services.gauntlet.roller`).
- Produces: `CHAOS_CHECKPOINT_INTERVAL: Dict[str, int]`, `DIFFICULTIES: Tuple[str, ...]`, `ADDON_RARITY_POOL: List[str]`, `checkpoint_interval(difficulty: str) -> int`, `get_owned_killer_names(user_id, ownership_service) -> List[str]`, `get_unlocked_killer_perks(user_id, ownership_service) -> List[Dict[str, Any]]`, `draw_chaos_perks(unlocked_perks, used_perk_names) -> Tuple[List[Dict[str, Any]], List[str]]`, `draw_addon_rarities() -> List[str]`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/unit/test_chaos_roller.py`:

```python
# backend/tests/unit/test_chaos_roller.py
import unittest
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import draw_addon_rarities, draw_chaos_perks


class TestChaosConstants(unittest.TestCase):
    def test_checkpoint_interval_per_difficulty(self):
        self.assertEqual(checkpoint_interval("easy"), 5)
        self.assertEqual(checkpoint_interval("medium"), 10)
        self.assertEqual(checkpoint_interval("hell"), 0)

    def test_checkpoint_interval_unknown_defaults_to_zero(self):
        self.assertEqual(checkpoint_interval("nonsense"), 0)

    def test_difficulties_tuple(self):
        self.assertEqual(DIFFICULTIES, ("easy", "medium", "hell"))

    def test_addon_rarity_pool_excludes_event(self):
        self.assertNotIn("Event", ADDON_RARITY_POOL)
        self.assertEqual(
            set(ADDON_RARITY_POOL),
            {"Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"},
        )


class TestDrawAddonRarities(unittest.TestCase):
    def test_always_returns_two(self):
        for _ in range(20):
            rarities = draw_addon_rarities()
            self.assertEqual(len(rarities), 2)
            for r in rarities:
                self.assertIn(r, ADDON_RARITY_POOL)

    def test_duplicates_are_possible_over_many_draws(self):
        # Not guaranteed on any single draw, but overwhelmingly likely across 200.
        saw_duplicate = False
        for _ in range(200):
            a, b = draw_addon_rarities()
            if a == b:
                saw_duplicate = True
                break
        self.assertTrue(saw_duplicate)


def _perk(name):
    return {"id": hash(name) % 100000, "name": name, "category": "Killer"}


class TestDrawChaosPerks(unittest.TestCase):
    def test_draws_four_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertEqual(len(used), 4)

    def test_no_repeats_within_a_draw_when_pool_is_large_enough(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, _ = draw_chaos_perks(pool, [])
        names = [p["name"] for p in drawn]
        self.assertEqual(len(names), len(set(names)))

    def test_respects_already_used_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(6)]
        already_used = [p["name"] for p in pool[:4]]
        drawn, updated_used = draw_chaos_perks(pool, already_used)
        drawn_names = {p["name"] for p in drawn}
        # Only 2 perks were not yet used, so the pool must refill mid-draw,
        # meaning drawn perks may include names from `already_used` again.
        self.assertEqual(len(drawn), 4)
        self.assertEqual(len(updated_used), 4)
        # But at least the 2 previously-unused perks were drawn first.
        previously_unused = {p["name"] for p in pool[4:]}
        self.assertTrue(previously_unused.issubset(drawn_names))

    def test_refills_when_pool_fully_exhausted_mid_draw(self):
        pool = [_perk("Only Perk")]
        drawn, updated_used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertTrue(all(p["name"] == "Only Perk" for p in drawn))
        # The pool (size 1) was exhausted and refilled 3 times after the
        # first draw, so used_perk_names ends up holding just the one name.
        self.assertEqual(updated_used, ["Only Perk"])

    def test_empty_pool_returns_nothing(self):
        drawn, updated_used = draw_chaos_perks([], [])
        self.assertEqual(drawn, [])
        self.assertEqual(updated_used, [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_roller.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.chaos'`.

- [ ] **Step 3: Write the constants module**

Create `backend/app/services/chaos/__init__.py`:

```python
# backend/app/services/chaos/__init__.py
```

Create `backend/app/services/chaos/constants.py`:

```python
# backend/app/services/chaos/constants.py
from typing import Dict, Tuple

DIFFICULTIES: Tuple[str, ...] = ("easy", "medium", "hell")

# 0 means no checkpoint: one loss fully resets the run.
CHAOS_CHECKPOINT_INTERVAL: Dict[str, int] = {"easy": 5, "medium": 10, "hell": 0}

# "Event" rarity addons are tied to limited-time in-game events and are not
# reliably available to every player, so they are excluded from the draw.
ADDON_RARITY_POOL = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]


def checkpoint_interval(difficulty: str) -> int:
    return CHAOS_CHECKPOINT_INTERVAL.get(difficulty, 0)
```

- [ ] **Step 4: Write the roller module**

Create `backend/app/services/chaos/roller.py`:

```python
# backend/app/services/chaos/roller.py
import random
from typing import Any, Dict, List, Tuple

from app.services.chaos.constants import ADDON_RARITY_POOL
from app.services.ownership_service import OwnershipService


def get_owned_killer_names(user_id: int, ownership_service: OwnershipService) -> List[str]:
    """Every killer the user owns. Unlike Gauntlet Original, no roster cap."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["name"] for c in owned if c["is_owned"]]


def get_unlocked_killer_perks(user_id: int, ownership_service: OwnershipService) -> List[Dict[str, Any]]:
    """Every unlocked perk in the Killer category, teachables of any killer plus general perks."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p for p in perks if p["is_unlocked"]]


def draw_chaos_perks(
    unlocked_perks: List[Dict[str, Any]],
    used_perk_names: List[str],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Draws 4 perks one at a time without repeating a perk already in
    used_perk_names. If the eligible pool runs out mid-draw, the whole pool
    becomes eligible again (used_perk_names resets) and drawing continues,
    so a single round can span both the tail of one cycle and the start of
    the next. A pool with fewer than 4 distinct perks total will repeat
    within the same draw rather than fail.
    Returns (drawn_perks, updated_used_perk_names).
    """
    if not unlocked_perks:
        return [], list(used_perk_names)

    used = list(used_perk_names)
    drawn: List[Dict[str, Any]] = []

    for _ in range(4):
        eligible = [p for p in unlocked_perks if p["name"] not in used]
        if not eligible:
            used = []
            eligible = list(unlocked_perks)
        pick = random.choice(eligible)
        drawn.append(pick)
        used.append(pick["name"])

    return drawn, used


def draw_addon_rarities() -> List[str]:
    """Two independent picks from ADDON_RARITY_POOL; duplicates are allowed."""
    return [random.choice(ADDON_RARITY_POOL), random.choice(ADDON_RARITY_POOL)]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker cp backend/app/services/chaos dbd_backend:/app/app/services/chaos
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_roller.py -q"
```

Expected: `9 passed`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/chaos/__init__.py backend/app/services/chaos/constants.py \
        backend/app/services/chaos/roller.py backend/tests/unit/test_chaos_roller.py
git commit -m "feat(chaos-streak): add perk and addon rarity roller"
```

---

## Task 3: Stats module

**Files:**
- Create: `backend/app/services/chaos/stats.py`
- Test: `backend/tests/unit/test_chaos_stats.py`

**Interfaces:**
- Consumes: `ChaosRun`, `ChaosMatchLog` (Task 1).
- Produces: `fetch_chaos_user_stats(user_id: int, difficulty: str) -> Dict[str, Any]` with keys `total_matches`, `wins`, `losses`, `win_rate`, `recent_logs`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_chaos_stats.py`:

```python
# backend/tests/unit/test_chaos_stats.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun, User
from app.services.chaos.stats import fetch_chaos_user_stats


class TestChaosStats(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        user = User(username="statsuser", email="stats@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        self.user_id = user.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_no_runs_yet(self):
        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(
            stats,
            {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []},
        )

    def test_counts_wins_and_losses_for_the_given_difficulty_only(self):
        hell_run = ChaosRun(user_id=self.user_id, difficulty="hell")
        easy_run = ChaosRun(user_id=self.user_id, difficulty="easy")
        db.session.add_all([hell_run, easy_run])
        db.session.commit()

        db.session.add_all([
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Trapper", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Wraith", result="loss",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=1, streak_after=0,
            ),
            ChaosMatchLog(
                run_id=easy_run.id, killer_id="The Hillbilly", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
        ])
        db.session.commit()

        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 2)
        self.assertEqual(stats["wins"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["win_rate"], 50.0)
        self.assertEqual(len(stats["recent_logs"]), 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_stats.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.chaos.stats'`.

- [ ] **Step 3: Write the stats module**

Create `backend/app/services/chaos/stats.py`:

```python
# backend/app/services/chaos/stats.py
from typing import Any, Dict

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun


def fetch_chaos_user_stats(user_id: int, difficulty: str) -> Dict[str, Any]:
    run_ids = db.session.scalars(
        select(ChaosRun.id).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
    ).all()
    if not run_ids:
        return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

    total = db.session.scalar(
        select(func.count(ChaosMatchLog.id)).where(ChaosMatchLog.run_id.in_(run_ids))
    ) or 0
    wins = db.session.scalar(
        select(func.count(ChaosMatchLog.id)).where(
            ChaosMatchLog.run_id.in_(run_ids), ChaosMatchLog.result == "win"
        )
    ) or 0
    win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

    recent = db.session.scalars(
        select(ChaosMatchLog).where(ChaosMatchLog.run_id.in_(run_ids))
        .order_by(ChaosMatchLog.id.desc()).limit(10)
    ).all()

    return {
        "total_matches": total,
        "wins": wins,
        "losses": total - wins,
        "win_rate": win_rate,
        "recent_logs": [log.to_dict() for log in recent],
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker cp backend/app/services/chaos dbd_backend:/app/app/services/chaos
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_stats.py -q"
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/chaos/stats.py backend/tests/unit/test_chaos_stats.py
git commit -m "feat(chaos-streak): add chaos stats aggregation"
```

---

## Task 4: `services/chaos/__init__.py` exports and `ChaosService`

**Files:**
- Modify: `backend/app/services/chaos/__init__.py`
- Create: `backend/app/services/chaos_service.py`
- Test: `backend/tests/unit/test_chaos_service.py`

**Interfaces:**
- Consumes: `ChaosRun`, `ChaosMatchLog` (Task 1); `checkpoint_interval`, `get_owned_killer_names`, `get_unlocked_killer_perks`, `draw_chaos_perks`, `draw_addon_rarities` (Task 2); `fetch_chaos_user_stats` (Task 3).
- Produces: `ChaosService` class with `get_or_create_run(user_id, difficulty) -> dict`, `reveal(user_id, run_id) -> dict`, `submit_result(user_id, run_id, result, killer_id) -> dict`, `reset_run(user_id, difficulty) -> dict`, `get_stats(user_id, difficulty) -> dict`. Every dict this returns has a `checkpoint_interval` key added on top of `ChaosRun.to_dict()`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/unit/test_chaos_service.py`:

```python
# backend/tests/unit/test_chaos_service.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, User
from app.services.chaos_service import ChaosService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class ChaosTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = ChaosService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


class TestGetOrCreateRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("chaosplayer")

    def test_creates_a_run_with_a_fresh_unrevealed_build(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(run["current_streak"], 0)
        self.assertFalse(run["perks_revealed"])
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(len(run["current_addon_rarities"]), 2)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_easy_and_hell_runs_for_the_same_user_are_independent(self):
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        easy_run = self.service.get_or_create_run(self.user_id, "easy")
        self.assertNotEqual(hell_run["id"], easy_run["id"])
        self.assertEqual(easy_run["checkpoint_interval"], 5)

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


class TestReveal(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("revealuser")

    def test_reveal_flips_the_flag(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        revealed = self.service.reveal(self.user_id, run["id"])
        self.assertTrue(revealed["perks_revealed"])

    def test_reveal_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reveal(self.user_id, 999999)


class TestHellDifficulty(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("hellplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_win_advances_streak_and_completes_killer(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertEqual(updated["current_streak"], 1)
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertEqual(len(updated["current_perks"]), 4)
        self.assertFalse(updated["perks_revealed"])

    def test_win_with_every_owned_killer_completes_the_run(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        self.assertEqual(final["status"], "completed")

    def test_one_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "The Wraith")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["used_perks"], [])

    def test_cannot_win_with_an_already_completed_killer(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        run = self.service.get_or_create_run(self.user_id, "hell")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")


class TestEasyCheckpoint(ChaosTestCase):
    def setUp(self):
        super().setUp()
        for i in range(6):
            seed_killer(f"Killer {i}")
        self.user_id = self.register_user("easyplayer")
        self.run = self.service.get_or_create_run(self.user_id, "easy")

    def _win(self, killer_name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", killer_name)

    def test_banks_a_checkpoint_every_five_wins(self):
        result = None
        for i in range(5):
            result = self._win(f"Killer {i}")
        self.assertEqual(result["current_streak"], 5)
        self.assertEqual(result["last_checkpoint_streak"], 5)
        self.assertEqual(len(result["checkpoint_killers"]), 5)

    def test_loss_before_a_checkpoint_falls_back_to_zero(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])

    def test_loss_after_a_checkpoint_falls_back_to_the_checkpoint_not_zero(self):
        for i in range(5):
            self._win(f"Killer {i}")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_streak"], 5)
        self.assertEqual(len(after_loss["completed_killers"]), 5)


class TestResetRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("resetuser")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["current_streak"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertFalse(reset["perks_revealed"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


class TestGetStats(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("statsplayer")

    def test_stats_reflect_submitted_results(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        stats = self.service.get_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 1)
        self.assertEqual(stats["wins"], 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_service.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.chaos_service'`.

- [ ] **Step 3: Wire up the package exports**

Replace `backend/app/services/chaos/__init__.py`:

```python
# backend/app/services/chaos/__init__.py
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import (
    draw_addon_rarities,
    draw_chaos_perks,
    get_owned_killer_names,
    get_unlocked_killer_perks,
)
from app.services.chaos.stats import fetch_chaos_user_stats

__all__ = [
    "DIFFICULTIES",
    "CHAOS_CHECKPOINT_INTERVAL",
    "ADDON_RARITY_POOL",
    "checkpoint_interval",
    "get_owned_killer_names",
    "get_unlocked_killer_perks",
    "draw_chaos_perks",
    "draw_addon_rarities",
    "fetch_chaos_user_stats",
]
```

- [ ] **Step 4: Write the service**

Create `backend/app/services/chaos_service.py`:

```python
# backend/app/services/chaos_service.py
import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun
from app.services.chaos import (
    checkpoint_interval,
    draw_addon_rarities,
    draw_chaos_perks,
    fetch_chaos_user_stats,
    get_owned_killer_names,
    get_unlocked_killer_perks,
)
from app.services.ownership_service import OwnershipService

logger = logging.getLogger(__name__)


class ChaosService:
    def __init__(self, ownership_service: Optional[OwnershipService] = None):
        self.ownership_service = ownership_service or OwnershipService()

    def _draw_build(self, user_id: int, used_perk_names):
        unlocked = get_unlocked_killer_perks(user_id, self.ownership_service)
        perks, updated_used = draw_chaos_perks(unlocked, used_perk_names)
        addon_rarities = draw_addon_rarities()
        return perks, updated_used, addon_rarities

    def get_or_create_run(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(ChaosRun).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
        ).first()
        if run:
            data = run.to_dict()
            data["checkpoint_interval"] = checkpoint_interval(difficulty)
            return data

        perks, used_perks, addon_rarities = self._draw_build(user_id, [])
        new_run = ChaosRun(
            user_id=user_id,
            difficulty=difficulty,
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            used_perks_json=json.dumps(used_perks),
            checkpoint_used_perks_json="[]",
            current_perks_json=json.dumps(perks),
            current_addon_rarities_json=json.dumps(addon_rarities),
            perks_revealed=False,
        )
        db.session.add(new_run)
        db.session.commit()

        data = new_run.to_dict()
        data["checkpoint_interval"] = checkpoint_interval(difficulty)
        return data

    def reveal(self, user_id: int, run_id: int) -> Dict[str, Any]:
        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.id == run_id, ChaosRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        r.perks_revealed = True
        db.session.commit()
        data = r.to_dict()
        data["checkpoint_interval"] = checkpoint_interval(r.difficulty)
        return data

    def reset_run(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
        ).first()
        if not r:
            raise ValueError("Run not found")
        db.session.delete(r)
        db.session.commit()
        return self.get_or_create_run(user_id, difficulty)

    def submit_result(self, user_id: int, run_id: int, result: str, killer_id: str) -> Dict[str, Any]:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if not killer_id:
            raise ValueError("killer_id is required")

        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.id == run_id, ChaosRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        if r.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = json.loads(r.completed_killers_json or "[]")
        checkpoint_killers = json.loads(r.checkpoint_killers_json or "[]")
        used_perks = json.loads(r.used_perks_json or "[]")
        checkpoint_used_perks = json.loads(r.checkpoint_used_perks_json or "[]")
        perks_this_round = json.loads(r.current_perks_json or "[]")
        addon_rarities_this_round = json.loads(r.current_addon_rarities_json or "[]")
        interval = checkpoint_interval(r.difficulty)

        if result == "win":
            if killer_id in completed:
                raise ValueError(f"{killer_id} has already been cleared this run")
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            completed.append(killer_id)
            if interval > 0 and streak_after % interval == 0:
                last_checkpoint = streak_after
                checkpoint_killers = list(completed)
                checkpoint_used_perks = list(used_perks)
        else:
            best_after = best_streak
            if interval > 0:
                streak_after = last_checkpoint
                completed = list(checkpoint_killers)
                used_perks = list(checkpoint_used_perks)
            else:
                streak_after = 0
                completed = []
                used_perks = []
                last_checkpoint = 0
                checkpoint_killers = []
                checkpoint_used_perks = []

        db.session.add(ChaosMatchLog(
            run_id=run_id,
            killer_id=killer_id,
            result=result,
            perks_json=json.dumps(perks_this_round),
            addon_rarities_json=json.dumps(addon_rarities_this_round),
            streak_before=current_streak,
            streak_after=streak_after,
        ))

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers_json = json.dumps(completed)
        r.checkpoint_killers_json = json.dumps(checkpoint_killers)
        r.checkpoint_used_perks_json = json.dumps(checkpoint_used_perks)

        owned = get_owned_killer_names(user_id, self.ownership_service)
        if result == "win" and owned and all(name in completed for name in owned):
            r.status = "completed"
            r.used_perks_json = json.dumps(used_perks)
            db.session.commit()
        else:
            new_perks, updated_used, addon_rarities = self._draw_build(user_id, used_perks)
            r.used_perks_json = json.dumps(updated_used)
            r.current_perks_json = json.dumps(new_perks)
            r.current_addon_rarities_json = json.dumps(addon_rarities)
            r.perks_revealed = False
            db.session.commit()

        data = r.to_dict()
        data["checkpoint_interval"] = interval
        return data

    def get_stats(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        return fetch_chaos_user_stats(user_id, difficulty)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker cp backend/app/services/chaos dbd_backend:/app/app/services/chaos
docker cp backend/app/services/chaos_service.py dbd_backend:/app/app/services/chaos_service.py
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_service.py -q"
```

Expected: `13 passed`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/chaos/__init__.py backend/app/services/chaos_service.py \
        backend/tests/unit/test_chaos_service.py
git commit -m "feat(chaos-streak): add ChaosService with checkpoint banking and revert"
```

---

## Task 5: Routes

**Files:**
- Create: `backend/app/routes/chaos_streak.py`
- Modify: `backend/app/routes/__init__.py`
- Test: `backend/tests/api/test_chaos_routes.py`

**Interfaces:**
- Consumes: `ChaosService` (Task 4).
- Produces: blueprint `chaos_streak_bp` mounted at `/api/v1/chaos-streak`, registered in the app factory.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/api/test_chaos_routes.py`:

```python
# backend/tests/api/test_chaos_routes.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class TestChaosRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        user, err = self.user_service.register_user("routeuser", "route@test.com", "password123")
        self.assertIsNone(err)
        self.user_id = user.id
        self.token = self.user_service.authenticate("routeuser", "password123")[1]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_run_requires_valid_difficulty(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=nonsense", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_reveal_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run["id"]}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()["run"]["perks_revealed"])

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertIn("The Trapper", body["run"]["completed_killers"])
        self.assertEqual(body["run"]["current_streak"], 1)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/chaos-streak/run/reset", json={"difficulty": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["current_streak"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/chaos-streak/stats?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)

    def test_runs_are_isolated_per_difficulty(self):
        hell_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        easy_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=easy", headers=self.headers
        ).get_json()["run"]
        self.assertNotEqual(hell_run["id"], easy_run["id"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/api/test_chaos_routes.py -q"
```

Expected: FAIL with 404s (blueprint not registered yet).

- [ ] **Step 3: Write the routes**

Create `backend/app/routes/chaos_streak.py`:

```python
# backend/app/routes/chaos_streak.py
from flask import Blueprint, current_app, jsonify, request, g
from app.services.chaos.constants import DIFFICULTIES
from app.services.chaos_service import ChaosService
from app.core.security import login_required

chaos_streak_bp = Blueprint("chaos_streak", __name__, url_prefix="/api/v1/chaos-streak")
_default_service = None


def get_chaos_service() -> ChaosService:
    if current_app and current_app.config.get("CHAOS_SERVICE"):
        return current_app.config["CHAOS_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = ChaosService()
    return _default_service


def _clean_difficulty(difficulty):
    if difficulty not in DIFFICULTIES:
        return None
    return difficulty


@chaos_streak_bp.route("/run", methods=["GET"])
@login_required
def get_run():
    difficulty = _clean_difficulty(request.args.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Query parameter 'difficulty' must be one of easy, medium, hell"}), 400
    service = get_chaos_service()
    run = service.get_or_create_run(g.current_user.id, difficulty)
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/reveal", methods=["POST"])
@login_required
def reveal():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    if not run_id:
        return jsonify({"error": "Field 'run_id' is required"}), 400

    service = get_chaos_service()
    try:
        run = service.reveal(g.current_user.id, run_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/result", methods=["POST"])
@login_required
def submit_result():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    result = data.get("result")
    killer_id = data.get("killer_id")
    if not run_id or result not in ("win", "loss"):
        return jsonify({"error": "Fields 'run_id' and 'result' (win/loss) are required"}), 400
    if not killer_id:
        return jsonify({"error": "Field 'killer_id' is required"}), 400

    service = get_chaos_service()
    try:
        run = service.submit_result(g.current_user.id, run_id, result, killer_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/run/reset", methods=["POST"])
@login_required
def reset_run():
    data = request.get_json(silent=True) or {}
    difficulty = _clean_difficulty(data.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Field 'difficulty' must be one of easy, medium, hell"}), 400

    service = get_chaos_service()
    try:
        run = service.reset_run(g.current_user.id, difficulty)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    difficulty = _clean_difficulty(request.args.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Query parameter 'difficulty' must be one of easy, medium, hell"}), 400
    service = get_chaos_service()
    stats = service.get_stats(g.current_user.id, difficulty)
    return jsonify({"stats": stats}), 200
```

- [ ] **Step 4: Register the blueprint**

Edit `backend/app/routes/__init__.py`. Find the line importing `gauntlet_streak_bp` (something like `from app.routes.gauntlet_streak import gauntlet_streak_bp`) and add immediately after it:

```python
from app.routes.chaos_streak import chaos_streak_bp
```

Find where `gauntlet_streak_bp` is registered on the app (a call like `app.register_blueprint(gauntlet_streak_bp)`, likely inside a `register_routes(app)` function in this same file) and add immediately after it:

```python
    app.register_blueprint(chaos_streak_bp)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker cp backend/app dbd_backend:/app/app
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/api/test_chaos_routes.py -q"
```

Expected: `9 passed`.

- [ ] **Step 6: Run the full backend suite to confirm nothing else broke**

```bash
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_chaos_models.py tests/unit/test_chaos_roller.py tests/unit/test_chaos_stats.py tests/unit/test_chaos_service.py tests/api/test_chaos_routes.py tests/unit/test_gauntlet_service.py tests/api/test_gauntlet_routes.py -q"
```

Expected: all pass, no failures.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/chaos_streak.py backend/app/routes/__init__.py \
        backend/tests/api/test_chaos_routes.py
git commit -m "feat(chaos-streak): add chaos-streak routes"
```

---

## Task 6: Frontend types and API client

**Files:**
- Create: `frontend/src/types/chaosStreak.ts`
- Create: `frontend/src/services/chaosStreakApi.ts`

**Interfaces:**
- Consumes: nothing (leaf types/HTTP layer).
- Produces: `Difficulty` type, `ChaosPerk`, `ChaosRun`, `ChaosMatchLog`, `ChaosStats`, `ChaosRunResponse`, `ChaosSubmitResultResponse`, `ChaosStatsResponse` interfaces; `fetchChaosRun`, `revealChaosBuild`, `submitChaosResult`, `resetChaosRun`, `fetchChaosStats` functions.

- [ ] **Step 1: Write the types**

Look at `frontend/src/types/gauntletStreak.ts` first (already in the repo) to match its `Perk` interface shape exactly, then create `frontend/src/types/chaosStreak.ts`:

```typescript
// frontend/src/types/chaosStreak.ts
import { Perk } from './gauntletStreak';

export type Difficulty = 'easy' | 'medium' | 'hell';

export type AddonRarity = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Ultra Rare';

export interface ChaosRun {
  id: number;
  user_id: number;
  difficulty: Difficulty;
  status: string;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  completed_killers: string[];
  checkpoint_killers: string[];
  used_perks: string[];
  checkpoint_used_perks: string[];
  current_perks: Perk[];
  current_addon_rarities: AddonRarity[];
  perks_revealed: boolean;
  checkpoint_interval: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChaosMatchLog {
  id: number;
  run_id: number;
  killer_id: string;
  result: 'win' | 'loss';
  perks: Perk[];
  addon_rarities: AddonRarity[];
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface ChaosStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: ChaosMatchLog[];
}

export interface ChaosRunResponse {
  run: ChaosRun;
}

export interface ChaosStatsResponse {
  stats: ChaosStats;
}
```

- [ ] **Step 2: Write the API client**

Look at `frontend/src/services/gauntletStreakApi.ts` first to match its `postJson`/`getJson`/base-URL helper pattern exactly, then create `frontend/src/services/chaosStreakApi.ts` following the same helpers (import them from the same shared location `gauntletStreakApi.ts` uses, or duplicate the small fetch wrapper if it is not exported):

```typescript
// frontend/src/services/chaosStreakApi.ts
import { ChaosRun, ChaosRunResponse, ChaosStatsResponse, Difficulty } from '@/types/chaosStreak';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_PREFIX = '/api/v1/chaos-streak';

async function getJson<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${backendBase}${API_PREFIX}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function postJson<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${backendBase}${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchChaosRun(token: string, difficulty: Difficulty): Promise<ChaosRun> {
  const data = await getJson<ChaosRunResponse>(token, `/run?difficulty=${difficulty}`);
  return data.run;
}

export async function revealChaosBuild(token: string, runId: number): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/reveal', { run_id: runId });
  return data.run;
}

export async function submitChaosResult(
  token: string,
  runId: number,
  result: 'win' | 'loss',
  killerId: string
): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/result', {
    run_id: runId,
    result,
    killer_id: killerId,
  });
  return data.run;
}

export async function resetChaosRun(token: string, difficulty: Difficulty): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/run/reset', { difficulty });
  return data.run;
}

export async function fetchChaosStats(token: string, difficulty: Difficulty) {
  const data = await getJson<ChaosStatsResponse>(token, `/stats?difficulty=${difficulty}`);
  return data.stats;
}
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors referencing `chaosStreak` or `chaosStreakApi`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/chaosStreak.ts frontend/src/services/chaosStreakApi.ts
git commit -m "feat(chaos-streak): add frontend types and API client"
```

---

## Task 7: `useChaosRun` hook

**Files:**
- Create: `frontend/src/components/streaks/chaos/useChaosRun.ts`

**Interfaces:**
- Consumes: `fetchChaosRun`, `revealChaosBuild`, `submitChaosResult`, `resetChaosRun`, `fetchChaosStats` (Task 6); `useAuth()` from `@/context/AuthContext` (already exists, used identically by `useGauntletRun.ts`).
- Produces: `useChaosRun(difficulty: Difficulty)` returning `{ run, stats, loading, busy, error, submitResult(result, killerId), reveal, reset, justBankedCheckpoint, dismissCheckpointCelebration }`.

- [ ] **Step 1: Write the hook**

Read `frontend/src/components/streaks/gauntlet/useGauntletRun.ts` first (already in the repo, including this session's checkpoint-celebration addition) to match its structure exactly, then create `frontend/src/components/streaks/chaos/useChaosRun.ts`:

```typescript
// frontend/src/components/streaks/chaos/useChaosRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChaosRun, ChaosStats, Difficulty } from '@/types/chaosStreak';
import * as api from '@/services/chaosStreakApi';
import { useAuth } from '@/context/AuthContext';

export function useChaosRun(difficulty: Difficulty) {
  const { token } = useAuth();
  const [run, setRun] = useState<ChaosRun | null>(null);
  const [stats, setStats] = useState<ChaosStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.fetchChaosStats(token, difficulty);
      setStats(s);
    } catch (err) {
      console.error('Failed to load chaos stats:', err);
    }
  }, [token, difficulty]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.fetchChaosRun(token, difficulty);
      setRun(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      setLoading(false);
    }
  }, [token, difficulty]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const mutate = useCallback(
    async (action: () => Promise<ChaosRun>) => {
      if (!token) return;
      setBusy(true);
      setError(null);
      try {
        setRun(await action());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const submitResult = useCallback(
    async (result: 'win' | 'loss', killerId: string) => {
      if (!token || !run) return;
      const checkpointBefore = run.last_checkpoint_streak;
      setBusy(true);
      setError(null);
      try {
        const updated = await api.submitChaosResult(token, run.id, result, killerId);
        const justFinished = updated.status === 'completed';
        setRun(updated);
        loadStats();
        if (
          result === 'win' &&
          !justFinished &&
          updated.last_checkpoint_streak > checkpointBefore
        ) {
          setJustBankedCheckpoint(updated.last_checkpoint_streak);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record the result');
      } finally {
        setBusy(false);
      }
    },
    [token, run, loadStats]
  );

  const dismissCheckpointCelebration = useCallback(() => {
    setJustBankedCheckpoint(null);
  }, []);

  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealChaosBuild(token, run.id));
  }, [token, run, mutate]);

  const reset = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    return mutate(() => api.resetChaosRun(token, difficulty));
  }, [token, difficulty, mutate]);

  return {
    run,
    stats,
    loading,
    busy,
    error,
    reload: load,
    submitResult,
    reveal,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  };
}
```

Note the difference from `useGauntletRun`: `submitResult` here takes `(result, killerId)` since the killer is chosen by the caller, not stored server-side ahead of time.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/streaks/chaos/useChaosRun.ts
git commit -m "feat(chaos-streak): add useChaosRun hook"
```

---

## Task 8: `KillerPickerGrid`

**Files:**
- Create: `frontend/src/components/streaks/chaos/KillerPickerGrid.tsx`
- Create: `frontend/src/components/streaks/chaos/useOwnedKillers.ts`

**Interfaces:**
- Consumes: `useAuth()` from `@/context/AuthContext`.
- Produces: `useOwnedKillers()` returning `{ killers: string[], loading: boolean }` (every owned killer name, no roster cap). `KillerPickerGrid` component with props `{ killers: string[], completedKillers: string[], selectedKillerId: string | null, onSelect: (name: string) => void, disabled?: boolean }`.

- [ ] **Step 1: Write `useOwnedKillers`**

Read `frontend/src/components/streaks/gauntlet/useOwnedCharacters.ts` first for the fetch pattern, then create `frontend/src/components/streaks/chaos/useOwnedKillers.ts` (deliberately with no roster-cap filtering, per Global Constraints):

```typescript
// frontend/src/components/streaks/chaos/useOwnedKillers.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useOwnedKillers() {
  const { token, user } = useAuth();
  const [killers, setKillers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters?role=Killer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const owned = (data.data || []).filter((c: any) => c.is_owned);
        setKillers(owned.map((c: any) => c.name));
      }
    } catch (err) {
      console.error('Failed to load owned killers:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { killers, loading, reload: load };
}
```

- [ ] **Step 2: Write `KillerPickerGrid`**

Read `frontend/src/components/streaks/gauntlet/CharacterRosterGrid.tsx` first for the avatar-tile visual pattern (image URL construction, completed-state styling), then create `frontend/src/components/streaks/chaos/KillerPickerGrid.tsx`:

```typescript
// frontend/src/components/streaks/chaos/KillerPickerGrid.tsx
'use client';

import React, { useState } from 'react';
import { Check, Skull } from 'lucide-react';

export interface KillerPickerGridProps {
  killers: string[];
  completedKillers: string[];
  selectedKillerId: string | null;
  onSelect: (name: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const avatarUrlFor = (name: string) => {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${backendBase}/static/avatars/killers/${sanitized}.png`;
};

const KillerTile: React.FC<{
  name: string;
  isCompleted: boolean;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (name: string) => void;
}> = ({ name, isCompleted, isSelected, disabled, onSelect }) => {
  const [failed, setFailed] = useState(false);
  const src = avatarUrlFor(name);

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      disabled={disabled || isCompleted}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        isSelected
          ? 'border-violet-400 bg-violet-500/10 ring-2 ring-violet-400'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-violet-400/60'
      }`}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {!failed ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <Skull className="w-8 h-8 text-slate-400" />
        )}
        {isCompleted && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-700 dark:text-slate-200 truncate w-full">
        {name}
      </span>
    </button>
  );
};

export const KillerPickerGrid: React.FC<KillerPickerGridProps> = ({
  killers,
  completedKillers,
  selectedKillerId,
  onSelect,
  disabled = false,
  loading = false,
}) => {
  if (loading) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">Loading your killers...</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {killers.map((name) => (
        <KillerTile
          key={name}
          name={name}
          isCompleted={completedKillers.includes(name)}
          isSelected={selectedKillerId === name}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/chaos/KillerPickerGrid.tsx \
        frontend/src/components/streaks/chaos/useOwnedKillers.ts
git commit -m "feat(chaos-streak): add killer picker grid"
```

---

## Task 9: `SlotMachineStage` (reel animation + addon badges + lever)

**Files:**
- Create: `frontend/src/components/streaks/chaos/useSlotReels.ts`
- Create: `frontend/src/components/streaks/chaos/SlotMachineStage.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Consumes: `Perk`, `AddonRarity` types (Task 6); `getRarityTileStyle` from `frontend/src/components/character-detail/types.tsx` (already exists).
- Produces: `useSlotReels(finalPerks: Perk[])` returning `{ isSpinning: boolean, reelDisplay: (Perk | null)[], start: (onDone: () => void) => void }`. `SlotMachineStage` component with props `{ perks: Perk[], addonRarities: AddonRarity[], revealed: boolean, onPullLever: () => void, loading?: boolean }`.

- [ ] **Step 1: Add the reel keyframes**

Read `frontend/src/app/globals.css` first to find the existing `gn-spin-frame`/`gn-land-frame`/`gn-land-glow` keyframes (added for Gauntlet's reveal this session). Add immediately after the `.gn-land-glow` rule:

```css
/* Chaos Streak slot reel: perks blur past vertically before landing. */
@keyframes chaosReelSpinUp {
  from { transform: translateY(30%); opacity: .4; filter: blur(1.5px); }
  to { transform: translateY(0); opacity: 1; filter: blur(0); }
}

@keyframes chaosReelSpinDown {
  from { transform: translateY(-30%); opacity: .4; filter: blur(1.5px); }
  to { transform: translateY(0); opacity: 1; filter: blur(0); }
}

@keyframes chaosLeverPull {
  0% { transform: translateY(0) rotate(0deg); }
  40% { transform: translateY(28px) rotate(18deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

@keyframes chaosBadgePop {
  from { transform: scale(.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  to { transform: scale(1); opacity: 1; }
}

.chaos-reel-up { animation: chaosReelSpinUp 90ms linear both; }
.chaos-reel-down { animation: chaosReelSpinDown 90ms linear both; }
.chaos-lever-pull { animation: chaosLeverPull 550ms cubic-bezier(.36, 0, .66, -0.56) both; }
.chaos-badge-pop { animation: chaosBadgePop 380ms cubic-bezier(.22, 1.4, .36, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .chaos-reel-up,
  .chaos-reel-down,
  .chaos-lever-pull,
  .chaos-badge-pop {
    animation: none;
  }
}
```

- [ ] **Step 2: Write the reel-timing hook**

Read `frontend/src/components/streaks/gauntlet/useTargetDraw.ts` first for the eased-delay timing approach, then create `frontend/src/components/streaks/chaos/useSlotReels.ts`:

```typescript
// frontend/src/components/streaks/chaos/useSlotReels.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Perk } from '@/types/gauntletStreak';

/** How long each reel spins before landing on its final perk. */
const REEL_SPIN_MS = [900, 1150, 1400, 1650];
/** How many placeholder frames flash by before landing, per reel. */
const FLASH_STEPS = 10;

export type ReelDirection = 'up' | 'down';

export function useSlotReels(finalPerks: Perk[]) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelDisplay, setReelDisplay] = useState<(Perk | null)[]>([null, null, null, null]);
  const [landedMask, setLandedMask] = useState<boolean[]>([false, false, false, false]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const start = useCallback(
    (onDone: () => void) => {
      if (finalPerks.length !== 4) return;
      clearTimers();
      setIsSpinning(true);
      setLandedMask([false, false, false, false]);

      finalPerks.forEach((_, reelIndex) => {
        const spinMs = REEL_SPIN_MS[reelIndex];
        const stepMs = spinMs / FLASH_STEPS;

        for (let step = 0; step < FLASH_STEPS; step += 1) {
          const t = setTimeout(() => {
            const flashPerk = finalPerks[(reelIndex + step) % finalPerks.length];
            setReelDisplay((prev) => {
              const next = [...prev];
              next[reelIndex] = flashPerk;
              return next;
            });
          }, step * stepMs);
          timeoutsRef.current.push(t);
        }

        const landTimer = setTimeout(() => {
          setReelDisplay((prev) => {
            const next = [...prev];
            next[reelIndex] = finalPerks[reelIndex];
            return next;
          });
          setLandedMask((prev) => {
            const next = [...prev];
            next[reelIndex] = true;
            return next;
          });
          if (reelIndex === finalPerks.length - 1) {
            setIsSpinning(false);
            onDone();
          }
        }, spinMs);
        timeoutsRef.current.push(landTimer);
      });
    },
    [finalPerks]
  );

  return { isSpinning, reelDisplay, landedMask, start };
}
```

- [ ] **Step 3: Write `SlotMachineStage`**

Read `frontend/src/components/character-detail/types.tsx` first for `getRarityTileStyle`'s exact export name and shape (already confirmed present this session), then create `frontend/src/components/streaks/chaos/SlotMachineStage.tsx`:

```typescript
// frontend/src/components/streaks/chaos/SlotMachineStage.tsx
'use client';

import React, { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { AddonRarity } from '@/types/chaosStreak';
import { getRarityTileStyle } from '@/components/character-detail/types';
import { useSlotReels, ReelDirection } from './useSlotReels';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const REEL_DIRECTIONS: ReelDirection[] = ['up', 'down', 'down', 'up'];

const perkIconFor = (perk: Perk) => {
  const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  return cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
};

const ReelWindow: React.FC<{ perk: Perk | null; direction: ReelDirection; spinning: boolean; landed: boolean }> = ({
  perk,
  direction,
  spinning,
  landed,
}) => {
  const [failed, setFailed] = useState(false);
  const src = perk ? perkIconFor(perk) : undefined;
  const motionClass = spinning ? (direction === 'up' ? 'chaos-reel-up' : 'chaos-reel-down') : '';

  return (
    <div
      className={`relative w-full aspect-square overflow-hidden rounded-2xl border-2 bg-slate-950 flex items-center justify-center transition-shadow ${
        landed ? 'border-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.5)]' : 'border-violet-500/30'
      }`}
    >
      {perk && src && !failed ? (
        <img
          key={perk.id ?? perk.name}
          src={src}
          alt={perk.name}
          className={`w-full h-full object-contain p-2 ${motionClass}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <Sparkles className="w-8 h-8 text-violet-400/50" />
      )}
    </div>
  );
};

const RarityBadge: React.FC<{ rarity: AddonRarity; index: number; visible: boolean }> = ({
  rarity,
  index,
  visible,
}) => {
  const style = getRarityTileStyle(rarity);
  if (!visible) return <div className="h-9" />;
  return (
    <span
      className={`chaos-badge-pop inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${style.badge}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      Add-on {index + 1}: {rarity}
    </span>
  );
};

export interface SlotMachineStageProps {
  perks: Perk[];
  addonRarities: AddonRarity[];
  revealed: boolean;
  onPullLever: () => void;
  loading?: boolean;
}

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  perks,
  addonRarities,
  revealed,
  onPullLever,
  loading = false,
}) => {
  const { isSpinning, reelDisplay, landedMask, start } = useSlotReels(perks);
  const [leverPulled, setLeverPulled] = useState(false);
  const [hasSpunThisBuild, setHasSpunThisBuild] = useState(revealed);

  const needsSpin = revealed && !hasSpunThisBuild && !isSpinning;

  React.useEffect(() => {
    if (!revealed) {
      setHasSpunThisBuild(false);
    }
  }, [revealed, perks]);

  React.useEffect(() => {
    if (needsSpin) {
      start(() => setHasSpunThisBuild(true));
    }
  }, [needsSpin, start]);

  const handlePull = () => {
    if (isSpinning || loading) return;
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 600);
    onPullLever();
  };

  const showBadges = revealed && hasSpunThisBuild;

  return (
    <div className="w-full rounded-3xl border-2 border-violet-500/40 bg-gradient-to-b from-[#1a0b2e] to-[#0d0517] p-6 shadow-2xl shadow-violet-950/50">
      <div className="flex items-end gap-4">
        <div className="grid flex-1 grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ReelWindow
              key={i}
              perk={revealed ? reelDisplay[i] : null}
              direction={REEL_DIRECTIONS[i]}
              spinning={isSpinning}
              landed={landedMask[i] && !isSpinning}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handlePull}
          disabled={isSpinning || loading}
          aria-label="Pull the lever"
          className="flex flex-col items-center gap-1 pb-2 disabled:opacity-50 cursor-pointer"
        >
          <div className="h-16 w-3 rounded-full bg-gradient-to-b from-slate-700 to-slate-900" />
          <div
            className={`h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-300 shadow-lg ${
              leverPulled ? 'chaos-lever-pull' : ''
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 justify-center min-h-[2.25rem]">
        {revealed ? (
          <>
            <RarityBadge rarity={addonRarities[0]} index={0} visible={showBadges} />
            <RarityBadge rarity={addonRarities[1]} index={1} visible={showBadges} />
          </>
        ) : (
          <p className="text-xs text-violet-300/70">Pull the lever to draw this round's build.</p>
        )}
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-violet-300/60 text-xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors. If `getRarityTileStyle` is not exported from `frontend/src/components/character-detail/types.tsx`, adjust the import path to wherever it actually is (confirmed present in this repo as of this session; re-check with `grep -n "export function getRarityTileStyle" frontend/src/components/character-detail/types.tsx` if the import fails).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/chaos/useSlotReels.ts \
        frontend/src/components/streaks/chaos/SlotMachineStage.tsx \
        frontend/src/app/globals.css
git commit -m "feat(chaos-streak): add slot machine reel animation and lever"
```

---

## Task 10: `ChaosModeModal`, panel unlock, and route

**Files:**
- Create: `frontend/src/components/streaks/chaos/ChaosModeModal.tsx`
- Modify: `frontend/src/components/streaks/panels.ts`
- Modify: `frontend/src/components/streaks/StreakPanelGrid.tsx`
- Create: `frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx`

**Interfaces:**
- Consumes: `Difficulty` type (Task 6).
- Produces: `ChaosModeModal` component with props `{ isOpen: boolean, onClose: () => void, onSelectDifficulty: (difficulty: Difficulty) => void }`. Route `/[locale]/streaks/killer/chaos-streak`.

- [ ] **Step 1: Write the mode modal**

Read `frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx` first for the tile-modal structure, then create `frontend/src/components/streaks/chaos/ChaosModeModal.tsx`:

```typescript
// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, Coins, Flame, Skull } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';

export interface ChaosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

const TILES: { difficulty: Difficulty; label: string; desc: string; icon: React.ElementType }[] = [
  { difficulty: 'easy', label: 'Easy', desc: 'A checkpoint banks every 5 wins.', icon: Coins },
  { difficulty: 'medium', label: 'Medium', desc: 'A checkpoint banks every 10 wins.', icon: Flame },
  { difficulty: 'hell', label: 'Hell', desc: 'No checkpoints. One loss resets everything.', icon: Skull },
];

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({ isOpen, onClose, onSelectDifficulty }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose a difficulty</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.difficulty}
                onClick={() => onSelectDifficulty(tile.difficulty)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 p-5 text-left transition-colors cursor-pointer"
              >
                <Icon className="w-6 h-6 text-violet-400" />
                <span className="font-bold text-slate-900 dark:text-white">{tile.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tile.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Unlock the panel**

Edit `frontend/src/components/streaks/panels.ts`. Find the `chaos-streak` entry in `KILLER_STREAK_PANELS` (currently `comingSoon: true` with `text-slate-400` accent). Replace the whole object:

```typescript
  {
    id: 'chaos-streak',
    title: 'Chaos streak',
    description: 'Every round randomises 4 perks and 2 addon rarities. You pick which killer plays them.',
    icon: Shuffle,
    accent: 'text-violet-400',
    accentBorder: 'border-violet-500/20',
  },
```

- [ ] **Step 3: Wire the click handler**

Read `frontend/src/components/streaks/StreakPanelGrid.tsx` first to see exactly how it special-cases `panel.id === 'gauntlet-streak'` (opens `GauntletModeModal` via local `isModeModalOpen` state instead of navigating). Add a second `chaos-streak` case following the identical pattern: a new `isChaosModeModalOpen` state, a `panel.id === 'chaos-streak'` branch that calls `setIsChaosModeModalOpen(true)` instead of rendering an `href`, and a `<ChaosModeModal>` instance at the end of the component whose `onSelectDifficulty` pushes to `` `/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}` `` via the same `router.push` already used for Gauntlet's `onSelectOriginal`. Import `ChaosModeModal` from `'./chaos/ChaosModeModal'` and `Difficulty` from `'@/types/chaosStreak'`.

- [ ] **Step 4: Add the route**

Read `frontend/src/app/[locale]/streaks/killer/gauntlet-streak/page.tsx` first for the page-file pattern, then create `frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx`:

```typescript
// frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx
import { ChaosBoard } from '@/components/streaks/chaos/ChaosBoard';

export default async function ChaosStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ChaosBoard locale={locale} />;
}
```

(`ChaosBoard` is built in Task 11; this file will not compile until then, which is expected mid-plan — the typecheck for this task covers everything except the page file, deferred to Task 11's typecheck.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/chaos/ChaosModeModal.tsx \
        frontend/src/components/streaks/panels.ts \
        frontend/src/components/streaks/StreakPanelGrid.tsx \
        "frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx"
git commit -m "feat(chaos-streak): unlock the panel and add the mode modal and route"
```

---

## Task 11: `ChaosBoard` (final integration)

**Files:**
- Create: `frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx`
- Create: `frontend/src/components/streaks/chaos/ChaosBoard.tsx`

**Interfaces:**
- Consumes: everything from Tasks 6 through 10.
- Produces: `ChaosBoard` component with props `{ locale: string }`, reading `?difficulty=` from the URL (defaulting to `"hell"` if absent) and rendering the full round flow described in the spec's section 2.

- [ ] **Step 1: Write the checkpoint modal**

Read `frontend/src/components/streaks/gauntlet/CheckpointModal.tsx` first (built this session), then create `frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx` as a copy adapted for killers instead of a generic `role`, with a violet accent instead of amber, and no `nextTier` prop (Chaos has no tier ladder, so drop that section entirely):

```typescript
// frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx
'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';

export interface ChaosCheckpointModalProps {
  checkpoint: number | null;
  onClose: () => void;
}

export const ChaosCheckpointModal: React.FC<ChaosCheckpointModalProps> = ({ checkpoint, onClose }) => {
  useEffect(() => {
    if (checkpoint == null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint, onClose]);

  if (checkpoint == null) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-violet-400 bg-gradient-to-b from-violet-500/15 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-violet-500/20 cursor-default"
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-violet-400 bg-violet-500/15 text-violet-400">
          <ShieldCheck className="h-10 w-10" />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400">
          <PartyPopper className="h-3.5 w-3.5" />
          Checkpoint banked
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{checkpoint} wins</h2>
        <p className="mt-2 text-sm text-slate-300">
          Lose from here and you fall back to <strong className="text-violet-300">{checkpoint}</strong>, not to
          zero.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-violet-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 cursor-pointer"
        >
          Keep going
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write `ChaosBoard`**

Read `frontend/src/components/streaks/gauntlet/GauntletBoard.tsx` first (this session's version, including the fire-background removal, reset panel, and checkpoint modal wiring) to match its header/stats-drawer/confetti/reset-panel structure, then create `frontend/src/components/streaks/chaos/ChaosBoard.tsx`:

```typescript
// frontend/src/components/streaks/chaos/ChaosBoard.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { useChaosRun } from './useChaosRun';
import { useOwnedKillers } from './useOwnedKillers';
import { SlotMachineStage } from './SlotMachineStage';
import { KillerPickerGrid } from './KillerPickerGrid';
import { ChaosCheckpointModal } from './ChaosCheckpointModal';

interface ChaosBoardProps {
  locale: string;
}

export const ChaosBoard: React.FC<ChaosBoardProps> = ({ locale }) => {
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'hell';

  const {
    run,
    stats,
    loading,
    busy,
    error,
    submitResult,
    reveal,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  } = useChaosRun(difficulty);
  const { killers, loading: loadingKillers } = useOwnedKillers();

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const completed = run?.status === 'completed';
    if (completed && !wasCompletedRef.current) {
      setCelebrating(true);
      wasCompletedRef.current = true;
      const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
      return () => clearTimeout(timer);
    }
    if (!completed) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);

  useEffect(() => {
    if (justBankedCheckpoint == null) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [justBankedCheckpoint]);

  useEffect(() => {
    setSelectedKillerId(null);
  }, [run?.current_perks]);

  const isCompleted = run?.status === 'completed';
  const remainingKillers = killers.filter((name) => !(run?.completed_killers || []).includes(name));

  const handleResult = (result: 'win' | 'loss') => {
    if (!selectedKillerId) return;
    submitResult(result, selectedKillerId);
  };

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-violet-500 dark:text-slate-400 dark:hover:text-violet-400 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to killer streaks</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <span>{error}</span>
          </div>
        )}

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
              Chaos Streak &middot; {difficulty}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Streak {run?.current_streak ?? 0} &middot; Best {run?.best_streak ?? 0}
            </p>
          </div>
        </header>

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Chaos Streak complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You won with every killer you own on {difficulty}.
            </p>
            <button
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Start a new run
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <SlotMachineStage
                perks={run?.current_perks || []}
                addonRarities={run?.current_addon_rarities || []}
                revealed={Boolean(run?.perks_revealed)}
                onPullLever={reveal}
                loading={loading || busy}
              />
            </div>

            {run?.perks_revealed && (
              <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Pick your killer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A win needs 3 kills or more.
                  </p>
                </div>
                <KillerPickerGrid
                  killers={remainingKillers}
                  completedKillers={run?.completed_killers || []}
                  selectedKillerId={selectedKillerId}
                  onSelect={setSelectedKillerId}
                  disabled={busy}
                  loading={loadingKillers}
                />

                <div className="mt-5 flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleResult('win')}
                    disabled={busy || !selectedKillerId}
                    className="flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    WIN MATCH
                  </button>
                  <button
                    onClick={() => handleResult('loss')}
                    disabled={busy || !selectedKillerId}
                    className="flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    LOSE MATCH
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!isCompleted && (
          <div className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm px-4 py-4 shadow-sm">
            {confirmingReset ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Wipe this run? Streak, checkpoints and every cleared killer go back to zero. This cannot be
                  undone.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingReset(false);
                      reset();
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Yes, wipe it
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingReset(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset this run
              </button>
            )}
          </div>
        )}

        <ChaosCheckpointModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors anywhere in `frontend/src/components/streaks/chaos/` or the new page route.

- [ ] **Step 4: Production build**

```bash
./node_modules/.bin/next build
```

Expected: succeeds, and the route list includes `/[locale]/streaks/killer/chaos-streak`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx \
        frontend/src/components/streaks/chaos/ChaosBoard.tsx
git commit -m "feat(chaos-streak): add ChaosBoard, wiring the full round flow together"
```

---

## Task 12: Full-stack verification

**Files:** none created or modified; this task only runs checks.

- [ ] **Step 1: Full backend suite**

```bash
docker cp backend/app dbd_backend:/app/app
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/ -q --ignore=tests/api/test_item_routes.py --ignore=tests/scrapers/test_scraper_config.py"
```

Expected: only the pre-existing failures already present on a clean `develop` checkout (confirmed earlier this session via an isolated worktree diff) — no new failures from `chaos`.

- [ ] **Step 2: Rebuild and restart both containers**

```bash
docker compose build backend frontend
docker compose up -d backend frontend
```

- [ ] **Step 3: Live smoke test through the running stack**

```bash
docker exec dbd_backend python3 -c "
import urllib.request, json

base = 'http://localhost:5000/api/v1'

def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Content-Type': 'application/json'} if body is not None else {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(base + path, method=method, data=data, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

login = call('POST', '/auth/login', body={'username': 'lemon', 'password': 'lemon'})
token = login['token']
print('login OK')

call('POST', '/chaos-streak/run/reset', token=token, body={'difficulty': 'hell'})
run = call('GET', '/chaos-streak/run?difficulty=hell', token=token)['run']
print('fresh run: streak', run['current_streak'], '| perks', len(run['current_perks']), '| addon rarities', run['current_addon_rarities'])
run_id = run['id']

reveal = call('POST', '/chaos-streak/reveal', token=token, body={'run_id': run_id})['run']
print('after reveal: perks_revealed =', reveal['perks_revealed'])

owned = call('GET', '/users/' + str(login['user']['id']) + '/characters?role=Killer', token=token)['data']
killer = next(c['name'] for c in owned if c['is_owned'])
print('picking killer:', killer)

result = call('POST', '/chaos-streak/result', token=token, body={'run_id': run_id, 'result': 'win', 'killer_id': killer})['run']
print('after win: streak', result['current_streak'], '| completed', result['completed_killers'])
"
```

Expected: prints a coherent sequence ending with `streak 1` and the picked killer in `completed_killers`, matching the pattern already used to verify Gauntlet live this session.

- [ ] **Step 4: Confirm the panel and bundle**

```bash
docker exec dbd_frontend sh -c "grep -rl 'Chaos streak' /app/.next/static/chunks >/dev/null 2>&1 && echo shipped || echo MISSING"
curl -sk -o /dev/null -w "chaos-streak page: HTTP %{http_code}\n" https://localhost/en/streaks/killer/chaos-streak
```

Expected: `shipped`, `HTTP 200`.

- [ ] **Step 5: Final commit if any of the above required fixes**

```bash
git add -A
git commit -m "chore(chaos-streak): fixes from full-stack verification" --allow-empty
```

(Only commit if Steps 1 to 4 required actual code changes; otherwise skip this step.)

# History Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the History Streak challenge — a killer-only run where owned killers (sorted by release order) are grouped into rows of 5, one row unlocked at a time; winning a killer adds their teachable perks to a growing unlocked-perk pool; two modes control loss fallback (`medium`: checkpoint per cleared row, `hell`: any loss resets to zero).

**Architecture:** Mirrors Chaos Streak's package layout: `models/history.py`, `services/history/roster.py` (pure roster/row/perk-name helpers, no DB writes) behind `services/history_service.py`, a Flask blueprint at `/api/v1/history-streak`, and `components/streaks/history/` on the frontend. No perk drawing, no addon rarity, no reveal-lever step — rows and the perk pool are the entire mechanic.

**Tech Stack:** Flask + SQLAlchemy + pytest (backend), Next.js 16 + React 19 + TypeScript (frontend), Tailwind CSS. Reuses the existing `KillerPickerGrid` component as-is (same props shape).

**Spec:** `docs/superpowers/specs/2026-08-20-history-streak-design.md`

## Global Constraints

- Killer-only. No survivor variant.
- Rows = the player's *owned* killers only, sorted by `Character.release_number` (nulls last), chunked into groups of 5. Unowned killers never appear as gaps.
- Modes: `medium` (checkpoint every row cleared) and `hell` (any loss resets everything). No `easy` tier for this challenge.
- Win requires beating the picked killer once — no kill-count threshold, no perk/addon draw, no Accept step. Pick a killer from the active row, then Win/Lose directly.
- Starting perk pool is every General-category killer perk (`Perk.category == "Killer"` and (`character_id IS NULL` or `is_generic_counterpart`)). Winning with a killer adds that killer's teachable perks (`character_id == killer.id`, `is_teachable`) to the pool.
- No dashes (`—`) or hyphen ranges in UI copy.
- Every new backend module gets a `# path/to/file.py` header comment on line 1.
- Every new frontend `.tsx`/`.ts` file gets a `// path/to/file.tsx` header comment on line 1 (or line 2 if `'use client'` is line 1).
- Backend tests run inside the `dbd_backend` container: `docker cp backend/app dbd_backend:/app/app`, `docker cp backend/tests dbd_backend:/app/tests`, then `docker exec dbd_backend sh -c "cd /app && python -m pytest <path> -q"`.
- Frontend checks run from `frontend/`: `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/next build`.
- Every task ends with a commit on branch `feature/history-streak` (already created off `develop` and pushed).

---

## Task 1: `HistoryRun` and `HistoryMatchLog` models, schemas, and schema bootstrapping

**Files:**
- Create: `backend/app/models/history.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/history.py`
- Modify: `backend/app/schemas/__init__.py`
- Modify: `backend/app/services/db/raw_schema.py`
- Test: `backend/tests/unit/test_history_models.py`

**Interfaces:**
- Produces: `HistoryRun` (SQLAlchemy model, `history_runs` table), `HistoryMatchLog` (`history_match_logs` table), both importable from `app.models`. `HistoryRun.to_dict()` returns: `id, user_id, mode, status, current_row_index, total_killers_beaten, best_killers_beaten, completed_killers (list[str]), unlocked_perk_names (list[str]), checkpoint_row_index, created_at, updated_at`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_history_models.py`:

```python
# backend/tests/unit/test_history_models.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import HistoryRun, HistoryMatchLog, User


class TestHistoryModels(unittest.TestCase):
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
        user = User(username="historyuser", email="history@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_history_run_round_trip(self):
        user = self._make_user()
        run = HistoryRun(
            user_id=user.id,
            mode="medium",
            status="in_progress",
            current_row_index=1,
            total_killers_beaten=6,
            best_killers_beaten=6,
            completed_killers_json=json.dumps(["The Wraith"]),
            unlocked_perk_names_json=json.dumps(["Hex: Ruin", "Save the Best for Last"]),
            checkpoint_row_index=1,
            checkpoint_total_killers_beaten=5,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=json.dumps(["Hex: Ruin"]),
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["mode"], "medium")
        self.assertEqual(d["current_row_index"], 1)
        self.assertEqual(d["total_killers_beaten"], 6)
        self.assertEqual(d["completed_killers"], ["The Wraith"])
        self.assertEqual(d["unlocked_perk_names"], ["Hex: Ruin", "Save the Best for Last"])
        self.assertEqual(d["checkpoint_row_index"], 1)

    def test_unique_constraint_on_user_and_mode(self):
        user = self._make_user()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        db.session.commit()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_history_match_log_round_trip(self):
        user = self._make_user()
        run = HistoryRun(user_id=user.id, mode="hell")
        db.session.add(run)
        db.session.commit()

        log = HistoryMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            row_index=0,
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["result"], "win")
        self.assertEqual(d["row_index"], 0)
        self.assertEqual(d["streak_after"], 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_models.py -q"
```

Expected: FAIL with `ImportError: cannot import name 'HistoryRun' from 'app.models'`.

- [ ] **Step 3: Write the models**

Create `backend/app/models/history.py`:

```python
# backend/app/models/history.py
import json
from datetime import datetime
from typing import List
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class HistoryRun(Base):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    mode: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_row_index: Mapped[int] = mapped_column(Integer, default=0)
    total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    best_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_row_index: Mapped[int] = mapped_column(Integer, default=0)
    checkpoint_total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    checkpoint_completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "current_row_index": self.current_row_index,
            "total_killers_beaten": self.total_killers_beaten,
            "best_killers_beaten": self.best_killers_beaten,
            "completed_killers": json.loads(self.completed_killers_json or "[]"),
            "unlocked_perk_names": json.loads(self.unlocked_perk_names_json or "[]"),
            "checkpoint_row_index": self.checkpoint_row_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class HistoryMatchLog(Base):
    __tablename__ = "history_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("history_runs.id", ondelete="CASCADE"), index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    row_index: Mapped[int] = mapped_column(Integer)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["HistoryRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "row_index": self.row_index,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
```

Edit `backend/app/models/__init__.py`. Find:

```python
from app.models.chaos import ChaosMatchLog, ChaosRun
```

Add immediately after it:

```python
from app.models.history import HistoryMatchLog, HistoryRun
```

Find the `__all__` list's `"ChaosMatchLog",` line and add after it:

```python
    "HistoryRun",
    "HistoryMatchLog",
```

- [ ] **Step 4: Add the Pydantic schema scaffolding**

Create `backend/app/schemas/history.py`:

```python
# backend/app/schemas/history.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class HistoryMatchLogBase(BaseModel):
    killer_id: str
    result: str
    row_index: int
    streak_before: int
    streak_after: int


class HistoryMatchLogResponse(HistoryMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class HistoryRunBase(BaseModel):
    mode: str
    status: str = "in_progress"
    current_row_index: int = 0
    total_killers_beaten: int = 0
    best_killers_beaten: int = 0


class HistoryRunResponse(HistoryRunBase):
    id: int
    user_id: int
    completed_killers: List[str] = []
    unlocked_perk_names: List[str] = []
    checkpoint_row_index: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
```

Edit `backend/app/schemas/__init__.py`. Find the `from app.schemas.chaos import (...)` block and add immediately after its closing `)`:

```python
from app.schemas.history import (
    HistoryMatchLogBase,
    HistoryMatchLogResponse,
    HistoryRunBase,
    HistoryRunResponse,
)
```

Find the `__all__` list's `"ChaosMatchLogResponse",` line and add after it:

```python
    "HistoryRunBase",
    "HistoryRunResponse",
    "HistoryMatchLogBase",
    "HistoryMatchLogResponse",
```

- [ ] **Step 5: Add the SQLite fallback DDL**

Edit `backend/app/services/db/raw_schema.py`. Find the `chaos_match_logs` `CREATE TABLE` block (it ends with `FOREIGN KEY (run_id) REFERENCES chaos_runs(id) ON DELETE CASCADE\n);`). Add immediately after it:

```sql

CREATE TABLE IF NOT EXISTS history_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mode TEXT NOT NULL CHECK (mode IN ('medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_row_index INTEGER NOT NULL DEFAULT 0,
    total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    best_killers_beaten INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_row_index INTEGER NOT NULL DEFAULT 0,
    checkpoint_total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    checkpoint_completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    row_index INTEGER NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES history_runs(id) ON DELETE CASCADE
);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
docker cp backend/app dbd_backend:/app/app
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_models.py -q"
```

Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/history.py backend/app/models/__init__.py \
        backend/app/schemas/history.py backend/app/schemas/__init__.py \
        backend/app/services/db/raw_schema.py backend/tests/unit/test_history_models.py
git commit -m "feat(history-streak): add HistoryRun and HistoryMatchLog models"
```

---

## Task 2: Roster and perk-name helpers (`services/history/roster.py`)

**Files:**
- Create: `backend/app/services/history/__init__.py`
- Create: `backend/app/services/history/roster.py`
- Test: `backend/tests/unit/test_history_roster.py`

**Interfaces:**
- Consumes: `OwnershipService.get_user_characters(user_id, role)` (existing, used identically by `app.services.chaos.roller`). `app.models.Character`, `app.models.Perk` (existing).
- Produces: `ROW_SIZE: int` (5), `build_rows(owned_killer_names: List[str]) -> List[List[str]]`, `get_owned_killer_names_by_release(user_id, ownership_service) -> List[str]`, `get_general_killer_perk_names() -> List[str]`, `get_killer_teachable_perk_names(killer_name: str) -> List[str]`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/unit/test_history_roster.py`:

```python
# backend/tests/unit/test_history_roster.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_names_by_release,
)
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


class TestBuildRows(unittest.TestCase):
    def test_row_size_is_five(self):
        self.assertEqual(ROW_SIZE, 5)

    def test_chunks_into_rows_of_five(self):
        names = [f"Killer {i}" for i in range(12)]
        rows = build_rows(names)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0], names[0:5])
        self.assertEqual(rows[1], names[5:10])
        self.assertEqual(rows[2], names[10:12])

    def test_empty_list_yields_no_rows(self):
        self.assertEqual(build_rows([]), [])


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class HistoryRosterTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


class TestGetOwnedKillerNamesByRelease(HistoryRosterTestCase):
    def test_sorted_by_release_number(self):
        seed_killer("The Nurse", release_number=4)
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("rosteruser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Wraith", "The Nurse"])

    def test_null_release_number_sorts_last(self):
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Mystery", release_number=None)
        user_id = self.register_user("nulluser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Mystery"])

    def test_unowned_killers_excluded(self):
        seed_killer("The Trapper", release_number=1)
        char2 = seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("partialowner")
        self.ownership_service.set_character_ownership(user_id, char2.id, is_owned=False)

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper"])


class TestPerkNameHelpers(HistoryRosterTestCase):
    def test_general_perks_have_no_character(self):
        db.session.add(Perk(name="Whispers", character_id=None, category="Killer"))
        db.session.add(Perk(name="A Nurse's Calling", character_id=None, category="Killer"))
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertIn("Whispers", names)
        self.assertIn("A Nurse's Calling", names)

    def test_general_perks_exclude_teachables(self):
        char = seed_killer("The Trapper", release_number=1, perk_count=1)
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertNotIn("The Trapper Perk 1", names)

    def test_teachable_perks_for_killer(self):
        seed_killer("The Trapper", release_number=1, perk_count=2)

        names = get_killer_teachable_perk_names("The Trapper")
        self.assertEqual(set(names), {"The Trapper Perk 1", "The Trapper Perk 2"})

    def test_teachable_perks_for_unknown_killer(self):
        self.assertEqual(get_killer_teachable_perk_names("Nobody"), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_roster.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.history'`.

- [ ] **Step 3: Write the roster module**

Create `backend/app/services/history/__init__.py`:

```python
# backend/app/services/history/__init__.py
```

Create `backend/app/services/history/roster.py`:

```python
# backend/app/services/history/roster.py
from typing import Any, Dict, List

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.ownership_service import OwnershipService

ROW_SIZE = 5


def build_rows(owned_killer_names: List[str]) -> List[List[str]]:
    return [
        owned_killer_names[i:i + ROW_SIZE]
        for i in range(0, len(owned_killer_names), ROW_SIZE)
    ]


def _release_key(character: Dict[str, Any]):
    release_number = character.get("release_number")
    return release_number if release_number is not None else float("inf")


def get_owned_killer_names_by_release(user_id: int, ownership_service: OwnershipService) -> List[str]:
    owned = [c for c in ownership_service.get_user_characters(user_id, role="Killer") if c["is_owned"]]
    owned.sort(key=_release_key)
    return [c["name"] for c in owned]


def get_general_killer_perk_names() -> List[str]:
    stmt = select(Perk.name).where(
        Perk.category == "Killer",
        (Perk.character_id.is_(None)) | (Perk.is_generic_counterpart.is_(True)),
    )
    return list(db.session.scalars(stmt).all())


def get_killer_teachable_perk_names(killer_name: str) -> List[str]:
    character = db.session.scalars(
        select(Character).where(Character.name == killer_name)
    ).first()
    if not character:
        return []
    stmt = select(Perk.name).where(
        Perk.character_id == character.id, Perk.is_teachable.is_(True)
    )
    return list(db.session.scalars(stmt).all())
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker cp backend/app/services/history dbd_backend:/app/app/services/history
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_roster.py -q"
```

Expected: `9 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/history/__init__.py backend/app/services/history/roster.py \
        backend/tests/unit/test_history_roster.py
git commit -m "feat(history-streak): add roster and perk name helpers"
```

---

## Task 3: `HistoryService`

**Files:**
- Create: `backend/app/services/history_service.py`
- Test: `backend/tests/unit/test_history_service.py`

**Interfaces:**
- Consumes: `HistoryRun`, `HistoryMatchLog` (Task 1); `ROW_SIZE`, `build_rows`, `get_owned_killer_names_by_release`, `get_general_killer_perk_names`, `get_killer_teachable_perk_names` (Task 2).
- Produces: `HistoryService` class with `get_or_create_run(user_id, mode) -> dict`, `submit_result(user_id, run_id, result, killer_id) -> dict`, `reset_run(user_id, mode) -> dict`, `get_stats(user_id, mode) -> dict`. Every run dict adds on top of `HistoryRun.to_dict()`: `current_row_killers: List[str]`, `row_size: int`, `total_rows: int`, `total_owned_killers: int`. `submit_result`'s dict additionally carries `newly_unlocked_perks: List[str]` and `row_cleared: bool` for that one call.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/unit/test_history_service.py`:

```python
# backend/tests/unit/test_history_service.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, User
from app.services.history_service import HistoryService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


def seed_general_perk(name="Whispers"):
    db.session.add(Perk(name=name, character_id=None, category="Killer"))
    db.session.commit()


class HistoryTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = HistoryService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


class TestGetOrCreateRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("historyplayer")

    def test_creates_a_fresh_run_with_general_perks_unlocked(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_row_index"], 0)
        self.assertEqual(run["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith", "The Hillbilly"])
        self.assertEqual(run["row_size"], 5)
        self.assertEqual(run["total_rows"], 1)
        self.assertEqual(run["total_owned_killers"], 3)

    def test_medium_and_hell_runs_are_independent(self):
        medium_run = self.service.get_or_create_run(self.user_id, "medium")
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertNotEqual(medium_run["id"], hell_run["id"])

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


class TestSubmitResultWithinARow(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("rowplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_win_adds_killer_and_unlocks_their_perks(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertIn("The Trapper Perk 1", updated["unlocked_perk_names"])
        self.assertIn("The Trapper Perk 2", updated["unlocked_perk_names"])
        self.assertEqual(set(updated["newly_unlocked_perks"]), {"The Trapper Perk 1", "The Trapper Perk 2"})
        self.assertFalse(updated["row_cleared"])
        self.assertEqual(updated["total_killers_beaten"], 1)

    def test_cannot_win_with_a_killer_outside_the_active_row(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "Someone Else")

    def test_cannot_win_with_an_already_completed_killer_in_the_row(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")

    def test_clearing_every_killer_in_the_row_advances_and_completes(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertTrue(final["row_cleared"])
        self.assertEqual(final["status"], "completed")
        self.assertEqual(final["completed_killers"], [])
        self.assertEqual(final["total_killers_beaten"], 3)


class TestHellModeLoss(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(7)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("hellplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_any_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "Killer 0")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 1")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_still_resets_to_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self.service.submit_result(self.user_id, self.run["id"], "win", name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["total_killers_beaten"], 0)


class TestMediumModeCheckpoint(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("mediumplayer")
        self.run = self.service.get_or_create_run(self.user_id, "medium")

    def _win(self, name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", name)

    def test_loss_within_a_row_falls_back_to_start_of_that_row(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_falls_back_to_that_rows_checkpoint_not_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self._win(name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 1)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 5)
        self.assertIn("Killer 0 Perk 1", after_loss["unlocked_perk_names"])


class TestResetRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        self.user_id = self.register_user("resetplayer")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["total_killers_beaten"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertEqual(reset["unlocked_perk_names"], ["Whispers"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


class TestGetStats(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
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
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_service.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.history_service'`.

- [ ] **Step 3: Write the service**

Create `backend/app/services/history_service.py`:

```python
# backend/app/services/history_service.py
import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import HistoryMatchLog, HistoryRun
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_names_by_release,
)
from app.services.ownership_service import OwnershipService

logger = logging.getLogger(__name__)


class HistoryService:
    def __init__(self, ownership_service: Optional[OwnershipService] = None):
        self.ownership_service = ownership_service or OwnershipService()

    def _owned_names(self, user_id: int) -> List[str]:
        return get_owned_killer_names_by_release(user_id, self.ownership_service)

    def _augment(self, run: HistoryRun, owned_names: List[str]) -> Dict[str, Any]:
        rows = build_rows(owned_names)
        data = run.to_dict()
        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []
        data["current_row_killers"] = current_row
        data["row_size"] = ROW_SIZE
        data["total_rows"] = len(rows)
        data["total_owned_killers"] = len(owned_names)
        return data

    def get_or_create_run(self, user_id: int, mode: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).first()
        owned_names = self._owned_names(user_id)
        if run:
            return self._augment(run, owned_names)

        general = get_general_killer_perk_names()
        run = HistoryRun(
            user_id=user_id,
            mode=mode,
            status="in_progress",
            current_row_index=0,
            total_killers_beaten=0,
            best_killers_beaten=0,
            completed_killers_json="[]",
            unlocked_perk_names_json=json.dumps(general),
            checkpoint_row_index=0,
            checkpoint_total_killers_beaten=0,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=json.dumps(general),
        )
        db.session.add(run)
        db.session.commit()
        return self._augment(run, owned_names)

    def reset_run(self, user_id: int, mode: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).first()
        if not run:
            raise ValueError("Run not found")
        db.session.delete(run)
        db.session.commit()
        return self.get_or_create_run(user_id, mode)

    def submit_result(self, user_id: int, run_id: int, result: str, killer_id: str) -> Dict[str, Any]:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if not killer_id:
            raise ValueError("killer_id is required")

        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.id == run_id, HistoryRun.user_id == user_id)
        ).first()
        if not run:
            raise ValueError("Run not found")
        if run.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")

        owned_names = self._owned_names(user_id)
        rows = build_rows(owned_names)
        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []
        if killer_id not in current_row:
            raise ValueError(f"{killer_id} is not in the active row")

        completed = json.loads(run.completed_killers_json or "[]")
        unlocked = json.loads(run.unlocked_perk_names_json or "[]")
        streak_before = run.total_killers_beaten
        newly_unlocked: List[str] = []
        row_cleared = False

        if result == "win":
            if killer_id in completed:
                raise ValueError(f"{killer_id} has already been cleared this row")
            completed.append(killer_id)
            newly_unlocked = [
                p for p in get_killer_teachable_perk_names(killer_id) if p not in unlocked
            ]
            unlocked.extend(newly_unlocked)
            run.total_killers_beaten += 1
            run.best_killers_beaten = max(run.best_killers_beaten, run.total_killers_beaten)

            if current_row and set(completed) >= set(current_row):
                row_cleared = True
                run.current_row_index += 1
                completed = []
                if run.current_row_index >= len(rows):
                    run.status = "completed"
                if run.mode == "medium":
                    run.checkpoint_row_index = run.current_row_index
                    run.checkpoint_total_killers_beaten = run.total_killers_beaten
                    run.checkpoint_completed_killers_json = "[]"
                    run.checkpoint_unlocked_perk_names_json = json.dumps(unlocked)
        else:
            if run.mode == "medium":
                run.current_row_index = run.checkpoint_row_index
                run.total_killers_beaten = run.checkpoint_total_killers_beaten
                completed = json.loads(run.checkpoint_completed_killers_json or "[]")
                unlocked = json.loads(run.checkpoint_unlocked_perk_names_json or "[]")
            else:
                general = get_general_killer_perk_names()
                run.current_row_index = 0
                run.total_killers_beaten = 0
                completed = []
                unlocked = general
                run.checkpoint_row_index = 0
                run.checkpoint_total_killers_beaten = 0
                run.checkpoint_completed_killers_json = "[]"
                run.checkpoint_unlocked_perk_names_json = json.dumps(general)

        streak_after = run.total_killers_beaten
        run.completed_killers_json = json.dumps(completed)
        run.unlocked_perk_names_json = json.dumps(unlocked)

        db.session.add(HistoryMatchLog(
            run_id=run_id,
            killer_id=killer_id,
            result=result,
            row_index=run.current_row_index,
            streak_before=streak_before,
            streak_after=streak_after,
        ))
        db.session.commit()

        data = self._augment(run, owned_names)
        data["newly_unlocked_perks"] = newly_unlocked
        data["row_cleared"] = row_cleared
        return data

    def get_stats(self, user_id: int, mode: str) -> Dict[str, Any]:
        run_ids = db.session.scalars(
            select(HistoryRun.id).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).all()
        if not run_ids:
            return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

        total = db.session.scalar(
            select(func.count(HistoryMatchLog.id)).where(HistoryMatchLog.run_id.in_(run_ids))
        ) or 0
        wins = db.session.scalar(
            select(func.count(HistoryMatchLog.id)).where(
                HistoryMatchLog.run_id.in_(run_ids), HistoryMatchLog.result == "win"
            )
        ) or 0
        win_rate = round((wins / total * 100), 1) if total > 0 else 0.0
        recent = db.session.scalars(
            select(HistoryMatchLog).where(HistoryMatchLog.run_id.in_(run_ids))
            .order_by(HistoryMatchLog.id.desc()).limit(10)
        ).all()
        return {
            "total_matches": total,
            "wins": wins,
            "losses": total - wins,
            "win_rate": win_rate,
            "recent_logs": [log.to_dict() for log in recent],
        }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker cp backend/app/services/history dbd_backend:/app/app/services/history
docker cp backend/app/services/history_service.py dbd_backend:/app/app/services/history_service.py
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/unit/test_history_service.py -q"
```

Expected: `13 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/history_service.py backend/tests/unit/test_history_service.py
git commit -m "feat(history-streak): add HistoryService with row and checkpoint logic"
```

---

## Task 4: Routes

**Files:**
- Create: `backend/app/routes/history_streak.py`
- Modify: `backend/app/routes/__init__.py`, `backend/app/__init__.py`
- Test: `backend/tests/api/test_history_routes.py`

**Interfaces:**
- Consumes: `HistoryService` (Task 3).
- Produces: blueprint `history_streak_bp` mounted at `/api/v1/history-streak`, registered in the app factory.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/api/test_history_routes.py`:

```python
# backend/tests/api/test_history_routes.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class TestHistoryRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
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
        resp = self.client.get("/api/v1/history-streak/run?mode=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["mode"], "hell")
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith"])

    def test_run_requires_valid_mode(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=easy", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()["run"]
        self.assertIn("The Trapper", body["completed_killers"])
        self.assertGreater(len(body["newly_unlocked_perks"]), 0)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/history-streak/run/reset", json={"mode": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["total_killers_beaten"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/history-streak/stats?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/api/test_history_routes.py -q"
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.routes.history_streak'`.

- [ ] **Step 3: Write the routes**

Create `backend/app/routes/history_streak.py`:

```python
# backend/app/routes/history_streak.py
from flask import Blueprint, current_app, jsonify, request, g
from app.services.history_service import HistoryService
from app.core.security import login_required

history_streak_bp = Blueprint("history_streak", __name__, url_prefix="/api/v1/history-streak")
_default_service = None

MODES = ("medium", "hell")


def get_history_service() -> HistoryService:
    if current_app and current_app.config.get("HISTORY_SERVICE"):
        return current_app.config["HISTORY_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = HistoryService()
    return _default_service


def _clean_mode(mode):
    return mode if mode in MODES else None


@history_streak_bp.route("/run", methods=["GET"])
@login_required
def get_run():
    mode = _clean_mode(request.args.get("mode"))
    if not mode:
        return jsonify({"error": "Query parameter 'mode' must be one of medium, hell"}), 400
    service = get_history_service()
    run = service.get_or_create_run(g.current_user.id, mode)
    return jsonify({"run": run}), 200


@history_streak_bp.route("/result", methods=["POST"])
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

    service = get_history_service()
    try:
        run = service.submit_result(g.current_user.id, run_id, result, killer_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@history_streak_bp.route("/run/reset", methods=["POST"])
@login_required
def reset_run():
    data = request.get_json(silent=True) or {}
    mode = _clean_mode(data.get("mode"))
    if not mode:
        return jsonify({"error": "Field 'mode' must be one of medium, hell"}), 400

    service = get_history_service()
    try:
        run = service.reset_run(g.current_user.id, mode)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"run": run}), 200


@history_streak_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    mode = _clean_mode(request.args.get("mode"))
    if not mode:
        return jsonify({"error": "Query parameter 'mode' must be one of medium, hell"}), 400
    service = get_history_service()
    stats = service.get_stats(g.current_user.id, mode)
    return jsonify({"stats": stats}), 200
```

Edit `backend/app/__init__.py`. Find:

```python
    from app.routes.chaos_streak import chaos_streak_bp
```

Add immediately after it:

```python
    from app.routes.history_streak import history_streak_bp
```

Find:

```python
    flask_app.register_blueprint(chaos_streak_bp)
```

Add immediately after it:

```python
    flask_app.register_blueprint(history_streak_bp)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker cp backend/app dbd_backend:/app/app
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/api/test_history_routes.py -q"
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/history_streak.py backend/app/__init__.py backend/tests/api/test_history_routes.py
git commit -m "feat(history-streak): add history-streak routes"
```

---

## Task 5: Frontend types and API client

**Files:**
- Create: `frontend/src/types/historyStreak.ts`
- Create: `frontend/src/services/historyStreakApi.ts`

**Interfaces:**
- Produces: `HistoryMode = 'medium' | 'hell'`, `HistoryRun`, `HistoryMatchLog`, `HistoryStats` types; `fetchHistoryRun`, `submitHistoryResult`, `resetHistoryRun`, `fetchHistoryStats` functions, mirroring `chaosStreakApi.ts`'s shape exactly (same `handleResponse`/`authHeaders`/`postJson` pattern).

- [ ] **Step 1: Write the types**

Create `frontend/src/types/historyStreak.ts`:

```typescript
// frontend/src/types/historyStreak.ts

export type HistoryMode = 'medium' | 'hell';

export interface HistoryRun {
  id: number;
  user_id: number;
  mode: HistoryMode;
  status: string;
  current_row_index: number;
  total_killers_beaten: number;
  best_killers_beaten: number;
  completed_killers: string[];
  unlocked_perk_names: string[];
  checkpoint_row_index: number;
  current_row_killers: string[];
  row_size: number;
  total_rows: number;
  total_owned_killers: number;
  newly_unlocked_perks?: string[];
  row_cleared?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryMatchLog {
  id: number;
  run_id: number;
  killer_id: string;
  result: 'win' | 'loss';
  row_index: number;
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface HistoryStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: HistoryMatchLog[];
}

export interface HistoryRunResponse {
  run: HistoryRun;
}

export interface HistoryStatsResponse {
  stats: HistoryStats;
}
```

- [ ] **Step 2: Write the API client**

Create `frontend/src/services/historyStreakApi.ts`:

```typescript
// frontend/src/services/historyStreakApi.ts
import { HistoryMode, HistoryRun, HistoryRunResponse, HistoryStats, HistoryStatsResponse } from '../types/historyStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/history-streak`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function postJson<T>(token: string, path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then(handleResponse<T>);
}

export async function fetchHistoryRun(token: string, mode: HistoryMode): Promise<HistoryRun> {
  const data = await fetch(`${API_BASE}/run?mode=${mode}`, {
    headers: authHeaders(token),
  }).then(handleResponse<HistoryRunResponse>);
  return data.run;
}

export async function submitHistoryResult(
  token: string,
  runId: number,
  result: 'win' | 'loss',
  killerId: string
): Promise<HistoryRun> {
  const data = await postJson<HistoryRunResponse>(token, '/result', {
    run_id: runId,
    result,
    killer_id: killerId,
  });
  return data.run;
}

export async function resetHistoryRun(token: string, mode: HistoryMode): Promise<HistoryRun> {
  const data = await postJson<HistoryRunResponse>(token, '/run/reset', { mode });
  return data.run;
}

export async function fetchHistoryStats(token: string, mode: HistoryMode): Promise<HistoryStats> {
  const data = await fetch(`${API_BASE}/stats?mode=${mode}`, {
    headers: authHeaders(token),
  }).then(handleResponse<HistoryStatsResponse>);
  return data.stats;
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors referencing these two files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/historyStreak.ts frontend/src/services/historyStreakApi.ts
git commit -m "feat(history-streak): add frontend types and API client"
```

---

## Task 6: `useHistoryRun` hook

**Files:**
- Create: `frontend/src/components/streaks/history/useHistoryRun.ts`

**Interfaces:**
- Consumes: `fetchHistoryRun`, `submitHistoryResult`, `resetHistoryRun`, `fetchHistoryStats` (Task 5); `useAuth` (existing).
- Produces: `useHistoryRun(mode: HistoryMode)` returning `{ run, stats, loading, busy, error, submitResult, reset, reload }`. `submitResult(result, killerId)` returns `Promise<HistoryRun | undefined>` so the board can react to `row_cleared` / `newly_unlocked_perks` / `status === 'completed'` from the resolved value, the same pattern `useChaosRun.submitResult` uses.

- [ ] **Step 1: Write the hook**

Create `frontend/src/components/streaks/history/useHistoryRun.ts`:

```typescript
// frontend/src/components/streaks/history/useHistoryRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { HistoryMode, HistoryRun, HistoryStats } from '@/types/historyStreak';
import * as api from '@/services/historyStreakApi';
import { useAuth } from '@/context/AuthContext';

export function useHistoryRun(mode: HistoryMode) {
  const { token } = useAuth();
  const [run, setRun] = useState<HistoryRun | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.fetchHistoryStats(token, mode);
      setStats(s);
    } catch (err) {
      console.error('Failed to load history stats:', err);
    }
  }, [token, mode]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.fetchHistoryRun(token, mode);
      setRun(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      setLoading(false);
    }
  }, [token, mode]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const submitResult = useCallback(
    async (result: 'win' | 'loss', killerId: string) => {
      if (!token || !run) return undefined;
      setBusy(true);
      setError(null);
      try {
        const updated = await api.submitHistoryResult(token, run.id, result, killerId);
        setRun(updated);
        loadStats();
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record the result');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [token, run, loadStats]
  );

  const reset = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      setRun(await api.resetHistoryRun(token, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  }, [token, mode]);

  return { run, stats, loading, busy, error, submitResult, reset, reload: load };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/streaks/history/useHistoryRun.ts
git commit -m "feat(history-streak): add useHistoryRun hook"
```

---

## Task 7: Mode modal, panel unlock, and route

**Files:**
- Create: `frontend/src/components/streaks/history/HistoryModeModal.tsx`
- Create: `frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx`
- Modify: `frontend/src/components/streaks/panels.ts`
- Modify: `frontend/src/components/streaks/StreakPanelGrid.tsx`

**Interfaces:**
- Produces: `HistoryModeModal` (props: `isOpen`, `onClose`, `onSelectMode: (mode: HistoryMode) => void`), mirroring `ChaosModeModal`. Route page renders `HistoryBoard` (built in Task 10 — this task only wires the page shell, which will render nothing useful until Task 10 lands; that's fine, this task's own test is the mode modal picking the right URL).

- [ ] **Step 1: Write the mode modal**

Create `frontend/src/components/streaks/history/HistoryModeModal.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryModeModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, Shield, Skull } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';

export interface HistoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: HistoryMode) => void;
}

const TILES: { mode: HistoryMode; label: string; desc: string; icon: React.ElementType }[] = [
  { mode: 'medium', label: 'Medium', desc: 'A checkpoint banks every row you clear.', icon: Shield },
  { mode: 'hell', label: 'Hell', desc: 'No checkpoints. One loss resets everything.', icon: Skull },
];

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({ isOpen, onClose, onSelectMode }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose a mode</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.mode}
                onClick={() => onSelectMode(tile.mode)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10 p-5 text-left transition-colors cursor-pointer"
              >
                <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
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

- [ ] **Step 2: Add the route page**

Create `frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx`:

```tsx
// frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx
import React from 'react';
import { HistoryBoard } from '@/components/streaks/history/HistoryBoard';

export default async function HistoryStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <HistoryBoard locale={locale} />;
}
```

- [ ] **Step 3: Unlock the panel and wire the modal**

Edit `frontend/src/components/streaks/panels.ts`. Find the `history-streak` entry and remove its `comingSoon: true,` line, so it reads:

```typescript
  {
    id: 'history-streak',
    title: 'History streak',
    description: 'A run built around the killer roster in release order.',
    icon: History,
    accent: 'text-slate-400',
    accentBorder: 'border-slate-700/60',
    image: '/images/streaks/history-streak.jpg',
  },
```

Edit `frontend/src/components/streaks/StreakPanelGrid.tsx`. Add the import:

```typescript
import { HistoryModeModal } from './history/HistoryModeModal';
import { HistoryMode } from '@/types/historyStreak';
```

Add state alongside the existing `isChaosModeModalOpen` line:

```typescript
  const [isHistoryModeModalOpen, setIsHistoryModeModalOpen] = useState(false);
```

Add a branch alongside the existing `panel.id === 'chaos-streak'` block, right after it:

```typescript
        if (panel.id === 'history-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              image={panel.image}
              onClick={() => setIsHistoryModeModalOpen(true)}
            />
          );
        }
```

Add the modal render, alongside the existing `<ChaosModeModal .../>`:

```tsx
      <HistoryModeModal
        isOpen={isHistoryModeModalOpen}
        onClose={() => setIsHistoryModeModalOpen(false)}
        onSelectMode={(mode: HistoryMode) =>
          router.push(`/${locale}/streaks/${role}/history-streak?mode=${mode}`)
        }
      />
```

- [ ] **Step 4: Verify it compiles**

This will fail until `HistoryBoard` exists (Task 10). For now, verify only the modal and panels changes have no syntax errors by checking the diff reads cleanly; full `tsc` verification happens at the end of Task 10.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/history/HistoryModeModal.tsx \
        "frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx" \
        frontend/src/components/streaks/panels.ts frontend/src/components/streaks/StreakPanelGrid.tsx
git commit -m "feat(history-streak): unlock the panel and add the mode modal and route"
```

---

## Task 8: `HistoryHeader` and `HistoryPerkPoolModal`

**Files:**
- Create: `frontend/src/components/streaks/history/HistoryHeader.tsx`
- Create: `frontend/src/components/streaks/history/HistoryPerkPoolModal.tsx`

**Interfaces:**
- Produces: `HistoryHeader` (props: `mode: HistoryMode`, `totalKillersBeaten: number`, `bestKillersBeaten: number`, `checkpointRowIndex: number`, `onOpenRules`, `onOpenPerkPool` — no stats button; a stats drawer isn't part of this plan's scope), mirrors `ChaosHeader` with a mode icon (Shield for medium, Skull for hell) instead of a difficulty icon, and "Checkpoint row" as the third stat (which row index is banked). `HistoryPerkPoolModal` (props: `isOpen`, `onClose`, `pool: Perk[]`, `unlockedPerkNames: string[]`), mirrors `ChaosPerkPoolModal`'s tabbed layout without rarity icons.

`HistoryPerkPoolModal` takes the full owned-killer perk catalog as a `pool: Perk[]` prop (Task 10 fetches it with the existing `useKillerPerkPool` hook, reused as-is), plus `unlockedPerkNames: string[]` from the run, and splits them into Unlocked/Locked tabs client-side.

- [ ] **Step 1: Write the header**

Create `frontend/src/components/streaks/history/HistoryHeader.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryHeader.tsx
'use client';

import React from 'react';
import { HistoryMode } from '@/types/historyStreak';
import { Flame, Trophy, Shield, Skull, BookOpen, Layers } from 'lucide-react';

const MODE_ICON: Record<HistoryMode, React.ElementType> = {
  medium: Shield,
  hell: Skull,
};

export interface HistoryHeaderProps {
  mode: HistoryMode;
  totalKillersBeaten: number;
  bestKillersBeaten: number;
  checkpointRowIndex: number;
  onOpenRules: () => void;
  onOpenPerkPool: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  mode,
  totalKillersBeaten,
  bestKillersBeaten,
  checkpointRowIndex,
  onOpenRules,
  onOpenPerkPool,
}) => {
  const ModeIcon = MODE_ICON[mode] ?? Shield;

  return (
    <div className="w-full bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/streaks/history-streak.jpg"
            alt=""
            className="hidden sm:block h-11 w-11 rounded-xl border border-slate-400/30 object-cover shadow-sm"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
            <ModeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            <span className="capitalize">{mode}</span> History Streak
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-400/30 text-slate-600 dark:text-slate-300 shadow-sm">
            <Flame className="w-5 h-5 text-slate-500 fill-slate-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Killers beaten
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {totalKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Best
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {bestKillersBeaten}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold leading-none">
                Checkpoint row
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 font-mono">
                {checkpointRowIndex + 1}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="View History Streak Rules"
          >
            <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">History Rules</span>
          </button>

          <button
            onClick={onOpenPerkPool}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="View unlocked and locked perks"
          >
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Perk Pool</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write the perk pool modal**

Create `frontend/src/components/streaks/history/HistoryPerkPoolModal.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryPerkPoolModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Layers, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const perkIconFor = (perk: Perk) => {
  const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  return cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
};

const PerkTile: React.FC<{ perk: Perk }> = ({ perk }) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
      <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {src && !failed ? (
          <img
            src={src}
            alt={perk.name}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
        {perk.name}
      </span>
    </div>
  );
};

export interface HistoryPerkPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Perk[];
  unlockedPerkNames: string[];
}

export const HistoryPerkPoolModal: React.FC<HistoryPerkPoolModalProps> = ({
  isOpen,
  onClose,
  pool,
  unlockedPerkNames,
}) => {
  const [tab, setTab] = useState<'unlocked' | 'locked'>('unlocked');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unlockedSet = useMemo(() => new Set(unlockedPerkNames), [unlockedPerkNames]);
  const unlocked = useMemo(() => pool.filter((p) => unlockedSet.has(p.name)), [pool, unlockedSet]);
  const locked = useMemo(() => pool.filter((p) => !unlockedSet.has(p.name)), [pool, unlockedSet]);
  const shown = tab === 'unlocked' ? unlocked : locked;

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-600 dark:text-slate-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Perk Pool</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unlocked.length} unlocked &middot; {locked.length} locked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4">
          <button
            onClick={() => setTab('unlocked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'unlocked'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Unlocked ({unlocked.length})
          </button>
          <button
            onClick={() => setTab('locked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              tab === 'locked'
                ? 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/40'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Locked ({locked.length})
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {tab === 'unlocked' ? 'No perks unlocked yet.' : 'Every perk is unlocked.'}
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {shown.map((perk) => (
                <PerkTile key={perk.id ?? perk.name} perk={perk} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors referencing these two files (unused-export warnings are fine; nothing imports them yet).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/history/HistoryHeader.tsx \
        frontend/src/components/streaks/history/HistoryPerkPoolModal.tsx
git commit -m "feat(history-streak): add header and perk pool modal"
```

---

## Task 9: `HistoryPerkModal`, `HistoryRulesModal`, and `HistoryRowClearedBanner`

**Files:**
- Create: `frontend/src/components/streaks/history/HistoryPerkModal.tsx`
- Create: `frontend/src/components/streaks/history/HistoryRulesModal.tsx`
- Create: `frontend/src/components/streaks/history/HistoryRowClearedBanner.tsx`

**Interfaces:**
- Produces: `HistoryPerkModal` (props: `killerName: string | null`, `perkNames: string[]`, `onClose: () => void` — renders when `killerName` is non-null, one animated row per perk name using the `chaos-badge-pop` keyframe). `HistoryRulesModal` (props: `isOpen`, `onClose`). `HistoryRowClearedBanner` (props: `rowNumber: number | null`, `onClose: () => void` — a brief toast-style banner, auto-dismissible, shown when a row completes).

- [ ] **Step 1: Write the perk unlock modal**

Create `frontend/src/components/streaks/history/HistoryPerkModal.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryPerkModal.tsx
'use client';

import React from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

export interface HistoryPerkModalProps {
  killerName: string | null;
  perkNames: string[];
  onClose: () => void;
}

export const HistoryPerkModal: React.FC<HistoryPerkModalProps> = ({ killerName, perkNames, onClose }) => {
  if (!killerName) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-500/15 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-emerald-500/20 cursor-default"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-400">
          <PartyPopper className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-white">{killerName} beaten!</h2>
        <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider font-bold">Perks unlocked</p>

        <div className="mt-4 space-y-2">
          {perkNames.length === 0 ? (
            <p className="text-sm text-slate-300">No new perks this time.</p>
          ) : (
            perkNames.map((name, i) => (
              <div
                key={name}
                className="chaos-badge-pop flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-slate-950/60 px-3 py-2 text-left"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-100">{name}</span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 cursor-pointer"
        >
          Keep going
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write the row cleared banner**

Create `frontend/src/components/streaks/history/HistoryRowClearedBanner.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryRowClearedBanner.tsx
'use client';

import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';

export interface HistoryRowClearedBannerProps {
  rowNumber: number | null;
  onClose: () => void;
}

export const HistoryRowClearedBanner: React.FC<HistoryRowClearedBannerProps> = ({ rowNumber, onClose }) => {
  useEffect(() => {
    if (rowNumber == null) return;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [rowNumber, onClose]);

  if (rowNumber == null) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="chaos-badge-pop flex items-center gap-2.5 rounded-xl border-2 border-amber-400 bg-slate-950/95 px-5 py-3 shadow-xl shadow-amber-500/20">
        <Trophy className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-extrabold text-white">
          Row cleared! Row {rowNumber + 1} unlocked.
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Write the rules modal**

Create `frontend/src/components/streaks/history/HistoryRulesModal.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryRulesModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, BookOpen, Trophy, Dices } from 'lucide-react';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-600 dark:text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                History Streak Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How the roadmap, rows, and perk pool work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Dices className="w-4 h-4" />
              Concept
            </h3>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Your owned killers, sorted by release order, are grouped into rows of 5. Only the current row
              is playable. Beat every killer in it to unlock the next.
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              You start with every General perk unlocked. Beating a killer adds their own teachable perks
              to your pool. Addons and builds play no role here, pick a killer and play.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-slate-500" />
              Modes
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 whitespace-nowrap w-fit">
                  Medium
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  A checkpoint banks every time you clear a full row. A loss before that falls back to the
                  start of the current row, not to zero.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-500/20 text-rose-300 border-rose-500/30 whitespace-nowrap w-fit">
                  Hell
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  No checkpoints. One loss resets the whole run, every row and every unlocked perk.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Verify it compiles**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors referencing these three files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/history/HistoryPerkModal.tsx \
        frontend/src/components/streaks/history/HistoryRowClearedBanner.tsx \
        frontend/src/components/streaks/history/HistoryRulesModal.tsx
git commit -m "feat(history-streak): add perk unlock modal, row cleared banner, and rules modal"
```

---

## Task 10: `HistoryBoard` (final integration)

**Files:**
- Create: `frontend/src/components/streaks/history/HistoryBoard.tsx`

**Interfaces:**
- Consumes: `useHistoryRun` (Task 6), `useOwnedKillers` (existing, reused as-is), `useKillerPerkPool` (existing, reused as-is), `KillerPickerGrid` (existing, reused as-is), `HistoryHeader`, `HistoryPerkPoolModal`, `HistoryPerkModal`, `HistoryRowClearedBanner`, `HistoryRulesModal`, `HistoryModeModal` is not needed here (mode is fixed by the URL query param, same as Chaos's `difficulty`).
- Produces: `HistoryBoard` (props: `locale: string`), the component the route page renders.

- [ ] **Step 1: Write the board**

Create `frontend/src/components/streaks/history/HistoryBoard.tsx`:

```tsx
// frontend/src/components/streaks/history/HistoryBoard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { useHistoryRun } from './useHistoryRun';
import { useOwnedKillers } from '../chaos/useOwnedKillers';
import { useKillerPerkPool } from '../chaos/useKillerPerkPool';
import { KillerPickerGrid } from '../chaos/KillerPickerGrid';
import { HistoryHeader } from './HistoryHeader';
import { HistoryPerkPoolModal } from './HistoryPerkPoolModal';
import { HistoryPerkModal } from './HistoryPerkModal';
import { HistoryRowClearedBanner } from './HistoryRowClearedBanner';
import { HistoryRulesModal } from './HistoryRulesModal';

interface HistoryBoardProps {
  locale: string;
}

export const HistoryBoard: React.FC<HistoryBoardProps> = ({ locale }) => {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as HistoryMode) || 'hell';

  const { run, loading, busy, error, submitResult, reset } = useHistoryRun(mode);
  const { loading: loadingKillers } = useOwnedKillers();
  const { pool: perkPool } = useKillerPerkPool();

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPerkPoolOpen, setIsPerkPoolOpen] = useState(false);
  const [perkModal, setPerkModal] = useState<{ killerName: string; perkNames: string[] } | null>(null);
  const [rowClearedNumber, setRowClearedNumber] = useState<number | null>(null);

  const isCompleted = run?.status === 'completed';

  const handleResult = async (result: 'win' | 'loss') => {
    if (!selectedKillerId) return;
    const killerName = selectedKillerId;
    setSelectedKillerId(null);
    const updated = await submitResult(result, killerName);
    if (!updated) return;

    if (result === 'win') {
      setPerkModal({ killerName, perkNames: updated.newly_unlocked_perks || [] });
      if (updated.row_cleared && updated.status !== 'completed') {
        setRowClearedNumber(updated.current_row_index - 1);
      }
    }
    if (updated.status === 'completed') {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    }
  };

  const handleReset = () => {
    setConfirmingReset(false);
    setSelectedKillerId(null);
    reset();
  };

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
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

        <HistoryHeader
          mode={mode}
          totalKillersBeaten={run?.total_killers_beaten || 0}
          bestKillersBeaten={run?.best_killers_beaten || 0}
          checkpointRowIndex={run?.checkpoint_row_index || 0}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenPerkPool={() => setIsPerkPoolOpen(true)}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              History Streak complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 capitalize">
              You beat every row on {mode} mode.
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
          <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pick your killer
              </h3>
              {run && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Row {run.current_row_index + 1} of {run.total_rows} &middot; killer{' '}
                  {run.total_killers_beaten + 1} of {run.total_owned_killers}
                </p>
              )}
            </div>

            <KillerPickerGrid
              killers={run?.current_row_killers || []}
              completedKillers={run?.completed_killers || []}
              selectedKillerId={selectedKillerId}
              onSelect={setSelectedKillerId}
              disabled={busy}
              loading={loading || loadingKillers}
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

        {!isCompleted && (
          <div className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm px-4 py-4 shadow-sm">
            {confirmingReset ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Wipe this run? Row progress and every unlocked perk go back to the start. This cannot be
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
                    onClick={handleReset}
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

        <HistoryPerkPoolModal
          isOpen={isPerkPoolOpen}
          onClose={() => setIsPerkPoolOpen(false)}
          pool={perkPool}
          unlockedPerkNames={run?.unlocked_perk_names || []}
        />
        <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <HistoryPerkModal
          killerName={perkModal?.killerName ?? null}
          perkNames={perkModal?.perkNames ?? []}
          onClose={() => setPerkModal(null)}
        />
        <HistoryRowClearedBanner rowNumber={rowClearedNumber} onClose={() => setRowClearedNumber(null)} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify everything compiles**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
cd frontend && ./node_modules/.bin/next build
```

Expected: build succeeds, `/[locale]/streaks/killer/history-streak` listed among the routes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/history/HistoryBoard.tsx \
        frontend/src/components/streaks/history/HistoryHeader.tsx
git commit -m "feat(history-streak): add HistoryBoard, wiring the full row flow together"
```

---

## Task 11: Full-stack verification

**Files:** none created or modified; this task only runs checks.

- [ ] **Step 1: Full backend suite**

```bash
docker cp backend/app dbd_backend:/app/app
docker cp backend/tests dbd_backend:/app/tests
docker exec dbd_backend sh -c "cd /app && python -m pytest tests/ -q --ignore=tests/api/test_item_routes.py --ignore=tests/scrapers/test_scraper_config.py"
```

Expected: only the pre-existing failures already known from `develop` (confirmed unrelated to this branch by checking `git diff develop...HEAD --stat` touches none of the failing files) — no new failures from `history`.

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

run = call('GET', '/history-streak/run?mode=hell', token=token)['run']
print('fresh run: row', run['current_row_index'], '| row killers', run['current_row_killers'], '| unlocked perks', len(run['unlocked_perk_names']))
run_id = run['id']

if run['current_row_killers']:
    killer = run['current_row_killers'][0]
    result = call('POST', '/history-streak/result', token=token, body={'run_id': run_id, 'result': 'win', 'killer_id': killer})['run']
    print('after win: killers beaten', result['total_killers_beaten'], '| newly unlocked', result['newly_unlocked_perks'])
"
```

Expected: prints a coherent sequence with no traceback, ending with a nonzero `total_killers_beaten` (assuming the logged-in account owns at least one killer).

- [ ] **Step 4: Confirm the panel and bundle**

```bash
docker exec dbd_frontend sh -c "grep -rl 'History Streak' /app/.next/static/chunks >/dev/null 2>&1 && echo shipped || echo MISSING"
curl -sk -o /dev/null -w "history-streak page: HTTP %{http_code}\n" https://localhost/en/streaks/killer/history-streak
```

Expected: `shipped`, `HTTP 200`.

- [ ] **Step 5: Final commit if any of the above required fixes**

```bash
git add -A
git commit -m "chore(history-streak): fixes from full-stack verification" --allow-empty
```

(Only commit if Steps 1 to 4 required actual code changes; otherwise skip this step.)

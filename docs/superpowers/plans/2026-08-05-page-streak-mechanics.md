# Page Streak Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Page streak placeholder into the working challenge — pick a killer, build 4 perks from the current perk page, report the result, advance on a win, restart on a loss, with progress persisted per killer.

**Architecture:** All ordering, page-splitting and validation live in one backend service (`PageStreakService`) behind seven REST endpoints; SQLite holds the exclusion list, one run row per killer, and an append-only history. The frontend never recomputes a page split — it renders the snapshot the API returns, through presentational components fed by a single `usePageStreakRun` hook.

**Tech Stack:** Flask + SQLite (`unittest` tests), Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS v4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-05-page-streak-mechanics-design.md`

## Global Constraints

- Branch: `feature/page-streak-mechanics`. All work commits there.
- Backend commands run from `backend/`; frontend commands run from `frontend/`.
- **Backend gate:** there is no Python on the host — tests run in the backend container, and the image does not ship the `tests/` directory, so the local source must be mounted over `/app`. Run from the repo root (`D:/vhost/LemonDBD`):
  - whole suite: `docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests`
  - one module: `docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_page_streak_service -v`
  - Baseline before this plan: **67 tests, OK**. Where a task step says `python -m unittest …`, use the containerised form above.
- **Frontend gate:** `npx tsc --noEmit` then `npm run build`. Both must pass.
- **`npm run lint` is broken project-wide** — Next.js 16 removed `next lint`, so it fails with "Invalid project directory provided". Never use it as a gate; never try to fix it.
- **Do not add a frontend test framework.** The project has none and this plan does not introduce one. Backend tests are mandatory and written test-first.
- The backend is the only place that orders perks and splits pages. The frontend must never sort perks or compute a page split.
- Perk ordering is `sorted(perks, key=lambda p: p["name"])` — plain code-point order. Do not "improve" it with locale-aware collation.
- All user-facing copy is hardcoded English. Do not add keys to `frontend/src/locales/*.json`.
- Killer roster = distinct `character` values across killer perks, minus the pseudo-character `General`. Never hardcode a killer list. `General`'s perks stay in the perk pool.
- Page count is always derived from the live pool. Read `perks_per_page` from `generator_settings`; never read `total_pages`.
- Streaks accent color is orange: `text-orange-400`, `bg-orange-500/10`, `border-orange-500/20`.
- Do not modify `Navbar.tsx`, `Sidebar.tsx`, or the Gauntlet's `CharacterRosterGrid.tsx`.

---

### Task 1: Schema, exclusion list and page split

**Files:**
- Modify: `backend/app/services/db_service.py` (append three tables to the `executescript` block, before the trailing `INSERT OR IGNORE INTO generator_settings`)
- Create: `backend/app/services/page_streak_service.py`
- Test: `backend/tests/test_page_streak_service.py`

**Interfaces:**
- Consumes: `DatabaseService(db_path=...)` with `.get_connection()` and `.init_db()`; `PerkService().get_perks(category=..., limit=...)` returning `{"data": [...], "pagination": {...}}` where each perk has `name`, `character`, `category`, `icon_local_path`.
- Produces:
  - `PageStreakService(db_service=None, perk_service=None)`
  - `.get_excluded_perks() -> list[str]`
  - `.set_excluded_perks(perk_names: list[str]) -> dict` → `{"excluded": [...], "pool_size": int, "page_count": int}`
  - `.get_perks_per_page() -> int`
  - `.get_pool() -> list[dict]` (perk dicts, sorted, exclusions removed)
  - `.build_pages() -> list[list[str]]` (perk names, chunked)

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_page_streak_service.py`:

```python
import os
import unittest
from app.services.db_service import DatabaseService
from app.services.page_streak_service import PageStreakService


class FakePerkService:
    """Deterministic stand-in for PerkService so tests do not depend on scraped data."""

    def __init__(self, perks):
        self._perks = perks

    def get_perks(self, category=None, limit=None, **kwargs):
        data = [p for p in self._perks if category is None or p["category"] == category]
        return {"data": data, "pagination": {"total": len(data)}}


def make_perks(count, category="Killer", character="Trapper"):
    # Names are zero-padded so code-point order is also numeric order.
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
            "icon_local_path": f"icons/killers/{character}/perk_{i:03d}.png",
        }
        for i in range(1, count + 1)
    ]


class TestPageStreakPool(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_service.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = make_perks(33) + make_perks(5, category="Survivor", character="Meg")
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_pool_contains_only_killer_perks_sorted_by_name(self):
        pool = self.service.get_pool()
        self.assertEqual(len(pool), 33)
        self.assertTrue(all(p["category"] == "Killer" for p in pool))
        names = [p["name"] for p in pool]
        self.assertEqual(names, sorted(names))

    def test_build_pages_chunks_by_fifteen_with_short_last_page(self):
        pages = self.service.build_pages()
        self.assertEqual(len(pages), 3)
        self.assertEqual(len(pages[0]), 15)
        self.assertEqual(len(pages[1]), 15)
        self.assertEqual(len(pages[2]), 3)
        self.assertEqual(pages[0][0], "Perk 001")
        self.assertEqual(pages[2][-1], "Perk 033")

    def test_excluded_perks_shrink_pool_and_page_count(self):
        result = self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 4)])
        self.assertEqual(result["pool_size"], 30)
        self.assertEqual(result["page_count"], 2)
        self.assertEqual(self.service.get_excluded_perks(), ["Perk 001", "Perk 002", "Perk 003"])
        pages = self.service.build_pages()
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0][0], "Perk 004")

    def test_set_excluded_perks_replaces_previous_list(self):
        self.service.set_excluded_perks(["Perk 001"])
        self.service.set_excluded_perks(["Perk 002"])
        self.assertEqual(self.service.get_excluded_perks(), ["Perk 002"])

    def test_pool_shorter_than_one_page_yields_single_short_page(self):
        keep = {"Perk 001", "Perk 002"}
        self.service.set_excluded_perks([p["name"] for p in self.perks
                                         if p["category"] == "Killer" and p["name"] not in keep])
        pages = self.service.build_pages()
        self.assertEqual(pages, [["Perk 001", "Perk 002"]])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m unittest tests.test_page_streak_service -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.page_streak_service'`

- [ ] **Step 3: Add the three tables**

In `backend/app/services/db_service.py`, inside the `cursor.executescript("""...""")` block, insert this immediately **before** the closing `INSERT OR IGNORE INTO generator_settings` statement:

```sql
        CREATE TABLE IF NOT EXISTS page_streak_excluded_perks (
            perk_name TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS page_streak_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            killer TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
            attempt INTEGER NOT NULL DEFAULT 1,
            current_page INTEGER NOT NULL DEFAULT 1,
            best_page INTEGER NOT NULL DEFAULT 0,
            pages_json TEXT NOT NULL DEFAULT '[]',
            snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS page_streak_page_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            attempt INTEGER NOT NULL,
            page_number INTEGER NOT NULL,
            perks_json TEXT NOT NULL,
            result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES page_streak_runs(id) ON DELETE CASCADE
        );
```

- [ ] **Step 4: Write the service**

Create `backend/app/services/page_streak_service.py`:

```python
import json
from app.services.db_service import DatabaseService
from app.services.perk_service import PerkService

DEFAULT_PERKS_PER_PAGE = 15
BUILD_SIZE = 4
GENERAL_CHARACTER = "General"


class PageStreakService:
    def __init__(self, db_service=None, perk_service=None):
        self.db_service = db_service or DatabaseService()
        self.perk_service = perk_service or PerkService()

    # ---- exclusion list -------------------------------------------------

    def get_excluded_perks(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM page_streak_excluded_perks ORDER BY perk_name;")
        names = [row["perk_name"] for row in cursor.fetchall()]
        conn.close()
        return names

    def set_excluded_perks(self, perk_names):
        clean = sorted({str(name) for name in (perk_names or [])})
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM page_streak_excluded_perks;")
        cursor.executemany(
            "INSERT OR IGNORE INTO page_streak_excluded_perks (perk_name) VALUES (?);",
            [(name,) for name in clean],
        )
        conn.commit()
        conn.close()
        pages = self.build_pages()
        return {
            "excluded": clean,
            "pool_size": sum(len(page) for page in pages),
            "page_count": len(pages),
        }

    # ---- pool and pages -------------------------------------------------

    def get_perks_per_page(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perks_per_page FROM generator_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        if row and row["perks_per_page"]:
            return int(row["perks_per_page"])
        return DEFAULT_PERKS_PER_PAGE

    def _all_killer_perks(self):
        result = self.perk_service.get_perks(category="Killer", limit=100000)
        return list(result.get("data", []))

    def get_pool(self):
        excluded = set(self.get_excluded_perks())
        perks = [p for p in self._all_killer_perks() if p["name"] not in excluded]
        return sorted(perks, key=lambda p: p["name"])

    def build_pages(self):
        pool = self.get_pool()
        size = self.get_perks_per_page()
        names = [p["name"] for p in pool]
        return [names[i:i + size] for i in range(0, len(names), size)]
```

- [ ] **Step 5: Run the test to verify it passes**

Run from `backend/`: `python -m unittest tests.test_page_streak_service -v`
Expected: PASS — 5 tests.

- [ ] **Step 6: Confirm nothing else broke**

Run from `backend/`: `python -m unittest discover -s tests`
Expected: the whole suite still passes (the schema change is additive).

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/db_service.py backend/app/services/page_streak_service.py backend/tests/test_page_streak_service.py
git commit -m "feat(page-streak): add schema, exclusion list and page split"
```

---

### Task 2: Roster and run start

**Files:**
- Modify: `backend/app/services/page_streak_service.py`
- Test: `backend/tests/test_page_streak_service.py` (append a second `TestCase` class)

**Interfaces:**
- Consumes: everything Task 1 produced — `get_pool()`, `build_pages()`, `get_excluded_perks()`.
- Produces:
  - `.get_roster() -> list[dict]` — each `{"killer": str, "status": "not_started"|"in_progress"|"completed", "attempt": int, "current_page": int, "best_page": int, "page_count": int}`, sorted by killer name
  - `.get_run(killer: str) -> dict | None` — `{"id", "killer", "status", "attempt", "current_page", "best_page", "pages": list[list[str]], "page_count", "snapshot_at", "history": list[dict]}`
  - `.start_run(killer: str) -> dict` — same shape as `get_run`; raises `ValueError` if a run already exists or the killer is unknown

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_page_streak_service.py` (above the `if __name__` block):

```python
class TestPageStreakRoster(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_roster.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = (
            make_perks(20, character="Trapper")
            + make_perks(10, character="Nurse")
            + make_perks(5, character="General")
            + make_perks(4, category="Survivor", character="Meg")
        )
        # Give every perk a unique name so the pool has 35 killer perks.
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_roster_lists_killers_without_general_or_survivors(self):
        roster = self.service.get_roster()
        names = [entry["killer"] for entry in roster]
        self.assertEqual(names, ["Nurse", "Trapper"])
        self.assertTrue(all(entry["status"] == "not_started" for entry in roster))
        self.assertEqual(roster[0]["page_count"], 3)  # 35 killer perks incl. General

    def test_start_run_freezes_snapshot(self):
        run = self.service.start_run("Nurse")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_page"], 1)
        self.assertEqual(run["attempt"], 1)
        self.assertEqual(run["best_page"], 0)
        self.assertEqual(run["page_count"], 3)
        self.assertEqual(len(run["pages"][0]), 15)

        # Excluding perks afterwards must not touch the frozen run.
        self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 21)])
        reloaded = self.service.get_run("Nurse")
        self.assertEqual(reloaded["page_count"], 3)
        self.assertEqual(len(reloaded["pages"][0]), 15)

    def test_start_run_twice_is_rejected(self):
        self.service.start_run("Nurse")
        with self.assertRaises(ValueError):
            self.service.start_run("Nurse")

    def test_start_run_rejects_unknown_killer(self):
        with self.assertRaises(ValueError):
            self.service.start_run("Not A Killer")

    def test_get_run_returns_none_when_not_started(self):
        self.assertIsNone(self.service.get_run("Trapper"))

    def test_roster_reflects_started_run(self):
        self.service.start_run("Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster()}
        self.assertEqual(roster["Nurse"]["status"], "in_progress")
        self.assertEqual(roster["Nurse"]["current_page"], 1)
        self.assertEqual(roster["Trapper"]["status"], "not_started")
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m unittest tests.test_page_streak_service.TestPageStreakRoster -v`
Expected: FAIL — `AttributeError: 'PageStreakService' object has no attribute 'get_roster'`

- [ ] **Step 3: Implement roster and run start**

Append to `backend/app/services/page_streak_service.py`:

```python
    # ---- roster ---------------------------------------------------------

    def get_killers(self):
        names = {
            p["character"]
            for p in self._all_killer_perks()
            if p.get("character") and p["character"] != GENERAL_CHARACTER
        }
        return sorted(names)

    def get_roster(self):
        page_count = len(self.build_pages())
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT killer, status, attempt, current_page, best_page, pages_json FROM page_streak_runs;")
        runs = {row["killer"]: row for row in cursor.fetchall()}
        conn.close()

        roster = []
        for killer in self.get_killers():
            row = runs.get(killer)
            if row is None:
                roster.append({
                    "killer": killer,
                    "status": "not_started",
                    "attempt": 0,
                    "current_page": 0,
                    "best_page": 0,
                    "page_count": page_count,
                })
            else:
                roster.append({
                    "killer": killer,
                    "status": row["status"],
                    "attempt": row["attempt"],
                    "current_page": row["current_page"],
                    "best_page": row["best_page"],
                    "page_count": len(json.loads(row["pages_json"])),
                })
        return roster

    # ---- runs -----------------------------------------------------------

    def _row_to_run(self, row, history):
        pages = json.loads(row["pages_json"])
        return {
            "id": row["id"],
            "killer": row["killer"],
            "status": row["status"],
            "attempt": row["attempt"],
            "current_page": row["current_page"],
            "best_page": row["best_page"],
            "pages": pages,
            "page_count": len(pages),
            "snapshot_at": row["snapshot_at"],
            "history": history,
        }

    def _fetch_history(self, cursor, run_id):
        cursor.execute(
            "SELECT attempt, page_number, perks_json, result, timestamp "
            "FROM page_streak_page_logs WHERE run_id = ? ORDER BY id DESC;",
            (run_id,),
        )
        return [
            {
                "attempt": row["attempt"],
                "page_number": row["page_number"],
                "perks": json.loads(row["perks_json"]),
                "result": row["result"],
                "timestamp": row["timestamp"],
            }
            for row in cursor.fetchall()
        ]

    def get_run(self, killer):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM page_streak_runs WHERE killer = ?;", (killer,))
        row = cursor.fetchone()
        if row is None:
            conn.close()
            return None
        history = self._fetch_history(cursor, row["id"])
        conn.close()
        return self._row_to_run(row, history)

    def start_run(self, killer):
        if killer not in self.get_killers():
            raise ValueError(f"Unknown killer: {killer}")
        if self.get_run(killer) is not None:
            raise ValueError(f"A run already exists for {killer}")

        pages = self.build_pages()
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO page_streak_runs (killer, status, attempt, current_page, best_page, pages_json) "
            "VALUES (?, 'in_progress', 1, 1, 0, ?);",
            (killer, json.dumps(pages)),
        )
        conn.commit()
        conn.close()
        return self.get_run(killer)
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `python -m unittest tests.test_page_streak_service -v`
Expected: PASS — 11 tests total.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/page_streak_service.py backend/tests/test_page_streak_service.py
git commit -m "feat(page-streak): add killer roster and run start with frozen snapshot"
```

---

### Task 3: Results, reset and validation

**Files:**
- Modify: `backend/app/services/page_streak_service.py`
- Test: `backend/tests/test_page_streak_service.py` (append a third `TestCase` class)

**Interfaces:**
- Consumes: `.get_run(killer)`, `.start_run(killer)`, `.build_pages()` from Tasks 1-2.
- Produces:
  - `.submit_result(killer: str, page: int, perks: list[str], result: str) -> dict` — returns the updated run (same shape as `get_run`); raises `ValueError` on any validation failure
  - `.reset_run(killer: str) -> dict` — returns the updated run; raises `ValueError` if no run exists
  - `.expected_build_size(page_perks: list[str]) -> int` — `min(4, len(page_perks))`

**Behaviour rules (exact):**
- A win logs the result, sets `best_page = max(best_page, page)`, and moves to `page + 1`. Winning the last page sets `status = 'completed'` and leaves `current_page` at the last page.
- A loss logs the result, increments `attempt`, sets `current_page = 1`, and **keeps the frozen snapshot** — the run continues with a new attempt.
- A manual reset increments `attempt`, sets `current_page = 1`, sets `status = 'in_progress'`, and **takes a fresh snapshot** (this is the deliberate restart that picks up data changes). It does not write a history row.
- History rows are never deleted.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_page_streak_service.py` (above the `if __name__` block):

```python
class TestPageStreakResults(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_results.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.perks = make_perks(32, character="Nurse")
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(self.perks),
        )
        self.run = self.service.start_run("Nurse")

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def build_for(self, page_number):
        page = self.run["pages"][page_number - 1]
        return page[:self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self):
        updated = self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.assertEqual(updated["current_page"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["history"][0]["result"], "win")
        self.assertEqual(updated["history"][0]["page_number"], 1)

    def test_winning_last_page_completes_the_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        self.assertEqual(updated["status"], "completed")
        self.assertEqual(updated["best_page"], 3)

    def test_loss_resets_page_keeps_history_and_best(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result("Nurse", 2, self.build_for(2), "loss")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(len(updated["history"]), 2)
        self.assertEqual(updated["pages"], self.run["pages"])  # snapshot survives a loss

    def test_short_last_page_accepts_a_short_build(self):
        page3 = self.run["pages"][2]
        self.assertEqual(len(page3), 2)
        self.assertEqual(self.service.expected_build_size(page3), 2)
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result("Nurse", 3, page3, "win")
        self.assertEqual(updated["status"], "completed")

    def test_rejects_wrong_page(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self):
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self):
        first = self.run["pages"][0][0]
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self):
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        with self.assertRaises(ValueError):
            self.service.submit_result("Nurse", 3, self.build_for(3), "win")

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.set_excluded_perks([f"Perk {i:03d}" for i in range(1, 18)])
        updated = self.service.reset_run("Nurse")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["page_count"], 1)  # 15 perks left -> one page
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["best_page"], 1)

    def test_reset_reopens_a_completed_run(self):
        self.service.submit_result("Nurse", 1, self.build_for(1), "win")
        self.service.submit_result("Nurse", 2, self.build_for(2), "win")
        self.service.submit_result("Nurse", 3, self.build_for(3), "win")
        updated = self.service.reset_run("Nurse")
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["current_page"], 1)

    def test_reset_without_a_run_is_rejected(self):
        with self.assertRaises(ValueError):
            self.service.reset_run("Trapper")
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m unittest tests.test_page_streak_service.TestPageStreakResults -v`
Expected: FAIL — `AttributeError: 'PageStreakService' object has no attribute 'expected_build_size'`

- [ ] **Step 3: Implement results and reset**

Append to `backend/app/services/page_streak_service.py`:

```python
    # ---- results and reset ----------------------------------------------

    def expected_build_size(self, page_perks):
        return min(BUILD_SIZE, len(page_perks))

    def _validate_submission(self, run, page, perks, result):
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if run["status"] != "in_progress":
            raise ValueError("This run is already completed — reset it to play again")
        if page != run["current_page"]:
            raise ValueError(f"Page {page} is not the current page ({run['current_page']})")

        page_perks = run["pages"][page - 1]
        submitted = list(perks or [])
        if len(set(submitted)) != len(submitted):
            raise ValueError("The build contains duplicate perks")
        expected = self.expected_build_size(page_perks)
        if len(submitted) != expected:
            raise ValueError(f"This page needs exactly {expected} perks, got {len(submitted)}")
        unknown = [name for name in submitted if name not in page_perks]
        if unknown:
            raise ValueError(f"Not on page {page}: {', '.join(unknown)}")

    def submit_result(self, killer, page, perks, result):
        run = self.get_run(killer)
        if run is None:
            raise ValueError(f"No run in progress for {killer}")
        self._validate_submission(run, page, perks, result)

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO page_streak_page_logs (run_id, attempt, page_number, perks_json, result) "
            "VALUES (?, ?, ?, ?, ?);",
            (run["id"], run["attempt"], page, json.dumps(list(perks)), result),
        )

        if result == "win":
            best_page = max(run["best_page"], page)
            if page >= run["page_count"]:
                cursor.execute(
                    "UPDATE page_streak_runs SET status = 'completed', best_page = ?, "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (best_page, run["id"]),
                )
            else:
                cursor.execute(
                    "UPDATE page_streak_runs SET current_page = ?, best_page = ?, "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (page + 1, best_page, run["id"]),
                )
        else:
            cursor.execute(
                "UPDATE page_streak_runs SET current_page = 1, attempt = attempt + 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (run["id"],),
            )

        conn.commit()
        conn.close()
        return self.get_run(killer)

    def reset_run(self, killer):
        run = self.get_run(killer)
        if run is None:
            raise ValueError(f"No run to reset for {killer}")

        pages = self.build_pages()
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE page_streak_runs SET status = 'in_progress', current_page = 1, "
            "attempt = attempt + 1, pages_json = ?, snapshot_at = CURRENT_TIMESTAMP, "
            "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
            (json.dumps(pages), run["id"]),
        )
        conn.commit()
        conn.close()
        return self.get_run(killer)
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `python -m unittest tests.test_page_streak_service -v`
Expected: PASS — 24 tests total.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/page_streak_service.py backend/tests/test_page_streak_service.py
git commit -m "feat(page-streak): add result submission, reset and server-side validation"
```

---

### Task 4: REST endpoints

**Files:**
- Create: `backend/app/routes/page_streak.py`
- Modify: `backend/app/__init__.py` (import and register the blueprint next to the others)
- Test: `backend/tests/test_page_streak_routes.py`

**Interfaces:**
- Consumes: the full `PageStreakService` API from Tasks 1-3.
- Produces: blueprint `page_streak_bp` with `url_prefix="/api/v1/page-streak"` and `get_page_streak_service()`, which reads `current_app.config["PAGE_STREAK_SERVICE"]` when set (this is how the tests inject a temp-database service).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_page_streak_routes.py`:

```python
import os
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.page_streak_service import PageStreakService
from tests.test_page_streak_service import FakePerkService, make_perks


class TestPageStreakRoutes(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_routes.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(make_perks(32, character="Nurse")),
        )
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["PAGE_STREAK_SERVICE"] = self.service
        self.client = self.app.test_client()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_roster_endpoint(self):
        res = self.client.get("/api/v1/page-streak/roster")
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["killer"], "Nurse")
        self.assertEqual(body["data"][0]["status"], "not_started")

    def test_excluded_perks_round_trip(self):
        res = self.client.put("/api/v1/page-streak/excluded-perks", json={"excluded": ["Perk 001"]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["pool_size"], 31)

        res = self.client.get("/api/v1/page-streak/excluded-perks")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["excluded"], ["Perk 001"])

    def test_run_lifecycle(self):
        res = self.client.get("/api/v1/page-streak/run?killer=Nurse")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 201)
        run = res.get_json()["run"]
        self.assertEqual(run["current_page"], 1)

        build = run["pages"][0][:4]
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 1, "perks": build, "result": "win"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 2)

        res = self.client.post("/api/v1/page-streak/run/reset", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 1)

    def test_result_validation_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 2, "perks": ["Perk 001"], "result": "win"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_start_requires_killer(self):
        res = self.client.post("/api/v1/page-streak/run/start", json={})
        self.assertEqual(res.status_code, 400)

    def test_run_requires_killer_query_param(self):
        res = self.client.get("/api/v1/page-streak/run")
        self.assertEqual(res.status_code, 400)

    def test_start_twice_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `python -m unittest tests.test_page_streak_routes -v`
Expected: FAIL — 404s, because the blueprint does not exist yet.

- [ ] **Step 3: Write the blueprint**

Create `backend/app/routes/page_streak.py`:

```python
from flask import Blueprint, current_app, jsonify, request
from app.services.page_streak_service import PageStreakService

page_streak_bp = Blueprint("page_streak", __name__, url_prefix="/api/v1/page-streak")
_default_service = None


def get_page_streak_service() -> PageStreakService:
    if current_app and current_app.config.get("PAGE_STREAK_SERVICE"):
        return current_app.config["PAGE_STREAK_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = PageStreakService()
    return _default_service


@page_streak_bp.route("/roster", methods=["GET"])
def get_roster():
    service = get_page_streak_service()
    roster = service.get_roster()
    return jsonify({"count": len(roster), "data": roster}), 200


@page_streak_bp.route("/excluded-perks", methods=["GET"])
def get_excluded_perks():
    service = get_page_streak_service()
    pages = service.build_pages()
    return jsonify({
        "excluded": service.get_excluded_perks(),
        "pool": [
            {"name": p["name"], "character": p.get("character"), "icon_local_path": p.get("icon_local_path")}
            for p in service.get_pool()
        ],
        "pool_size": sum(len(page) for page in pages),
        "page_count": len(pages),
    }), 200


@page_streak_bp.route("/excluded-perks", methods=["PUT"])
def put_excluded_perks():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    excluded = payload.get("excluded")
    if not isinstance(excluded, list):
        return jsonify({"error": "Body must contain an 'excluded' array"}), 400
    return jsonify(service.set_excluded_perks(excluded)), 200


@page_streak_bp.route("/run", methods=["GET"])
def get_run():
    service = get_page_streak_service()
    killer = request.args.get("killer")
    if not killer:
        return jsonify({"error": "Query parameter 'killer' is required"}), 400
    return jsonify({"run": service.get_run(killer)}), 200


@page_streak_bp.route("/run/start", methods=["POST"])
def start_run():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    if not killer:
        return jsonify({"error": "Field 'killer' is required"}), 400
    try:
        run = service.start_run(killer)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 201


@page_streak_bp.route("/run/result", methods=["POST"])
def submit_result():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    page = payload.get("page")
    perks = payload.get("perks")
    result = payload.get("result")
    if not killer or not isinstance(page, int) or not isinstance(perks, list) or not result:
        return jsonify({"error": "Fields 'killer', 'page', 'perks' and 'result' are required"}), 400
    try:
        run = service.submit_result(killer, page, perks, result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 200


@page_streak_bp.route("/run/reset", methods=["POST"])
def reset_run():
    service = get_page_streak_service()
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer")
    if not killer:
        return jsonify({"error": "Field 'killer' is required"}), 400
    try:
        run = service.reset_run(killer)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    return jsonify({"run": run}), 200
```

- [ ] **Step 4: Register the blueprint**

In `backend/app/__init__.py`, add the import next to the existing route imports:

```python
    from app.routes.page_streak import page_streak_bp
```

and the registration next to the existing `app.register_blueprint(...)` calls:

```python
    app.register_blueprint(page_streak_bp)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run from `backend/`: `python -m unittest tests.test_page_streak_routes -v`
Expected: PASS — 7 tests.

Then the full suite: `python -m unittest discover -s tests`
Expected: everything passes.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routes/page_streak.py backend/app/__init__.py backend/tests/test_page_streak_routes.py
git commit -m "feat(page-streak): expose REST endpoints for roster, exclusions and runs"
```

---

### Task 5: Frontend types, API client and run hook

**Files:**
- Create: `frontend/src/types/pageStreak.ts`
- Create: `frontend/src/services/pageStreakApi.ts`
- Create: `frontend/src/components/streaks/page-streak/usePageStreakRun.ts`

**Interfaces:**
- Consumes: the seven endpoints from Task 4.
- Produces:
  - types `RosterEntry`, `PageStreakRun`, `HistoryEntry`, `ExcludedPerksResponse`, `PoolPerk`
  - API functions `fetchRoster`, `fetchExcludedPerks`, `saveExcludedPerks`, `fetchRun`, `startRun`, `submitResult`, `resetRun`
  - hook `usePageStreakRun(killer)` returning `{ run, loading, error, busy, startRun, submitResult, resetRun }`

- [ ] **Step 1: Write the types**

Create `frontend/src/types/pageStreak.ts`:

```ts
export type RunStatus = 'not_started' | 'in_progress' | 'completed';

export interface RosterEntry {
  killer: string;
  status: RunStatus;
  attempt: number;
  current_page: number;
  best_page: number;
  page_count: number;
}

export interface HistoryEntry {
  attempt: number;
  page_number: number;
  perks: string[];
  result: 'win' | 'loss';
  timestamp: string;
}

export interface PageStreakRun {
  id: number;
  killer: string;
  status: 'in_progress' | 'completed';
  attempt: number;
  current_page: number;
  best_page: number;
  pages: string[][];
  page_count: number;
  snapshot_at: string;
  history: HistoryEntry[];
}

export interface PoolPerk {
  name: string;
  character: string | null;
  icon_local_path: string | null;
}

export interface ExcludedPerksResponse {
  excluded: string[];
  pool: PoolPerk[];
  pool_size: number;
  page_count: number;
}
```

- [ ] **Step 2: Write the API client**

Create `frontend/src/services/pageStreakApi.ts`:

```ts
import {
  ExcludedPerksResponse,
  PageStreakRun,
  RosterEntry,
} from '../types/pageStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/page-streak`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleResponse<T>);
}

export async function fetchRoster(): Promise<RosterEntry[]> {
  const data = await handleResponse<{ count: number; data: RosterEntry[] }>(
    await fetch(`${API_BASE}/roster`)
  );
  return data.data;
}

export async function fetchExcludedPerks(): Promise<ExcludedPerksResponse> {
  return handleResponse<ExcludedPerksResponse>(await fetch(`${API_BASE}/excluded-perks`));
}

export async function saveExcludedPerks(
  excluded: string[]
): Promise<{ excluded: string[]; pool_size: number; page_count: number }> {
  const response = await fetch(`${API_BASE}/excluded-perks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ excluded }),
  });
  return handleResponse(response);
}

export async function fetchRun(killer: string): Promise<PageStreakRun | null> {
  const data = await handleResponse<{ run: PageStreakRun | null }>(
    await fetch(`${API_BASE}/run?killer=${encodeURIComponent(killer)}`)
  );
  return data.run;
}

export async function startRun(killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/start', { killer });
  return data.run;
}

export async function submitResult(
  killer: string,
  page: number,
  perks: string[],
  result: 'win' | 'loss'
): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/result', {
    killer,
    page,
    perks,
    result,
  });
  return data.run;
}

export async function resetRun(killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/reset', { killer });
  return data.run;
}
```

- [ ] **Step 3: Write the hook**

Create `frontend/src/components/streaks/page-streak/usePageStreakRun.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageStreakRun } from '@/types/pageStreak';
import * as api from '@/services/pageStreakApi';

export function usePageStreakRun(killer: string) {
  const [run, setRun] = useState<PageStreakRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRun(await api.fetchRun(killer));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this streak');
    } finally {
      setLoading(false);
    }
  }, [killer]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = useCallback(
    async (action: () => Promise<PageStreakRun>) => {
      setBusy(true);
      setError(null);
      try {
        setRun(await action());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through — try again');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return {
    run,
    loading,
    busy,
    error,
    reload: load,
    startRun: () => mutate(() => api.startRun(killer)),
    submitResult: (page: number, perks: string[], result: 'win' | 'loss') =>
      mutate(() => api.submitResult(killer, page, perks, result)),
    resetRun: () => mutate(() => api.resetRun(killer)),
  };
}
```

- [ ] **Step 4: Verify types**

Run from `frontend/`: `npx tsc --noEmit`
Expected: clean. Nothing imports these yet — Tasks 6 and 7 wire them in.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/pageStreak.ts frontend/src/services/pageStreakApi.ts frontend/src/components/streaks/page-streak/usePageStreakRun.ts
git commit -m "feat(page-streak): add frontend types, API client and run hook"
```

---

### Task 6: Roster screen and exclusion modal

**Files:**
- Create: `frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx`
- Create: `frontend/src/components/streaks/page-streak/ExcludedPerksModal.tsx`
- Create: `frontend/src/components/streaks/page-streak/PageStreakRoster.tsx`
- Modify: `frontend/src/components/streaks/PageStreakBoard.tsx` (replace the placeholder body with the roster)

**Interfaces:**
- Consumes: `fetchRoster`, `fetchExcludedPerks`, `saveExcludedPerks` and the types from Task 5.
- Produces: `PageStreakRoster` (client component, props `{ locale: string }`), used by the existing `PageStreakBoard`.

- [ ] **Step 1: Write the roster grid**

Create `frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx`:

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Skull } from 'lucide-react';
import { RosterEntry } from '@/types/pageStreak';

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
}

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({ locale, roster }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {roster.map((entry) => {
      const done = entry.status === 'completed';
      const active = entry.status === 'in_progress';
      const pct = entry.page_count > 0 ? Math.round(((entry.current_page - 1) / entry.page_count) * 100) : 0;

      return (
        <Link
          key={entry.killer}
          href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
          className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            done
              ? 'border-emerald-500/40 bg-emerald-500/[0.07] hover:border-emerald-400/60'
              : active
                ? 'border-orange-500/45 bg-orange-500/[0.07] hover:border-orange-400/70'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
          }`}
        >
          {done && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-900/80">
            <Skull className={`h-7 w-7 ${done ? 'text-emerald-400/70' : 'text-slate-600'}`} />
          </div>
          <div className="text-center text-xs font-bold text-slate-200">{entry.killer}</div>
          {active && (
            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div
            className={`text-center font-mono text-[10px] ${
              done ? 'text-emerald-400' : active ? 'text-orange-400' : 'text-slate-500'
            }`}
          >
            {done
              ? 'completed'
              : active
                ? `page ${entry.current_page} of ${entry.page_count}`
                : 'not started'}
          </div>
        </Link>
      );
    })}
  </div>
);
```

- [ ] **Step 2: Write the exclusion modal**

Create `frontend/src/components/streaks/page-streak/ExcludedPerksModal.tsx`:

```tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchExcludedPerks, saveExcludedPerks } from '@/services/pageStreakApi';
import { PoolPerk } from '@/types/pageStreak';

interface ExcludedPerksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ExcludedPerksModal: React.FC<ExcludedPerksModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [allPerks, setAllPerks] = useState<PoolPerk[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [perksPerPage, setPerksPerPage] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchExcludedPerks();
        if (cancelled) return;
        // pool excludes the excluded ones, so rebuild the full list from both
        const poolNames = data.pool.map((p) => p.name);
        const missing = data.excluded.map((name) => ({ name, character: null, icon_local_path: null }));
        setAllPerks([...data.pool, ...missing].sort((a, b) => (a.name < b.name ? -1 : 1)));
        setExcluded(data.excluded);
        if (poolNames.length > 0 && data.page_count > 0) {
          setPerksPerPage(Math.ceil(poolNames.length / data.page_count));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the perk list');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const visible = useMemo(
    () => allPerks.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [allPerks, query]
  );

  const owned = allPerks.length - excluded.length;
  const projectedPages = perksPerPage > 0 ? Math.ceil(owned / perksPerPage) : 0;

  const toggle = (name: string) =>
    setExcluded((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveExcludedPerks(excluded);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the list');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100">Perks I don&apos;t own</h2>
            <p className="mt-1 text-xs text-slate-500">
              Unchecked perks leave the pool and the pages are renumbered. Runs already in progress keep their frozen layout.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-800 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search perks"
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
          <div className="flex flex-col gap-1.5">
            {visible.map((perk) => {
              const isExcluded = excluded.includes(perk.name);
              return (
                <label
                  key={perk.name}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 px-3 py-2 text-xs ${
                    isExcluded ? 'text-slate-600 line-through' : 'text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggle(perk.name)}
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  <span>{perk.name}</span>
                </label>
              );
            })}
            {visible.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">No perk matches &quot;{query}&quot;.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4">
          <span className="font-mono text-[11px] text-orange-400">
            {owned} of {allPerks.length} · {projectedPages} pages
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Write the roster screen**

Create `frontend/src/components/streaks/page-streak/PageStreakRoster.tsx`:

```tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { fetchExcludedPerks, fetchRoster } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';
import { ExcludedPerksModal } from './ExcludedPerksModal';

interface PageStreakRosterProps {
  locale: string;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({ locale }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [poolSize, setPoolSize] = useState(0);
  const [excludedCount, setExcludedCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rosterData, exclusions] = await Promise.all([fetchRoster(), fetchExcludedPerks()]);
      setRoster(rosterData);
      setPoolSize(exclusions.pool_size);
      setExcludedCount(exclusions.excluded.length);
      setPageCount(exclusions.page_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Perks I don&apos;t own ({excludedCount})
        </button>
        <span className="font-mono text-[11px] text-slate-500">
          {poolSize} perks · {pageCount} pages
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          <span>{error}</span>
          <button onClick={load} className="font-bold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-500">Loading roster…</p>
      ) : (
        <KillerRosterGrid locale={locale} roster={roster} />
      )}

      <ExcludedPerksModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
};
```

- [ ] **Step 4: Swap the placeholder for the roster**

Replace the whole body of `frontend/src/components/streaks/PageStreakBoard.tsx` with:

```tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageStreakRoster } from './page-streak/PageStreakRoster';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => (
  <div>
    <Link
      href={`/${locale}/streaks/killer`}
      className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back to killer streaks</span>
    </Link>

    <div className="mt-4 mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
        <BookOpen className="h-5 w-5 text-orange-400" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold tracking-wide text-slate-100">Page streak</h2>
        <p className="text-xs text-slate-500">
          Pick a killer. Win a round using perks from page 1, then move to page 2, and keep going through every page.
        </p>
      </div>
    </div>

    <PageStreakRoster locale={locale} />
  </div>
);
```

- [ ] **Step 5: Verify**

Run from `frontend/`: `npx tsc --noEmit` then `npm run build`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/
git commit -m "feat(page-streak): add killer roster screen and exclusion modal"
```

---

### Task 7: The run view

**Files:**
- Create: `frontend/src/components/streaks/page-streak/PerkTile.tsx`
- Create: `frontend/src/components/streaks/page-streak/RunHeader.tsx`
- Create: `frontend/src/components/streaks/page-streak/PerkPageGrid.tsx`
- Create: `frontend/src/components/streaks/page-streak/BuildBar.tsx`
- Create: `frontend/src/components/streaks/page-streak/RunHistory.tsx`
- Create: `frontend/src/components/streaks/page-streak/StartRunPanel.tsx`
- Create: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`
- Create: `frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/page.tsx`

**Interfaces:**
- Consumes: `usePageStreakRun(killer)` from Task 5, the `PageStreakRun` / `HistoryEntry` types.
- Produces: route `/[locale]/streaks/killer/page-streak/[killer]`.

**Design rule for this task:** the perk icon is the primary element. `PerkTile` renders a diamond (a square rotated 45°) inside a matching frame, with the perk name as a smaller caption beneath. Selection lights the frame, it does not just outline the card.

- [ ] **Step 1: Write the perk tile**

Create `frontend/src/components/streaks/page-streak/PerkTile.tsx`:

```tsx
'use client';

import React from 'react';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: (name: string) => void;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const PerkTile: React.FC<PerkTileProps> = ({ name, selected = false, disabled = false, onToggle }) => {
  const content = (
    <>
      <span
        className={`grid aspect-square w-full max-w-[88px] place-items-center transition-colors ${
          selected ? 'bg-orange-400/70' : 'bg-slate-800'
        }`}
        style={{ clipPath: DIAMOND }}
      >
        <span
          className={`h-[82%] w-[82%] transition-colors ${
            selected
              ? 'bg-gradient-to-br from-amber-900/80 to-slate-950'
              : 'bg-gradient-to-br from-slate-700 to-slate-900'
          }`}
          style={{ clipPath: DIAMOND }}
        />
      </span>
      <span className={`text-center text-[10.5px] font-semibold leading-tight ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
        {name}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
    selected ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-900/50'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500`}
    >
      {content}
    </button>
  );
};
```

- [ ] **Step 2: Write the run header**

Create `frontend/src/components/streaks/page-streak/RunHeader.tsx`:

```tsx
'use client';

import React from 'react';
import { Skull } from 'lucide-react';
import { PageStreakRun } from '@/types/pageStreak';

interface RunHeaderProps {
  run: PageStreakRun;
}

export const RunHeader: React.FC<RunHeaderProps> = ({ run }) => {
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;
  const pct = run.page_count > 0 ? Math.round((cleared / run.page_count) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
          <Skull className="h-7 w-7 text-slate-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-wide text-slate-100">{run.killer}</h2>
          <div className="mt-1 flex flex-wrap gap-4 font-mono text-[11px] text-slate-500">
            <span>attempt <b className="text-slate-200">{run.attempt}</b></span>
            <span>best <b className="text-slate-200">page {run.best_page}</b></span>
            <span>layout frozen <b className="text-slate-200">{new Date(run.snapshot_at).toLocaleDateString()}</b></span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
          <span>
            {run.status === 'completed' ? 'All pages cleared' : `Page ${run.current_page} of ${run.page_count}`}
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Write the page grid and build bar**

Create `frontend/src/components/streaks/page-streak/PerkPageGrid.tsx`:

```tsx
'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({ perks, selected = [], onToggle, dimmed = false }) => (
  <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${dimmed ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
    {perks.map((name) => (
      <PerkTile
        key={name}
        name={name}
        selected={selected.includes(name)}
        disabled={dimmed || !onToggle}
        onToggle={onToggle}
      />
    ))}
  </div>
);
```

Create `frontend/src/components/streaks/page-streak/BuildBar.tsx`:

```tsx
'use client';

import React from 'react';

interface BuildBarProps {
  selected: string[];
  size: number;
  confirmed: boolean;
  onConfirm: () => void;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const BuildBar: React.FC<BuildBarProps> = ({ selected, size, confirmed, onConfirm }) => {
  const slots = Array.from({ length: size }, (_, i) => selected[i] ?? null);

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      {slots.map((name, index) => (
        <div
          key={index}
          className={`flex min-w-[130px] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            name
              ? 'border border-orange-500/50 bg-orange-500/10 font-semibold text-slate-100'
              : 'border border-dashed border-slate-700 font-mono text-slate-600'
          }`}
        >
          {name && (
            <span className="grid h-6 w-6 flex-none place-items-center bg-orange-400/60" style={{ clipPath: DIAMOND }}>
              <span className="h-[82%] w-[82%] bg-gradient-to-br from-amber-900/80 to-slate-950" style={{ clipPath: DIAMOND }} />
            </span>
          )}
          {name ?? `slot ${index + 1}`}
        </div>
      ))}
      <button
        type="button"
        onClick={onConfirm}
        disabled={selected.length !== size || confirmed}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-extrabold text-white transition-opacity disabled:opacity-40"
      >
        {confirmed ? 'Build locked' : 'Confirm build'}
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Write the history and start panel**

Create `frontend/src/components/streaks/page-streak/RunHistory.tsx`:

```tsx
'use client';

import React from 'react';
import { HistoryEntry } from '@/types/pageStreak';

interface RunHistoryProps {
  history: HistoryEntry[];
}

export const RunHistory: React.FC<RunHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-600">No matches reported yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-slate-600">
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Attempt</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Page</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Build</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Result</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, index) => (
            <tr key={`${entry.attempt}-${entry.page_number}-${index}`} className="text-slate-400">
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.attempt}</td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.page_number}</td>
              <td className="border-b border-slate-900 px-2 py-2 text-slate-200">{entry.perks.join(' · ')}</td>
              <td className="border-b border-slate-900 px-2 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                    entry.result === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {entry.result}
                </span>
              </td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">
                {new Date(entry.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

Create `frontend/src/components/streaks/page-streak/StartRunPanel.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchExcludedPerks } from '@/services/pageStreakApi';

interface StartRunPanelProps {
  killer: string;
  busy: boolean;
  onStart: () => void;
}

export const StartRunPanel: React.FC<StartRunPanelProps> = ({ killer, busy, onStart }) => {
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [lastPageSize, setLastPageSize] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExcludedPerks()
      .then((data) => {
        if (cancelled) return;
        setPoolSize(data.pool_size);
        setPageCount(data.page_count);
        if (data.page_count > 0) {
          const perPage = Math.ceil(data.pool_size / data.page_count);
          const remainder = data.pool_size % perPage;
          setLastPageSize(remainder === 0 ? perPage : remainder);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-14 text-center">
      <h3 className="text-base font-extrabold text-slate-100">
        Ready for {pageCount ?? '…'} pages on {killer}?
      </h3>
      <p className="max-w-md text-xs leading-relaxed text-slate-500">
        You start on page 1. A win moves you to the next page, a loss sends you back to the beginning. The page layout
        is frozen for the whole attempt.
      </p>
      <div className="flex flex-wrap justify-center gap-5 font-mono text-[11px] text-slate-500">
        <span>perks <b className="text-slate-200 tabular-nums">{poolSize ?? '—'}</b></span>
        <span>pages <b className="text-slate-200 tabular-nums">{pageCount ?? '—'}</b></span>
        <span>last page <b className="text-slate-200 tabular-nums">{lastPageSize ?? '—'}</b> perks</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
      >
        {busy ? 'Starting…' : 'Start streak'}
      </button>
    </div>
  );
};
```

- [ ] **Step 5: Write the run view and its route**

Create `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { usePageStreakRun } from './usePageStreakRun';
import { RunHeader } from './RunHeader';
import { PerkPageGrid } from './PerkPageGrid';
import { BuildBar } from './BuildBar';
import { RunHistory } from './RunHistory';
import { StartRunPanel } from './StartRunPanel';

interface PageStreakRunViewProps {
  locale: string;
  killer: string;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2.5 mt-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-slate-600">
    <span>{children}</span>
    <span className="h-px flex-1 bg-slate-800" />
  </div>
);

export const PageStreakRunView: React.FC<PageStreakRunViewProps> = ({ locale, killer }) => {
  const { run, loading, busy, error, startRun, submitResult, resetRun } = usePageStreakRun(killer);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // A new page (or a new attempt) always starts from an empty, unconfirmed build.
  useEffect(() => {
    setSelected([]);
    setConfirmed(false);
  }, [run?.current_page, run?.attempt, run?.status]);

  const currentPagePerks = run ? run.pages[run.current_page - 1] ?? [] : [];
  const buildSize = Math.min(4, currentPagePerks.length);
  const nextPagePerks = run && run.current_page < run.page_count ? run.pages[run.current_page] : [];

  const toggle = (name: string) =>
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= buildSize) return prev;
      return [...prev, name];
    });

  return (
    <div>
      <Link
        href={`/${locale}/streaks/killer/page-streak`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to killers</span>
      </Link>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {loading && <p className="py-10 text-center text-xs text-slate-500">Loading streak…</p>}

      {!loading && !run && (
        <div className="mt-5">
          <StartRunPanel killer={killer} busy={busy} onStart={startRun} />
        </div>
      )}

      {!loading && run && (
        <div className="mt-5">
          <RunHeader run={run} />

          {run.status === 'completed' ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] px-5 py-6 text-center">
              <p className="text-sm font-extrabold text-emerald-400">All {run.page_count} pages cleared on {killer}</p>
              <p className="mt-1 text-xs text-slate-400">Reset the run if you want to go through it again.</p>
            </div>
          ) : (
            <>
              <SectionLabel>Page {run.current_page} — pick {buildSize} perks</SectionLabel>
              <PerkPageGrid perks={currentPagePerks} selected={selected} onToggle={toggle} />

              <SectionLabel>Your build</SectionLabel>
              <BuildBar
                selected={selected}
                size={buildSize}
                confirmed={confirmed}
                onConfirm={() => setConfirmed(true)}
              />

              {confirmed && (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submitResult(run.current_page, selected, 'win')}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-400 disabled:opacity-50"
                  >
                    {run.current_page >= run.page_count ? 'Win → finish' : `Win → page ${run.current_page + 1}`}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submitResult(run.current_page, selected, 'loss')}
                    className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-extrabold text-rose-400 disabled:opacity-50"
                  >
                    Loss → back to page 1
                  </button>
                </div>
              )}

              {nextPagePerks.length > 0 && (
                <>
                  <SectionLabel>Next up — page {run.current_page + 1}</SectionLabel>
                  <PerkPageGrid perks={nextPagePerks} dimmed />
                </>
              )}
            </>
          )}

          <SectionLabel>History</SectionLabel>
          <RunHistory history={run.history} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {confirmingReset ? (
              <>
                <span className="text-xs text-slate-400">Reset {killer} to page 1? History is kept.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    resetRun();
                    setConfirmingReset(false);
                  }}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-extrabold text-rose-400 disabled:opacity-50"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-rose-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset this streak
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

Create `frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/page.tsx`:

```tsx
import React from 'react';
import { PageStreakRunView } from '@/components/streaks/page-streak/PageStreakRunView';

export default async function PageStreakKillerPage({
  params,
}: {
  params: Promise<{ locale: string; killer: string }>;
}) {
  const { locale, killer } = await params;
  return <PageStreakRunView locale={locale} killer={decodeURIComponent(killer)} />;
}
```

- [ ] **Step 6: Verify**

Run from `frontend/`: `npx tsc --noEmit` then `npm run build`
Expected: both clean, and the build route table lists `/[locale]/streaks/killer/page-streak/[killer]`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/streaks/page-streak/ "frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/"
git commit -m "feat(page-streak): add the run view with perk picking, results and history"
```

---

### Task 8: Animations

**Files:**
- Modify: `frontend/src/app/globals.css` (append keyframes and utility classes after the existing `fogMove` block)
- Modify: `frontend/src/components/streaks/page-streak/PerkPageGrid.tsx` (apply the page-change animation)
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx` (apply the result-buttons animation)
- Modify: `frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx` (apply the completion pulse)

**Interfaces:**
- Consumes: the components from Tasks 6-7 exactly as they are.
- Produces: CSS classes `ps-page-enter`, `ps-page-reset`, `ps-rise`, `ps-complete-pulse`.

**Note:** `tailwindcss-animate` is NOT installed, so `animate-in` / `fade-in` / `slide-in-from-*` classes do nothing in this project. Use only the custom classes defined here. Do not install an animation package.

- [ ] **Step 1: Add the keyframes**

Append to `frontend/src/app/globals.css`:

```css
/* ---- Page streak animations ---- */
@keyframes psPageEnter {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes psPageReset {
  0%   { opacity: 1; transform: scale(1); filter: grayscale(0); }
  45%  { opacity: .35; transform: scale(.97); filter: grayscale(1); }
  100% { opacity: 1; transform: scale(1); filter: grayscale(0); }
}

@keyframes psRise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes psCompletePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
  50%      { box-shadow: 0 0 0 6px rgba(52, 211, 153, .18); }
}

.ps-page-enter { animation: psPageEnter 400ms ease-out both; }
.ps-page-reset { animation: psPageReset 600ms ease-in-out both; }
.ps-rise { animation: psRise 200ms ease-out both; }
.ps-complete-pulse { animation: psCompletePulse 800ms ease-in-out 1; }

@media (prefers-reduced-motion: reduce) {
  .ps-page-enter,
  .ps-page-reset,
  .ps-rise,
  .ps-complete-pulse {
    animation: none;
  }
}
```

- [ ] **Step 2: Animate the page change**

In `PerkPageGrid.tsx`, add an `animationKey` prop so React remounts the grid when the page changes, and a `variant` prop choosing which animation plays. Replace the component with:

```tsx
'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
  variant?: 'enter' | 'reset' | 'none';
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({
  perks,
  selected = [],
  onToggle,
  dimmed = false,
  variant = 'none',
}) => {
  const animation = variant === 'enter' ? 'ps-page-enter' : variant === 'reset' ? 'ps-page-reset' : '';

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${animation} ${
        dimmed ? 'pointer-events-none opacity-40 grayscale' : ''
      }`}
    >
      {perks.map((name) => (
        <PerkTile
          key={name}
          name={name}
          selected={selected.includes(name)}
          disabled={dimmed || !onToggle}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Drive the variant from the run state**

In `PageStreakRunView.tsx`, track whether the last change was a loss, and key the grid on the page so it remounts:

Add near the other state declarations:

```tsx
  const [lastWasLoss, setLastWasLoss] = useState(false);
```

Replace the current-page grid with:

```tsx
              <PerkPageGrid
                key={`${run.attempt}-${run.current_page}`}
                perks={currentPagePerks}
                selected={selected}
                onToggle={toggle}
                variant={lastWasLoss ? 'reset' : 'enter'}
              />
```

Change the two result handlers so they record which happened:

```tsx
                    onClick={() => {
                      setLastWasLoss(false);
                      submitResult(run.current_page, selected, 'win');
                    }}
```

```tsx
                    onClick={() => {
                      setLastWasLoss(true);
                      submitResult(run.current_page, selected, 'loss');
                    }}
```

And add `ps-rise` to the result-buttons wrapper:

```tsx
                <div className="mt-3 flex flex-wrap gap-2.5 ps-rise">
```

- [ ] **Step 4: Give the perk tile its selection feedback**

In `PerkTile.tsx`, the tile currently only cross-fades colours. Add the scale response so picking a perk registers physically. Change the `shell` constant to:

```tsx
  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150 ${
    selected ? 'border-orange-500 bg-orange-500/10 scale-[1.03]' : 'border-slate-800 bg-slate-900/50'
  }`;
```

and add `motion-reduce:transition-none motion-reduce:scale-100` to the interactive button's className so the reduced-motion preference wins:

```tsx
      className={`${shell} hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500 motion-reduce:transition-none motion-reduce:scale-100`}
```

- [ ] **Step 5: Pulse completed killers on the roster**

In `KillerRosterGrid.tsx`, add `ps-complete-pulse` to the completed card's className — change the `done` branch of the className expression to:

```tsx
              ? 'border-emerald-500/40 bg-emerald-500/[0.07] hover:border-emerald-400/60 ps-complete-pulse'
```

- [ ] **Step 6: Verify**

Run from `frontend/`: `npx tsc --noEmit` then `npm run build`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/components/streaks/page-streak/
git commit -m "feat(page-streak): add page transition, reset and completion animations"
```

---

## Manual verification (after Task 8)

Run the stack with `docker compose up -d --build backend frontend`, then at `http://localhost/en/streaks/killer/page-streak`:

1. The roster lists killers — no "Bear Traps", no survivors — and shows the pool and page counts.
2. Open "Perks I don't own", search for a perk, uncheck a few, save. The counters drop and the page count follows.
3. Enter a killer, read the start panel numbers, press "Start streak".
4. Pick 4 perks — a 5th click does nothing. Confirm the build; the result buttons appear.
5. Press "Win" — the next page slides in, the progress bar advances, history gains a row.
6. Press "Loss" — the grid desaturates back to page 1, the attempt counter increments, best page and history remain.
7. Reload the browser: the run resumes exactly where it was.
8. Change the exclusion list mid-run: the running streak keeps its frozen page layout.
9. Win every page: the killer shows as completed on the roster with a green check.
10. With OS "reduce motion" enabled, all of the above happens instantly with no transforms.

## Done criteria

- `python -m unittest discover -s tests` green from `backend/` (31 new tests across two files).
- `npx tsc --noEmit` and `npm run build` clean from `frontend/`.
- The ten manual checks above pass.
- No frontend test framework added, no `npm run lint` in any gate, no locale keys added, `Navbar.tsx` / `Sidebar.tsx` / `CharacterRosterGrid.tsx` untouched.

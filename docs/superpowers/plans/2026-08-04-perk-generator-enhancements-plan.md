# Perk Generator & Infrastructure Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the LemonDBD Perk Generator with SQLite database persistence, a No-Repeat perk system with one-click pool reset, and optimize root & container ignore files (`.gitignore`, `.dockerignore`).

**Architecture:** The Flask backend (`generator.py`) manages generator settings and drawn perk records in SQLite tables (`generator_settings`, `generator_drawn_perks`). The frontend (`PerkGenerator.tsx`) interacts with `/api/v1/generator/*` to filter out drawn perks when No-Repeat mode is active, sync settings across devices, and offer a "Reset Used Perks" action.

**Tech Stack:** Python 3.12, Flask 3.1, SQLite 3, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4.

---

### Task 1: SQLite Generator Schema & Service Layer

**Files:**
- Modify: [`backend/app/services/db_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/db_service.py)
- Create: [`backend/app/services/generator_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/generator_service.py)
- Create: [`backend/tests/test_generator_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_generator_service.py)

**Interfaces:**
- Consumes: `DatabaseService`
- Produces: `GeneratorService.get_config()`, `GeneratorService.update_config()`, `GeneratorService.get_drawn_perks()`, `GeneratorService.add_drawn_perks()`, `GeneratorService.reset_drawn_perks()`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_generator_service.py`:
```python
import os
import unittest
from app.services.db_service import DatabaseService
from app.services.generator_service import GeneratorService

class TestGeneratorService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_generator.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = GeneratorService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_add_drawn_perks_and_reset(self):
        drawn_before = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_before), 0)

        self.service.add_drawn_perks("Survivor", ["Sprint Burst", "Adrenaline"])
        drawn_after = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_after), 2)
        self.assertIn("Sprint Burst", drawn_after)

        self.service.reset_drawn_perks("Survivor")
        drawn_reset = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_reset), 0)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_generator_service.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.generator_service'`

- [ ] **Step 3: Write minimal implementation**

Update `backend/app/services/db_service.py`:
```python
# Add to init_db script:
CREATE TABLE IF NOT EXISTS generator_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    role TEXT NOT NULL DEFAULT 'Survivor',
    gen_mode TEXT NOT NULL DEFAULT 'instant',
    no_repeat_perks BOOLEAN NOT NULL DEFAULT 1,
    total_pages INTEGER NOT NULL DEFAULT 12,
    perks_per_page INTEGER NOT NULL DEFAULT 15,
    last_page_perks INTEGER NOT NULL DEFAULT 8,
    spin_duration_sec REAL NOT NULL DEFAULT 3.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generator_drawn_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    perk_name TEXT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, perk_name)
);

INSERT OR IGNORE INTO generator_settings (id, role, gen_mode, no_repeat_perks)
VALUES (1, 'Survivor', 'instant', 1);
```

Create `backend/app/services/generator_service.py`:
```python
from app.services.db_service import DatabaseService

class GeneratorService:
    def __init__(self, db_service=None):
        self.db_service = db_service or DatabaseService()

    def get_config(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM generator_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else {
            "role": "Survivor",
            "gen_mode": "instant",
            "no_repeat_perks": 1,
            "total_pages": 12,
            "perks_per_page": 15,
            "last_page_perks": 8,
            "spin_duration_sec": 3.0
        }

    def update_config(self, data):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        fields = []
        values = []
        for key in ["role", "gen_mode", "no_repeat_perks", "total_pages", "perks_per_page", "last_page_perks", "spin_duration_sec"]:
            if key in data:
                fields.append(f"{key} = ?")
                values.append(data[key])
        
        if fields:
            values.append(1)
            query = f"UPDATE generator_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;"
            cursor.execute(query, tuple(values))
            conn.commit()
        conn.close()
        return self.get_config()

    def get_drawn_perks(self, role):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM generator_drawn_perks WHERE role = ?;", (role,))
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]

    def add_drawn_perks(self, role, perk_names):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        for name in perk_names:
            cursor.execute("""
            INSERT OR IGNORE INTO generator_drawn_perks (role, perk_name)
            VALUES (?, ?);
            """, (role, name))
        conn.commit()
        conn.close()
        return self.get_drawn_perks(role)

    def reset_drawn_perks(self, role=None):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        if role:
            cursor.execute("DELETE FROM generator_drawn_perks WHERE role = ?;", (role,))
        else:
            cursor.execute("DELETE FROM generator_drawn_perks;")
        conn.commit()
        conn.close()
        return []
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_generator_service.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/db_service.py backend/app/services/generator_service.py backend/tests/test_generator_service.py
git commit -m "feat(generator): add GeneratorService and SQLite schema for generator config & drawn perks"
```

---

### Task 2: Flask REST API Endpoints for Generator

**Files:**
- Create: [`backend/app/routes/generator.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/routes/generator.py)
- Modify: [`backend/app/__init__.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/__init__.py)
- Test: [`backend/tests/test_generator_routes.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_generator_routes.py)

**Interfaces:**
- Consumes: `GeneratorService`
- Produces: REST API endpoints under `/api/v1/generator`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_generator_routes.py`:
```python
import unittest
from app import create_app

class TestGeneratorRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_get_config_returns_200(self):
        response = self.client.get('/api/v1/generator/config')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("config", data)

    def test_reset_drawn_perks_returns_200(self):
        response = self.client.post('/api/v1/generator/reset', json={"role": "Survivor"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["drawn_perks"], [])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_generator_routes.py`
Expected: FAIL with 404

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/routes/generator.py`:
```python
from flask import Blueprint, jsonify, request
from app.services.generator_service import GeneratorService

generator_bp = Blueprint("generator", __name__, url_prefix="/api/v1/generator")
service = GeneratorService()

@generator_bp.route("/config", methods=["GET", "POST"])
def handle_config():
    if request.method == "POST":
        data = request.get_json() or {}
        config = service.update_config(data)
        return jsonify({"config": config})
    config = service.get_config()
    return jsonify({"config": config})

@generator_bp.route("/drawn", methods=["GET"])
def get_drawn():
    role = request.args.get("role", "Survivor")
    drawn = service.get_drawn_perks(role)
    return jsonify({"drawn_perks": drawn})

@generator_bp.route("/draw", methods=["POST"])
def add_drawn():
    data = request.get_json() or {}
    role = data.get("role", "Survivor")
    perks = data.get("perks", [])
    drawn = service.add_drawn_perks(role, perks)
    return jsonify({"drawn_perks": drawn})

@generator_bp.route("/reset", methods=["POST"])
def reset_drawn():
    data = request.get_json() or {}
    role = data.get("role")
    drawn = service.reset_drawn_perks(role)
    return jsonify({"drawn_perks": drawn})
```

Register blueprint in `backend/app/__init__.py`:
```python
from app.routes.generator import generator_bp
app.register_blueprint(generator_bp)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_generator_routes.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/generator.py backend/app/__init__.py backend/tests/test_generator_routes.py
git commit -m "feat(generator): add REST endpoints for generator configuration and drawn perk pool management"
```

---

### Task 3: Frontend API Client & PerkGenerator Upgrade

**Files:**
- Create: [`frontend/src/services/generatorApi.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/services/generatorApi.ts)
- Modify: [`frontend/src/components/PerkGenerator.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/PerkGenerator.tsx)

**Interfaces:**
- Consumes: `/api/v1/generator/*`
- Produces: No-Repeat mode toggle, drawn perks badge counter, "Reset Used Perks" action button, and SQLite setting persistence.

- [ ] **Step 1: Create generator API client**

Create `frontend/src/services/generatorApi.ts`:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface GeneratorConfig {
  role: 'Survivor' | 'Killer';
  gen_mode: 'instant' | 'wheel';
  no_repeat_perks: number;
  total_pages: number;
  perks_per_page: number;
  last_page_perks: number;
  spin_duration_sec: number;
}

export async function fetchGeneratorConfig(): Promise<{ config: GeneratorConfig }> {
  const res = await fetch(`${API_BASE}/generator/config`);
  if (!res.ok) throw new Error('Failed to fetch generator config');
  return res.json();
}

export async function updateGeneratorConfig(config: Partial<GeneratorConfig>): Promise<{ config: GeneratorConfig }> {
  const res = await fetch(`${API_BASE}/generator/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update generator config');
  return res.json();
}

export async function fetchDrawnPerks(role: string): Promise<{ drawn_perks: string[] }> {
  const res = await fetch(`${API_BASE}/generator/drawn?role=${role}`);
  if (!res.ok) throw new Error('Failed to fetch drawn perks');
  return res.json();
}

export async function addDrawnPerks(role: string, perks: string[]): Promise<{ drawn_perks: string[] }> {
  const res = await fetch(`${API_BASE}/generator/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, perks }),
  });
  if (!res.ok) throw new Error('Failed to save drawn perks');
  return res.json();
}

export async function resetDrawnPerks(role: string): Promise<{ drawn_perks: string[] }> {
  const res = await fetch(`${API_BASE}/generator/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Failed to reset drawn perks');
  return res.json();
}
```

- [ ] **Step 2: Update `PerkGenerator.tsx`**

Integrate SQLite API calls into `PerkGenerator.tsx`:
- Add `noRepeat` boolean state & toggle switch.
- Fetch `drawnPerks` list on role change.
- When rolling loadout, filter `sortedPerks` by `!drawnPerks.includes(perk.name)` when `noRepeat` is enabled.
- Automatically save newly rolled perk names to SQLite via `addDrawnPerks()`.
- Add **"Reset Used Perks"** button next to the config controls that calls `resetDrawnPerks(role)` and clears local state.
- Add drawn perk counter badge: `Used: X / Y`.

- [ ] **Step 3: Test frontend build**

Run: `npx tsc --noEmit` and `npm run build` inside `frontend`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/generatorApi.ts frontend/src/components/PerkGenerator.tsx
git commit -m "feat(generator): integrate SQLite persistence, no-repeat perk pool, and one-click pool reset"
```

---

### Task 4: Workspace Ignore Files Optimization (`.gitignore` & `.dockerignore`)

**Files:**
- Modify: [`.gitignore`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/.gitignore)
- Modify: [`backend/.dockerignore`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/.dockerignore)
- Modify: [`frontend/.dockerignore`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/.dockerignore)

- [ ] **Step 1: Update `.gitignore`**

Add SQLite, superpowers, and test cache patterns to root `.gitignore`:
```gitignore
# SQLite Databases
*.db
*.db-journal
*.db-wal
*.db-shm

# Antigravity & Superpowers Artifacts
.superpowers/

# Extra caches
.pytest_cache/
```

- [ ] **Step 2: Update `backend/.dockerignore` & `frontend/.dockerignore`**

Ensure `.dockerignore` files cleanly exclude tests, cache folders, local `.env` files, build output folders, and database files.

- [ ] **Step 3: Commit**

```bash
git add .gitignore backend/.dockerignore frontend/.dockerignore
git commit -m "chore: optimize .gitignore and .dockerignore for SQLite databases, build caches, and artifacts"
```

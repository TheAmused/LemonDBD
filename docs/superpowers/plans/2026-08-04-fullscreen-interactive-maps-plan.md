# Fullscreen Interactive Realm Maps & Tile/Pallet Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100vw x 100vh Fullscreen Interactive Realm Map & Tile/Pallet Engine in LemonDBD with 60fps pan-zoom controls, interactive icons for Pallets (God/Safe/Mindgameable/Unsafe safety ratings), Vault Windows, Totems, Generators, Hatch, Exit Gates, Jungle Gyms, seed variant switching, and a rich Looping & Safety Inspector Drawer.

**Architecture:** SQLite database (`lemon_dbd.db`) stores map tiles, pallets, vault windows, safety ratings, and objective locations in `map_realms`, `map_tiles`, and `map_objectives` tables. The Flask backend (`maps.py`) serves `/api/v1/maps/<map_id>?seed=seed_a&floor=1`. A Next.js App Router page (`/maps`) renders a 100vw x 100vh pan-zoom canvas engine with floating layer filters and a tile inspector side drawer.

**Tech Stack:** Python 3.12, Flask 3.1, SQLite 3, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons.

---

### Task 1: SQLite Schema & Map Tile/Pallet Data Service

**Files:**
- Modify: [`backend/app/services/db_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/db_service.py)
- Modify: [`backend/app/services/map_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/map_service.py)
- Create: [`backend/tests/test_fullscreen_maps_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_fullscreen_maps_service.py)

**Interfaces:**
- Consumes: `DatabaseService`
- Produces: `MapService.get_maps()`, `MapService.get_map_by_id(map_id, seed_variant, floor)`

- [ ] **Step 1: Write failing unit test**

Create `backend/tests/test_fullscreen_maps_service.py`:
```python
import os
import unittest
from app.services.db_service import DatabaseService
from app.services.map_service import MapService

class TestFullscreenMapsService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_fullscreen_maps.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = MapService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_map_with_seed_variants_and_pallets(self):
        detail = self.service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        self.assertIsNotNone(detail)
        self.assertIn("tiles", detail)
        self.assertIn("objectives", detail)
        
        # Verify pallet safety ratings
        pallets = [t for t in detail["tiles"] if t.get("has_pallet")]
        self.assertGreaterEqual(len(pallets), 1)
        self.assertIn(pallets[0]["pallet_safety_rating"], ["god", "safe", "mindgameable", "unsafe"])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify failure**

Run: `python -m unittest backend/tests/test_fullscreen_maps_service.py`
Expected: FAIL with missing key or method signature mismatch

- [ ] **Step 3: Write minimal implementation**

Update `backend/app/services/db_service.py` to create `map_realms`, `map_tiles`, and `map_objectives` tables in `init_db()`.

Update `backend/app/services/map_service.py`:
- Implement `get_map_by_id(map_id, seed_variant='seed_a', floor=1)` returning detailed `tiles` (with `pallet_safety_rating`, `has_pallet`, `has_window`, `looping_tips`, `mindgame_counter`) and `objectives` (`totem`, `generator`, `exit_gate`, `hatch`, `chest`, `basement`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; ..\.venv\Scripts\python.exe -m unittest tests/test_fullscreen_maps_service.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/db_service.py backend/app/services/map_service.py backend/tests/test_fullscreen_maps_service.py
git commit -m "feat(maps): implement SQLite schema and data service for map tiles, pallets, safety ratings, and objectives"
```

---

### Task 2: REST API Endpoints for Fullscreen Map Layouts

**Files:**
- Modify: [`backend/app/routes/maps.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/routes/maps.py)
- Create: [`backend/tests/test_fullscreen_maps_routes.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_fullscreen_maps_routes.py)

**Interfaces:**
- Consumes: `MapService`
- Produces: `GET /api/v1/maps/<map_id>?seed=seed_a&floor=1`

- [ ] **Step 1: Write failing unit test**

Create `backend/tests/test_fullscreen_maps_routes.py`:
```python
import unittest
from app import create_app

class TestFullscreenMapsRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_get_map_detail_with_seed_query(self):
        res = self.client.get('/api/v1/maps/coal_tower?seed=seed_a&floor=1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("map", data)
        self.assertIn("tiles", data["map"])
        self.assertIn("objectives", data["map"])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd backend; ..\.venv\Scripts\python.exe -m unittest tests/test_fullscreen_maps_routes.py`

- [ ] **Step 3: Write minimal implementation**

Update `backend/app/routes/maps.py`:
- Handle `seed` and `floor` query parameters in `get_map_detail(map_id)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; ..\.venv\Scripts\python.exe -m unittest tests/test_fullscreen_maps_routes.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/maps.py backend/tests/test_fullscreen_maps_routes.py
git commit -m "feat(maps): add seed and floor parameters to map detail REST endpoint"
```

---

### Task 3: Fullscreen Pan-Zoom Canvas & Looping Inspector UI

**Files:**
- Create: [`frontend/src/components/maps/FullscreenMapEngine.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/maps/FullscreenMapEngine.tsx)
- Create: [`frontend/src/components/maps/TileInspectorDrawer.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/maps/TileInspectorDrawer.tsx)
- Modify: [`frontend/src/types/map.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/types/map.ts)
- Modify: [`frontend/src/services/mapApi.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/services/mapApi.ts)
- Modify: [`frontend/src/components/maps/MapExplorer.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/maps/MapExplorer.tsx)
- Modify: [`frontend/src/app/[locale]/maps/page.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/app/[locale]/maps/page.tsx)

**Interfaces:**
- Consumes: `/api/v1/maps/<map_id>?seed=...`
- Produces: 100vw x 100vh Fullscreen Pan-Zoom Canvas with layer filters, tile inspector drawer, seed variant selector, and Hens callout labels.

- [ ] **Step 1: Update `map.ts` & `mapApi.ts`**

Add `seed_variant`, `floor`, `pallet_safety_rating`, `vault_direction`, `looping_tips`, `mindgame_counter`, `tiles`, and `objectives` to TypeScript types and API fetcher.

- [ ] **Step 2: Create `TileInspectorDrawer.tsx`**

Build side inspector drawer rendering:
- **Pallet Safety Badge**: *God Pallet* 🟩, *Safe Pallet* 🟦, *Mindgameable* 🟨, *Death Trap / Unsafe* 🟥.
- **Vault Direction Guide**: Fast Vault vs Medium Vault angle warnings.
- **Survivor Looping Pathing Tips**: Optimum loop tightness and tile-chaining routes.
- **Killer Counterplay Strategy**: Red stain hiding, moonwalking, and power usage tips.

- [ ] **Step 3: Create `FullscreenMapEngine.tsx`**

Build 100vw x 100vh pan-zoom canvas engine:
- Mouse drag & touch drag panning.
- Scroll wheel zoom & pinch zoom.
- Floating Layer Filters (Pallets, Windows, Totems, Gens, Gates, Tiles, Callouts).
- Seed Selector (`Seed A`, `Seed B`, `Seed C`) & Floor Switcher (`Floor 1`, `Floor 2`).

- [ ] **Step 4: Update `MapExplorer.tsx` & `page.tsx`**

Integrate Fullscreen mode trigger button (`[ ⛶ Launch Fullscreen Map ]`) and render `FullscreenMapEngine.tsx`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit` and `npm run build` in `frontend`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(maps): build 100vw x 100vh Fullscreen Pan-Zoom Canvas engine, layer filters, and Looping Inspector Drawer"
```

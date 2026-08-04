# The Survivor Gauntlet & App Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement progressive perk tier restrictions (4 perks down to 0 perks), character pool exclusions for unowned DLCs, match exception handling (DC / cancelled match re-rolls), gauntlet rules guide modal, and dynamic mobile-responsive UI improvements in LemonDBD.

**Architecture:** `ChallengeService` computes active Gauntlet Tier (`Tier 0: The Warm Up` to `Tier 4: The Legend`) based on current streak, restricting loadout perk slots accordingly. SQLite stores character pool toggle states and exception logs. Next.js components render tier badges, exception controls, character pool settings, and gauntlet rules.

**Tech Stack:** Python 3.12, Flask 3.1, SQLite 3, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons.

---

### Task 1: Backend Database & Gauntlet Tier Generator Service

**Files:**
- Modify: [`backend/app/services/db_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/db_service.py)
- Modify: [`backend/app/services/challenge_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/services/challenge_service.py)
- Create: [`backend/tests/test_gauntlet_service.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_gauntlet_service.py)

**Interfaces:**
- Consumes: `DatabaseService`, `PerkService`
- Produces: `ChallengeService.get_tier_info(streak)`, `ChallengeService.roll_gauntlet_challenge(role)`, `ChallengeService.invalidate_match(run_id, reason)`, `ChallengeService.get_pool_settings(role)`, `ChallengeService.update_pool_settings(role, settings)`

- [ ] **Step 1: Write failing unit test**

Create `backend/tests/test_gauntlet_service.py`:
```python
import os
import unittest
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService

class TestGauntletService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_gauntlet.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = ChallengeService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_tier_perk_limits(self):
        # Tier 0 (Streak 0): 4 perks
        tier0 = self.service.get_tier_info(0)
        self.assertEqual(tier0["perk_limit"], 4)
        self.assertEqual(tier0["name"], "The Warm Up")

        # Tier 1 (Streak 3): 3 perks
        tier1 = self.service.get_tier_info(3)
        self.assertEqual(tier1["perk_limit"], 3)
        self.assertEqual(tier1["name"], "The Thinning")

        # Tier 4 (Streak 12): 0 perks
        tier4 = self.service.get_tier_info(12)
        self.assertEqual(tier4["perk_limit"], 0)
        self.assertEqual(tier4["name"], "The Legend")

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_gauntlet_service.py`
Expected: FAIL with `AttributeError: 'ChallengeService' object has no attribute 'get_tier_info'`

- [ ] **Step 3: Write minimal implementation**

Update `backend/app/services/db_service.py` to add `character_pool_settings` and `match_exceptions` tables in `init_db()`.

Update `backend/app/services/challenge_service.py`:
- Add `get_tier_info(streak, checkpoint_interval=3)`:
  - Tier 0 (`streak < 3`): "The Warm Up" (4 Perks)
  - Tier 1 (`3 <= streak < 6`): "The Thinning" (3 Perks)
  - Tier 2 (`6 <= streak < 9`): "The Struggle" (2 Perks)
  - Tier 3 (`9 <= streak < 12`): "The Hardcore" (1 Perk)
  - Tier 4 (`streak >= 12`): "The Legend" (0 Perks)
- Update `roll_challenge()` to enforce `tier_info["perk_limit"]`, slice selected perks to `perk_limit`, and filter characters using `character_pool_settings`.
- Add `invalidate_match(run_id, reason)`: Logs exception, keeps streak & completed roster unchanged, re-rolls same target character.

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_gauntlet_service.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/db_service.py backend/app/services/challenge_service.py backend/tests/test_gauntlet_service.py
git commit -m "feat(gauntlet): implement progressive perk tier rules, character pool exclusions, and match invalidations"
```

---

### Task 2: REST API Endpoints for Gauntlet & Pool Controls

**Files:**
- Modify: [`backend/app/routes/challenges.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/app/routes/challenges.py)
- Test: [`backend/tests/test_gauntlet_routes.py`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/backend/tests/test_gauntlet_routes.py)

**Interfaces:**
- Consumes: `ChallengeService`
- Produces: `POST /api/v1/challenges/invalidate`, `GET/POST /api/v1/challenges/pool`

- [ ] **Step 1: Write failing unit test**

Create `backend/tests/test_gauntlet_routes.py`:
```python
import unittest
from app import create_app

class TestGauntletRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_invalidate_match_endpoint(self):
        # Create a run first
        run_res = self.client.get('/api/v1/challenges/run?role=survivor')
        run_id = run_res.get_json()["run"]["id"]

        response = self.client.post('/api/v1/challenges/invalidate', json={"run_id": run_id, "reason": "dc_before_5_gens"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("run", data)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_gauntlet_routes.py`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Write minimal implementation**

Update `backend/app/routes/challenges.py`:
- Add `@challenges_bp.route("/invalidate", methods=["POST"])`
- Add `@challenges_bp.route("/pool", methods=["GET", "POST"])`

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend python -m unittest backend/tests/test_gauntlet_routes.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/challenges.py backend/tests/test_gauntlet_routes.py
git commit -m "feat(gauntlet): add REST endpoints for match invalidation and character pool configuration"
```

---

### Task 3: Frontend Gauntlet Rules Modal, Pool Config, and Stage Upgrade

**Files:**
- Create: [`frontend/src/components/challenge/GauntletRulesModal.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/challenge/GauntletRulesModal.tsx)
- Create: [`frontend/src/components/challenge/CharacterPoolModal.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/challenge/CharacterPoolModal.tsx)
- Modify: [`frontend/src/types/challenge.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/types/challenge.ts)
- Modify: [`frontend/src/services/challengeApi.ts`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/services/challengeApi.ts)
- Modify: [`frontend/src/components/challenge/ActiveTargetStage.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/challenge/ActiveTargetStage.tsx)
- Modify: [`frontend/src/components/challenge/ChallengeHeader.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/challenge/ChallengeHeader.tsx)
- Modify: [`frontend/src/app/[locale]/challenge/page.tsx`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/app/[locale]/challenge/page.tsx)

- [ ] **Step 1: Create `GauntletRulesModal.tsx`**

Build an interactive modal presenting **The Survivor Gauntlet** rules, tier restriction table (Warm Up down to Legend), and match exception rules.

- [ ] **Step 2: Create `CharacterPoolModal.tsx`**

Build a character pool toggle modal allowing players to enable/disable specific DLC characters they do not own.

- [ ] **Step 3: Update `ActiveTargetStage.tsx`**

- Display active **Tier Name & Perk Limit Badge** (e.g. `Tier 2: The Struggle (2 Perks)`).
- Render disabled/locked slots when tier perk limit is < 4 (e.g. `[No Perk Allowed]` for Tier 4 Legend).
- Add exception buttons: **"DC < 5 Gens"** and **"Game Cancelled"** to trigger match invalidation & re-roll for same character.

- [ ] **Step 4: Update `ChallengeHeader.tsx` & `page.tsx`**

Add **"📖 Gauntlet Rules"** button and **"⚙️ Character Pool"** button to the header. Ensure full mobile/tablet/desktop responsive design.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit` and `npm run build` in `frontend`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(gauntlet): create GauntletRulesModal, CharacterPoolModal, tier badges, exception handlers, and responsive UI upgrades"
```

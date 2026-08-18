# Gauntlet "Original" Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a game-mode selector (Original / locked Lemon version) to the Survivor & Killer Gauntlet, and rebuild Original mode's match flow: one-time "Start Game" reveal, removal of Match Exceptions, manual perk selection (replacing random rolling, plus a related data-mapping bug fix), and a randomly-rolled item/add-on loadout differentiated by role.

**Architecture:** `GauntletService` (`backend/app/services/gauntlet_service.py`) keeps owning tier math and run state, but drops perk auto-selection in favor of a validated manual submission (`set_loadout`), gains `reveal_target` for the one-time Start Game step, and gains random item/add-on rolling. The frontend `GauntletBoard`/`ActiveTargetStage` tree gains a mode-selection modal ahead of navigation, a reveal animation gated on a new `target_revealed` run field, and a perk-picker panel that blocks Win/Lose until a valid loadout is submitted.

**Tech Stack:** Python 3.12, Flask 3.1, SQLAlchemy 2, SQLite/PostgreSQL, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-08-18-gauntlet-original-mode-redesign-design.md`

## Global Constraints

- No Item/Addon ownership tracking — the full DB pool is eligible for random rolling (spec §5).
- Item/add-on counts are fixed, not tier-scaled: 1 item + up to 2 add-ons for Survivor, up to 2 add-ons for Killer (spec §5).
- `target_revealed` flips to `true` once per run and never resets back to `false` (spec §3.1).
- Manual perk selection always replaces random rolling — no toggle (spec §4).
- This codebase does **not** run its Alembic migration files at startup — `DatabaseService.init_db()` (`backend/app/services/db_service.py`) calls `db.create_all()` (new tables only) followed by a hand-rolled `_migrate_columns()` that `ALTER TABLE ADD COLUMN`s a per-table hardcoded list, plus a raw-SQL fallback block (`_init_sqlite_schema`) with `CREATE TABLE IF NOT EXISTS` statements mirroring the ORM models. New columns/table drops in this plan follow that existing pattern instead of writing an Alembic migration (this supersedes the spec §6 wording, which assumed Alembic was live).
- Lemon version has no backend behavior yet — routes/services always operate as `game_mode="original"` (spec §2).

---

### Task 1: `GauntletRun` schema — `game_mode`, `target_revealed`, drop `GauntletMatchException`

**Files:**
- Modify: `backend/app/models.py:357-464` (`GauntletRun`, `GauntletMatchLog`, `GauntletMatchException` classes)
- Modify: `backend/app/services/db_service.py:79-122` (`_migrate_columns`), `backend/app/services/db_service.py:124-354` (`_init_sqlite_schema`)
- Test: `backend/tests/test_gauntlet_service.py`

**Interfaces:**
- Consumes: nothing new
- Produces: `GauntletRun.game_mode: str`, `GauntletRun.target_revealed: bool`, both included in `GauntletRun.to_dict()`. `GauntletMatchException` model removed entirely (no other file may import it after this task).

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_gauntlet_service.py`, inside `TestGauntletRun`:

```python
    def test_new_run_defaults_to_original_mode_and_unrevealed_target(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(run["game_mode"], "original")
        self.assertFalse(run["target_revealed"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -k defaults_to_original -v`
Expected: FAIL with `KeyError: 'game_mode'`

- [ ] **Step 3: Update the `GauntletRun` model**

In `backend/app/models.py`, inside `class GauntletRun(Base):` add two columns right after `status`:

```python
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    game_mode: Mapped[str] = mapped_column(String(20), default="original")
    target_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    current_character_id: Mapped[str] = mapped_column(String(100))
```

Change the unique constraint:

```python
    __table_args__ = (
        UniqueConstraint("user_id", "role", "game_mode", name="uq_gauntlet_run_user_role_mode"),
    )
```

Add both fields to `to_dict()`:

```python
            "status": self.status,
            "game_mode": self.game_mode,
            "target_revealed": self.target_revealed,
            "current_character_id": self.current_character_id,
```

Delete the `GauntletMatchException` class (`backend/app/models.py:443-463`) and the `match_exceptions` relationship on `GauntletRun`:

```python
    match_exceptions: Mapped[List["GauntletMatchException"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Extend the hand-rolled column migration**

In `backend/app/services/db_service.py`, inside `_migrate_columns()`, after the `character_columns` loop finishes (right before the closing of the `with db.engine.connect() as conn:` block, i.e. after the `character_columns` for-loop but still inside the `with` block), add a second loop for `gauntlet_runs`:

```python
                gauntlet_run_columns = [
                    ("game_mode", "VARCHAR(20) DEFAULT 'original'"),
                    ("target_revealed", "BOOLEAN DEFAULT 0"),
                ]
                for col_name, col_type in gauntlet_run_columns:
                    try:
                        if is_pg:
                            conn.execute(text(f"ALTER TABLE gauntlet_runs ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                        else:
                            check_sql = text("PRAGMA table_info(gauntlet_runs);")
                            res = conn.execute(check_sql).fetchall()
                            existing_cols = [r[1] for r in res]
                            if col_name not in existing_cols:
                                conn.execute(text(f"ALTER TABLE gauntlet_runs ADD COLUMN {col_name} {col_type};"))
                    except Exception as err:
                        logger.debug(f"Column migration notice for {col_name}: {err}")
```

Then, still inside `_migrate_columns()`, right after that new loop (still inside the `with db.engine.connect() as conn:` block, before `conn.commit()`), drop the retired table:

```python
                try:
                    conn.execute(text("DROP TABLE IF EXISTS gauntlet_match_exceptions;"))
                except Exception as err:
                    logger.debug(f"Drop notice for gauntlet_match_exceptions: {err}")
```

- [ ] **Step 5: Remove the raw-SQL fallback definitions**

In `backend/app/services/db_service.py`, inside `_init_sqlite_schema()`:
- Remove the `game_mode`/`target_revealed` gap by adding them to the `CREATE TABLE IF NOT EXISTS gauntlet_runs (...)` block (this only matters for brand-new SQLite files created via the fallback path, `db_service.py:147-161`):

```python
            CREATE TABLE IF NOT EXISTS gauntlet_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
                status TEXT NOT NULL DEFAULT 'in_progress',
                game_mode TEXT NOT NULL DEFAULT 'original',
                target_revealed BOOLEAN NOT NULL DEFAULT 0,
                current_character_id TEXT NOT NULL,
                current_streak INTEGER NOT NULL DEFAULT 0,
                best_streak INTEGER NOT NULL DEFAULT 0,
                last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
                completed_characters_json TEXT NOT NULL DEFAULT '[]',
                checkpoint_characters_json TEXT NOT NULL DEFAULT '[]',
                current_loadout_json TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
```

- Delete the `CREATE TABLE IF NOT EXISTS gauntlet_match_exceptions (...)` block (`backend/app/services/db_service.py:200-207`) entirely.

- [ ] **Step 6: Run test to verify it passes**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -k defaults_to_original -v`
Expected: PASS

- [ ] **Step 7: Run the full gauntlet test suite to check for breakage**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py backend/tests/test_gauntlet_routes.py -v`
Expected: The two `invalidate_match`/`invalidate` tests now FAIL (`AttributeError`/404) — that's expected, Task 2 and Task 4 remove them. Everything else PASSes.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/services/db_service.py backend/tests/test_gauntlet_service.py
git commit -m "feat(gauntlet): add game_mode and target_revealed to GauntletRun, drop GauntletMatchException"
```

---

### Task 2: `GauntletService` — fix the `character`/`character_name` bug, add `reveal_target`, replace perk auto-roll with `set_loadout`, drop `invalidate_match`

**Files:**
- Modify: `backend/app/services/gauntlet_service.py`
- Test: `backend/tests/test_gauntlet_service.py`

**Interfaces:**
- Consumes: `OwnershipService.get_user_perks(user_id, category)` → list of perk dicts with key `character` (not `character_name` — this was the bug), `is_unlocked`, `id`, `name`.
- Produces: `GauntletService.reveal_target(user_id, run_id) -> dict`, `GauntletService.set_loadout(user_id, run_id, perk_ids: list[int]) -> dict`. `GauntletService.roll()` no longer selects perks (still selects the target character — item/add-on rolling is added to it in Task 3). `GauntletService.invalidate_match()` removed.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_gauntlet_service.py`, inside `TestGauntletRun` (replacing `test_roll_only_uses_unlocked_perks`, which tested the now-removed auto-roll — delete that test):

```python
    def test_roll_no_longer_assigns_perks(self):
        run = self.service.roll(self.user_id, "killer", target_character="Trapper")
        self.assertEqual(run["current_loadout"]["perks"], [])

    def test_reveal_target_flips_flag_without_changing_character(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        target = run["current_character_id"]
        self.assertFalse(run["target_revealed"])
        revealed = self.service.reveal_target(self.user_id, run["id"])
        self.assertTrue(revealed["target_revealed"])
        self.assertEqual(revealed["current_character_id"], target)
```

Add a new test class:

```python
class TestGauntletLoadout(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.trapper = seed_killer("Trapper")
        self.nurse = seed_killer("Nurse")
        self.user_id = self.register_user("loadoutuser")
        self.run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.roll(self.user_id, "killer", target_character="Trapper")
        self.run = self.service.get_or_create_run(self.user_id, "killer")
        self.trapper_perks = db.session.scalars(
            select(Perk).where(Perk.character_id == self.trapper.id)
        ).all()
        self.nurse_perks = db.session.scalars(
            select(Perk).where(Perk.character_id == self.nurse.id)
        ).all()

    def test_set_loadout_accepts_valid_selection(self):
        perk_ids = [self.trapper_perks[0].id, self.trapper_perks[1].id, self.nurse_perks[0].id, self.nurse_perks[1].id]
        updated = self.service.set_loadout(self.user_id, self.run["id"], perk_ids)
        self.assertEqual(len(updated["current_loadout"]["perks"]), 4)
        self.assertEqual(updated["current_loadout"]["perks"][0]["id"], self.trapper_perks[0].id)

    def test_set_loadout_rejects_wrong_count(self):
        with self.assertRaises(ValueError):
            self.service.set_loadout(self.user_id, self.run["id"], [self.trapper_perks[0].id])

    def test_set_loadout_rejects_first_slot_not_owned_by_target(self):
        perk_ids = [self.nurse_perks[0].id, self.trapper_perks[0].id, self.trapper_perks[1].id, self.nurse_perks[1].id]
        with self.assertRaises(ValueError):
            self.service.set_loadout(self.user_id, self.run["id"], perk_ids)

    def test_set_loadout_rejects_duplicate_perks(self):
        pid = self.trapper_perks[0].id
        with self.assertRaises(ValueError):
            self.service.set_loadout(self.user_id, self.run["id"], [pid, pid, self.nurse_perks[0].id, self.nurse_perks[1].id])

    def test_set_loadout_rejects_locked_perk(self):
        self.ownership_service.set_perk_ownership(self.user_id, self.nurse_perks[0].id, is_unlocked=False)
        perk_ids = [self.trapper_perks[0].id, self.trapper_perks[1].id, self.nurse_perks[0].id, self.nurse_perks[1].id]
        with self.assertRaises(ValueError):
            self.service.set_loadout(self.user_id, self.run["id"], perk_ids)
```

Also delete `test_invalidate_match_rerolls_same_character_and_keeps_streak` and `test_invalidate_match_rejects_invalid_reason` from `TestGauntletResults` (their behavior no longer exists).

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -v`
Expected: FAIL — `AttributeError: 'GauntletService' object has no attribute 'reveal_target'` / `'set_loadout'`

- [ ] **Step 3: Rewrite the perk logic in `GauntletService`**

In `backend/app/services/gauntlet_service.py`, replace the `roll()` method's perk-selection block. The full corrected `roll()`:

```python
    def roll(self, user_id, role, target_character=None):
        run = self.get_or_create_run(user_id, role)
        tier_info = self.get_tier_info(run["current_streak"], role)

        owned_names = self._owned_character_names(user_id, role)

        completed = run["completed_characters"]
        remaining = [c for c in owned_names if c not in completed]
        if not remaining:
            remaining = owned_names if owned_names else [self._initial_target(user_id, role)]

        target_char = target_character if target_character else random.choice(remaining)

        loadout = {"character": target_char, "perks": [], "tier_info": tier_info}

        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.current_character_id = target_char
        r.current_loadout_json = json.dumps(loadout)
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = tier_info
        return d
```

(The `_unlocked_role_perks` helper stays — `set_loadout` reuses it below. The old `char_perks`/`general_perks`/`random.sample` block is gone.)

Add two new methods after `roll()`:

```python
    def reveal_target(self, user_id, run_id):
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        r.target_revealed = True
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = self.get_tier_info(d["current_streak"], r.role)
        return d

    def set_loadout(self, user_id, run_id, perk_ids):
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")

        tier_info = self.get_tier_info(r.current_streak, r.role)
        perk_limit = tier_info["perk_limit"]

        if len(perk_ids) != perk_limit:
            raise ValueError(f"Expected {perk_limit} perks, got {len(perk_ids)}")
        if len(set(perk_ids)) != len(perk_ids):
            raise ValueError("Duplicate perks are not allowed")

        role_perks = {p["id"]: p for p in self._unlocked_role_perks(user_id, r.role)}
        selected = []
        for idx, pid in enumerate(perk_ids):
            perk = role_perks.get(pid)
            if not perk:
                raise ValueError(f"Perk {pid} is not unlocked for this role")
            if idx == 0 and perk.get("character") != r.current_character_id:
                raise ValueError("The first perk must belong to the current target character")
            selected.append(perk)

        loadout = json.loads(r.current_loadout_json or "{}")
        loadout["perks"] = selected
        r.current_loadout_json = json.dumps(loadout)
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = tier_info
        return d
```

Delete `invalidate_match()` entirely.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -v`
Expected: PASS (all tests including the pre-existing ones)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gauntlet_service.py backend/tests/test_gauntlet_service.py
git commit -m "fix(gauntlet): fix character-key perk bug, replace perk auto-roll with manual set_loadout, drop invalidate_match"
```

---

### Task 3: Random item/add-on rolling

**Files:**
- Modify: `backend/app/services/gauntlet_service.py`
- Test: `backend/tests/test_gauntlet_service.py`

**Interfaces:**
- Consumes: `app.models.Item`, `app.models.Addon`
- Produces: `GauntletLoadout` dict gains `item` (dict or `None`) and `addons` (list of dicts), populated by `roll()`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_gauntlet_service.py`. First add a helper near `seed_killer`:

```python
def seed_survivor(name="Meg Thomas", perk_count=1):
    character = Character(name=name, role="Survivor")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Survivor",
        ))
    db.session.commit()
    return character


def seed_item_and_addons():
    item = Item(name="Commodious Toolbox", category="Toolbox", role="Survivor")
    db.session.add(item)
    addon = Addon(
        name="Wire Spool",
        associated_target="Toolboxes",
        category="Survivor",
        description="Increases repair speed.",
    )
    ghost_addon = Addon(
        name="Uncommon Add-ons",
        associated_target="Numbers",
        category="Survivor",
        description="",
    )
    db.session.add_all([addon, ghost_addon])
    db.session.commit()
    return item, addon


def seed_killer_addons(killer_name):
    addon = Addon(
        name=f"{killer_name} Addon",
        associated_target=killer_name,
        category="Killer",
        description="A power add-on.",
    )
    db.session.add(addon)
    db.session.commit()
    return addon
```

Add `Item, Addon` to the `from app.models import ...` line at the top of the file:

```python
from app.models import Character, Perk, Item, Addon
```

Add a new test class:

```python
class TestGauntletItemsAndAddons(GauntletTestCase):
    def test_survivor_loadout_gets_item_and_matching_addon(self):
        seed_survivor()
        item, addon = seed_item_and_addons()
        user_id = self.register_user("itemuser")
        self.service.get_or_create_run(user_id, "survivor")
        run = self.service.roll(user_id, "survivor")
        loadout = run["current_loadout"]
        self.assertEqual(loadout["item"]["name"], item.name)
        self.assertEqual(len(loadout["addons"]), 1)
        self.assertEqual(loadout["addons"][0]["name"], addon.name)

    def test_killer_loadout_gets_matching_addons_only(self):
        killer = seed_killer("Trapper", perk_count=1)
        seed_killer_addons("Trapper")
        seed_killer_addons("Nurse")
        user_id = self.register_user("killeraddonuser")
        self.service.get_or_create_run(user_id, "killer")
        run = self.service.roll(user_id, "killer", target_character="Trapper")
        loadout = run["current_loadout"]
        self.assertNotIn("item", {k: v for k, v in loadout.items() if k == "item" and v})
        self.assertEqual(len(loadout["addons"]), 1)
        self.assertEqual(loadout["addons"][0]["name"], "Trapper Addon")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -k "Items" -v`
Expected: FAIL with `KeyError: 'item'`

- [ ] **Step 3: Implement item/add-on rolling**

In `backend/app/services/gauntlet_service.py`, add `Item, Addon` to the model import:

```python
from app.models import GauntletRun, GauntletMatchLog, Item, Addon
```

Add a helper method (near `_unlocked_role_perks`):

```python
    def _roll_survivor_gear(self):
        items = db.session.scalars(select(Item).where(Item.role == "Survivor")).all()
        if not items:
            return None, []
        item = random.choice(items)
        addons = db.session.scalars(
            select(Addon).where(
                Addon.category == "Survivor",
                Addon.associated_target == item.category,
                Addon.description != "",
            )
        ).all()
        picked = random.sample(addons, min(2, len(addons))) if addons else []
        return item.to_dict(), [a.to_dict() for a in picked]

    def _roll_killer_addons(self, target_char):
        addons = db.session.scalars(
            select(Addon).where(
                Addon.category == "Killer",
                Addon.associated_target == target_char,
                Addon.description != "",
            )
        ).all()
        picked = random.sample(addons, min(2, len(addons))) if addons else []
        return [a.to_dict() for a in picked]
```

Update `roll()` to populate the loadout (replace the `loadout = {...}` line):

```python
        if role == "survivor":
            item, addons = self._roll_survivor_gear()
        else:
            item, addons = None, self._roll_killer_addons(target_char)

        loadout = {"character": target_char, "perks": [], "item": item, "addons": addons, "tier_info": tier_info}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gauntlet_service.py backend/tests/test_gauntlet_service.py
git commit -m "feat(gauntlet): randomly roll a survivor item + addons, or killer power addons, into the loadout"
```

---

### Task 4: Routes — drop `/invalidate`, add `/reveal` and `/loadout`

**Files:**
- Modify: `backend/app/routes/gauntlet_streak.py`
- Modify: `backend/tests/test_gauntlet_routes.py`

**Interfaces:**
- Consumes: `GauntletService.reveal_target`, `GauntletService.set_loadout` (Task 2)
- Produces: `POST /api/v1/gauntlet-streak/reveal`, `POST /api/v1/gauntlet-streak/loadout`

- [ ] **Step 1: Write the failing tests**

In `backend/tests/test_gauntlet_routes.py`, replace `test_invalidate_endpoint` with:

```python
    def test_reveal_endpoint(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]

        res = self.client.post(
            "/api/v1/gauntlet-streak/reveal",
            json={"run_id": run_id},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["run"]["target_revealed"])

    def test_loadout_endpoint(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run = run_res.get_json()["run"]
        target = run["current_character_id"]

        perks_res = self.client.get(
            f"/api/v1/users/{self.user_id}/perks?role=Killer", headers=self.headers
        )
        perks = perks_res.get_json()["data"]
        target_perk = next(p for p in perks if p["character"] == target)
        other_perks = [p for p in perks if p["id"] != target_perk["id"]][:3]
        perk_ids = [target_perk["id"]] + [p["id"] for p in other_perks]

        res = self.client.post(
            "/api/v1/gauntlet-streak/loadout",
            json={"run_id": run["id"], "perk_ids": perk_ids},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()["run"]["current_loadout"]["perks"]), 4)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_routes.py -k "reveal or loadout" -v`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Implement the routes**

In `backend/app/routes/gauntlet_streak.py`, replace the `invalidate_match` route with:

```python
@gauntlet_streak_bp.route("/reveal", methods=["POST"])
@login_required
def reveal():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    if not run_id:
        return jsonify({"error": "Field 'run_id' is required"}), 400

    service = get_gauntlet_service()
    try:
        run = service.reveal_target(g.current_user.id, run_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@gauntlet_streak_bp.route("/loadout", methods=["POST"])
@login_required
def set_loadout():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    perk_ids = data.get("perk_ids")
    if not run_id or perk_ids is None:
        return jsonify({"error": "Fields 'run_id' and 'perk_ids' are required"}), 400

    service = get_gauntlet_service()
    try:
        run = service.set_loadout(g.current_user.id, run_id, perk_ids)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec dbd_backend python -m pytest backend/tests/test_gauntlet_routes.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/gauntlet_streak.py backend/tests/test_gauntlet_routes.py
git commit -m "feat(gauntlet): add /reveal and /loadout endpoints, remove /invalidate"
```

---

### Task 5: Frontend types & API client

**Files:**
- Modify: `frontend/src/types/gauntletStreak.ts`
- Modify: `frontend/src/services/gauntletStreakApi.ts`

**Interfaces:**
- Produces: `Item`, `Addon` types; `GauntletRun.game_mode`, `GauntletRun.target_revealed`, `GauntletLoadout.item`, `GauntletLoadout.addons`; API functions `revealTarget`, `submitLoadout` replacing `invalidateMatch`.

- [ ] **Step 1: Update `gauntletStreak.ts`**

```typescript
export type Role = 'survivor' | 'killer';

export interface Perk {
  id?: number;
  name: string;
  character?: string | null;
  category?: string;
  icon_url?: string;
  icon_local_path?: string;
}

export interface Item {
  id?: number;
  name: string;
  category?: string;
  role?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface Addon {
  id?: number;
  name: string;
  associated_target?: string;
  category?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface GauntletLoadout {
  character: string;
  perks: Perk[];
  item: Item | null;
  addons: Addon[];
}

export interface TierInfo {
  name: string;
  tier_level: number;
  perk_limit: number;
  description: string;
}

export interface GauntletRun {
  id: number;
  role: Role;
  status: string;
  game_mode: string;
  target_revealed: boolean;
  current_character_id: string;
  current_loadout: GauntletLoadout;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  completed_characters: string[];
  checkpoint_characters: string[];
  tier_info: TierInfo;
  created_at?: string;
  updated_at?: string;
}

export interface MatchLog {
  id: number;
  run_id: number;
  role: Role;
  character_id: string;
  result: 'win' | 'loss';
  perks: Perk[];
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface GauntletStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: MatchLog[];
}

export interface RunResponse {
  run: GauntletRun;
}

export interface SubmitResultResponse {
  run: GauntletRun;
  previous_run: GauntletRun;
}

export interface StatsResponse {
  stats: GauntletStats;
}
```

(Renamed `Perk.character_name` → `Perk.character` to match the actual backend field, per the code-review bug fix.)

- [ ] **Step 2: Update `gauntletStreakApi.ts`**

Replace the `invalidateMatch` function with:

```typescript
export async function revealTarget(token: string, runId: number): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/reveal', { run_id: runId });
  return data.run;
}

export async function submitLoadout(
  token: string,
  runId: number,
  perkIds: number[]
): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/loadout', { run_id: runId, perk_ids: perkIds });
  return data.run;
}
```

- [ ] **Step 3: Verify the frontend still type-checks**

Run: `cd frontend && npx tsc --noEmit`
Expected: New errors appear in `ActiveTargetStage.tsx`/`useGauntletRun.ts` (consumers of the old `invalidateMatch`/`character_name`) — that's expected, Tasks 6-8 fix them. Confirm the errors are confined to those two files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/gauntletStreak.ts frontend/src/services/gauntletStreakApi.ts
git commit -m "feat(gauntlet): add Item/Addon types and reveal/loadout API functions, drop invalidateMatch"
```

---

### Task 6: Game mode selector modal

**Files:**
- Create: `frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx`
- Modify: `frontend/src/components/streaks/StreakPanel.tsx`
- Modify: `frontend/src/components/streaks/StreakPanelGrid.tsx`

**Interfaces:**
- Produces: `GauntletModeModal` component `{ isOpen, onClose, onSelectOriginal }`. `StreakPanelGrid` gains an `onOpenGauntletMode?: () => void` prop wired to the `gauntlet-streak` panel id specifically; every other non-`comingSoon` panel keeps its direct `href`.

- [ ] **Step 1: Create `GauntletModeModal.tsx`**

```tsx
'use client';

import React, { useEffect } from 'react';
import { X, Swords, Lock } from 'lucide-react';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectOriginal,
}) => {
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
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose a Gauntlet Mode</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onSelectOriginal}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-5 text-left transition-colors cursor-pointer"
          >
            <Swords className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-slate-900 dark:text-white">Original</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              The classic Gauntlet: manual perk picks, random gear, escalating tiers.
            </span>
          </button>

          <div className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-5 opacity-70">
            <Lock className="w-6 h-6 text-slate-400" />
            <span className="font-bold text-slate-500 dark:text-slate-400">Lemon version</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Coming soon.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire the modal into `StreakPanelGrid`/`StreakPanel`**

In `frontend/src/components/streaks/StreakPanelGrid.tsx`, replace the whole file:

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StreakPanel } from './StreakPanel';
import { StreakPanelDef } from './panels';
import { GauntletModeModal } from './gauntlet/GauntletModeModal';

interface StreakPanelGridProps {
  locale: string;
  role: string;
  panels: StreakPanelDef[];
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale, role, panels }) => {
  const router = useRouter();
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {panels.map((panel) => {
        if (panel.comingSoon) {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              comingSoon
            />
          );
        }

        if (panel.id === 'gauntlet-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              onClick={() => setIsModeModalOpen(true)}
            />
          );
        }

        return (
          <StreakPanel
            key={panel.id}
            title={panel.title}
            description={panel.description}
            icon={panel.icon}
            accent={panel.accent}
            accentBorder={panel.accentBorder}
            href={`/${locale}/streaks/${role}/${panel.id}`}
          />
        );
      })}

      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => router.push(`/${locale}/streaks/${role}/gauntlet-streak`)}
      />
    </div>
  );
};
```

In `frontend/src/components/streaks/StreakPanel.tsx`, extend the prop union and render a `<button>` variant:

```tsx
type StreakPanelProps = StreakPanelBaseProps &
  ({ comingSoon: true; href?: never; onClick?: never } |
   { comingSoon?: false; href: string; onClick?: never } |
   { comingSoon?: false; href?: never; onClick: () => void });
```

Update the destructured props and the render branch (replace the final `return`):

```tsx
export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  accentBorder,
  href,
  onClick,
  comingSoon,
}) => {
  // ...body unchanged...

  if (comingSoon) {
    return <div className={`${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`group text-left ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 hover:border-orange-500/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-lg cursor-pointer`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={`group ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 hover:border-orange-500/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-lg`}
    >
      {body}
    </Link>
  );
};
```

- [ ] **Step 3: Manually verify in the browser**

Run: `docker compose up -d --build frontend`
Navigate to `/en/streaks/survivor` and `/en/streaks/killer`, click "Gauntlet streak". Confirm the modal opens with "Original" (clickable, navigates correctly) and a locked "Lemon version" tile. Confirm "Page streak" (survivor has none, killer has one) still navigates directly without a modal.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx frontend/src/components/streaks/StreakPanel.tsx frontend/src/components/streaks/StreakPanelGrid.tsx
git commit -m "feat(gauntlet): add Original/Lemon version mode selector modal"
```

---

### Task 7: "Start Game" reveal + reveal animation + remove Match Exceptions from `ActiveTargetStage`

**Files:**
- Modify: `frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx`
- Modify: `frontend/src/components/streaks/gauntlet/useGauntletRun.ts`
- Modify: `frontend/src/components/streaks/gauntlet/GauntletBoard.tsx`

**Interfaces:**
- Consumes: `useOwnedCharacters` (already in `GauntletBoard`), `api.revealTarget` (Task 5)
- Produces: `useGauntletRun` gains `reveal: () => Promise<void>`, loses `invalidateMatch`. `ActiveTargetStage` gains `characters: OwnedCharacterItem[]` and `onReveal: () => void` props, loses `onInvalidateMatch`.

- [ ] **Step 1: Update `useGauntletRun.ts`**

Replace the `invalidateMatch` callback and its entry in the returned object:

```typescript
  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealTarget(token, run.id));
  }, [token, run, mutate]);
```

```typescript
  return {
    run,
    stats,
    loading,
    busy,
    error,
    reload: load,
    roll: () => token && mutate(() => api.rollGauntlet(token, role)),
    submitResult,
    reveal,
  };
```

- [ ] **Step 2: Wire `characters` and `onReveal` through `GauntletBoard.tsx`**

```tsx
  const { run, stats, loading, busy, error, roll, submitResult, reveal } = useGauntletRun(role);
  const { characters, loading: loadingRoster } = useOwnedCharacters(role);
```

```tsx
        <ActiveTargetStage
          run={run}
          role={role}
          characters={characters}
          loading={loading || busy}
          onWin={() => submitResult('win')}
          onLoss={() => submitResult('loss')}
          onReroll={roll}
          onReveal={reveal}
        />
```

- [ ] **Step 3: Rewrite `ActiveTargetStage.tsx`**

Update the props interface and add reveal-animation state:

```tsx
import { OwnedCharacterItem } from './useOwnedCharacters';

export interface ActiveTargetStageProps {
  run: GauntletRun | null;
  role: Role;
  characters: OwnedCharacterItem[];
  loading?: boolean;
  onWin: () => void;
  onLoss: () => void;
  onReroll: () => void;
  onReveal: () => void;
}

export const ActiveTargetStage: React.FC<ActiveTargetStageProps> = ({
  run,
  role,
  characters,
  loading = false,
  onWin,
  onLoss,
  onReroll,
  onReveal,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [perkImgErrors, setPerkImgErrors] = useState<Record<number, boolean>>({});
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealCycleIndex, setRevealCycleIndex] = useState(0);

  useEffect(() => {
    if (!isRevealing || characters.length === 0) return;
    const interval = setInterval(() => {
      setRevealCycleIndex((i) => (i + 1) % characters.length);
    }, 120);
    return () => clearInterval(interval);
  }, [isRevealing, characters.length]);

  const handleStartGame = () => {
    setIsRevealing(true);
    setTimeout(() => {
      onReveal();
      setIsRevealing(false);
    }, 1300);
  };
```

(Add `useEffect` to the existing `import React, { useState } from 'react';` line: `import React, { useState, useEffect } from 'react';`.)

Insert the Start Game / reveal-animation branch right after the existing `if (!run || !run.current_loadout)` loading guard:

```tsx
  if (!run.target_revealed) {
    const cyclingChar = characters[revealCycleIndex];
    return (
      <div className="w-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
        <div className="w-24 h-24 mx-auto rounded-2xl p-1 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border-2 border-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden mb-4">
          <div className="w-full h-full bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 dark:text-amber-400 text-sm font-bold px-2">
            {isRevealing && cyclingChar ? cyclingChar.name : role === 'survivor' ? <User className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
          </div>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Ready for the Gauntlet?</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Start the game to draw your {role === 'survivor' ? 'Survivor' : 'Killer'}.
        </p>
        <button
          onClick={handleStartGame}
          disabled={isRevealing || loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-base py-3.5 px-8 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          {isRevealing ? 'Drawing...' : 'START GAME'}
        </button>
      </div>
    );
  }
```

Delete the "Match Exception" block (the entire `<div className="flex flex-wrap items-center justify-center gap-3 pt-2">...DC &lt; 5 Gens...Game Cancelled...</div>` section) and the now-unused `ShieldAlert, Ban` icon imports.

Update the perk-owner label to use the corrected field (§Task 5 renamed `character_name` → `character`):

```tsx
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {perk.character || 'General Perk'}
                  </p>
```

- [ ] **Step 4: Manually verify in the browser**

Run: `docker compose up -d --build frontend`
Start a brand-new Gauntlet run (or delete the existing one via a fresh test user), confirm "START GAME" shows, cycles avatars briefly, then reveals the target and shows Win/Lose. Confirm no "Match Exception" buttons remain, and confirm perk owner labels show real character names once Task 8's picker is in place (they'll show "General Perk" until then, since loadouts are still empty — expected at this point in the plan).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx frontend/src/components/streaks/gauntlet/useGauntletRun.ts frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
git commit -m "feat(gauntlet): add Start Game reveal flow, remove Match Exceptions from the UI"
```

---

### Task 8: Manual perk picker + item/add-on display + gate Win/Lose on a submitted loadout

**Files:**
- Create: `frontend/src/components/streaks/gauntlet/PerkPickerPanel.tsx`
- Modify: `frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx`
- Modify: `frontend/src/components/streaks/gauntlet/useGauntletRun.ts`
- Modify: `frontend/src/components/streaks/gauntlet/GauntletBoard.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/users/{id}/perks?role=...` (existing endpoint, used by `CharactersHub`), `api.submitLoadout` (Task 5)
- Produces: `PerkPickerPanel` component `{ role, targetCharacter, perkLimit, onSubmit(perkIds: number[]) }`. `useGauntletRun` gains `submitLoadout: (perkIds: number[]) => Promise<void>`.

- [ ] **Step 1: Create `PerkPickerPanel.tsx`**

```tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, Lock } from 'lucide-react';

interface UnlockedPerk {
  id: number;
  name: string;
  character?: string | null;
}

export interface PerkPickerPanelProps {
  role: Role;
  targetCharacter: string;
  perkLimit: number;
  busy?: boolean;
  onSubmit: (perkIds: number[]) => void;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const PerkPickerPanel: React.FC<PerkPickerPanelProps> = ({
  role,
  targetCharacter,
  perkLimit,
  busy = false,
  onSubmit,
}) => {
  const { token, user } = useAuth();
  const [perks, setPerks] = useState<UnlockedPerk[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!token || !user) return;
    const dbRole = role === 'killer' ? 'Killer' : 'Survivor';
    fetch(`${backendBase}/api/v1/users/${user.id}/perks?role=${dbRole}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const unlocked = (data.data || []).filter((p: any) => p.is_unlocked);
        setPerks(unlocked);
      });
    setSelected([]);
  }, [token, user, role, targetCharacter]);

  const targetPerks = useMemo(() => perks.filter((p) => p.character === targetCharacter), [perks, targetCharacter]);

  const pickSlot = (index: number, perkId: number) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = perkId;
      return next;
    });
  };

  const isValid =
    selected.length === perkLimit &&
    selected.every((v) => v !== undefined) &&
    new Set(selected).size === perkLimit;

  if (perkLimit === 0) return null;

  return (
    <div className="mb-8 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
        Choose Your Loadout ({perkLimit} Perk{perkLimit !== 1 ? 's' : ''})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Array.from({ length: perkLimit }).map((_, idx) => {
          const options = idx === 0 ? targetPerks : perks;
          return (
            <select
              key={idx}
              value={selected[idx] ?? ''}
              onChange={(e) => pickSlot(idx, Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            >
              <option value="" disabled>
                {idx === 0 ? `Slot 1 — ${targetCharacter} perk` : `Slot ${idx + 1} — any unlocked perk`}
              </option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          );
        })}
      </div>
      <button
        onClick={() => onSubmit(selected)}
        disabled={!isValid || busy}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm py-3 px-6 rounded-xl transition-all cursor-pointer"
      >
        {isValid ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        Confirm Loadout
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Add `submitLoadout` to `useGauntletRun.ts`**

```typescript
  const submitLoadout = useCallback(
    (perkIds: number[]) => {
      if (!token || !run) return;
      return mutate(() => api.submitLoadout(token, run.id, perkIds));
    },
    [token, run, mutate]
  );
```

Add `submitLoadout` to the returned object (alongside `reveal`).

- [ ] **Step 3: Wire into `GauntletBoard.tsx`**

```tsx
  const { run, stats, loading, busy, error, roll, submitResult, reveal, submitLoadout } = useGauntletRun(role);
```

```tsx
        <ActiveTargetStage
          run={run}
          role={role}
          characters={characters}
          loading={loading || busy}
          onWin={() => submitResult('win')}
          onLoss={() => submitResult('loss')}
          onReroll={roll}
          onReveal={reveal}
          onSubmitLoadout={submitLoadout}
        />
```

- [ ] **Step 4: Wire into `ActiveTargetStage.tsx`**

Add the prop and import:

```tsx
import { PerkPickerPanel } from './PerkPickerPanel';
```

```tsx
export interface ActiveTargetStageProps {
  run: GauntletRun | null;
  role: Role;
  characters: OwnedCharacterItem[];
  loading?: boolean;
  onWin: () => void;
  onLoss: () => void;
  onReroll: () => void;
  onReveal: () => void;
  onSubmitLoadout: (perkIds: number[]) => void;
}
```

Add `onSubmitLoadout` to the destructured props. Insert the picker right before the "Perk Loadout Grid" section, and gate the Win/Lose buttons:

```tsx
      {perkLimit > 0 && loadout.perks.length !== perkLimit && (
        <PerkPickerPanel
          role={role}
          targetCharacter={targetName}
          perkLimit={perkLimit}
          busy={loading}
          onSubmit={onSubmitLoadout}
        />
      )}
```

```tsx
          <button
            onClick={onWin}
            disabled={loading || (perkLimit > 0 && loadout.perks.length !== perkLimit)}
            className="w-full sm:w-auto flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5 text-emerald-100" />
            <span>WIN MATCH</span>
          </button>

          <button
            onClick={onLoss}
            disabled={loading || (perkLimit > 0 && loadout.perks.length !== perkLimit)}
```

Add a display card for `loadout.item`/`loadout.addons` right after the perk grid's closing `</div>` (before the "Action Buttons" comment):

```tsx
      {(loadout.item || loadout.addons.length > 0) && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Rolled Gear
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadout.item && (
              <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{loadout.item.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Item</p>
              </div>
            )}
            {loadout.addons.map((addon, idx) => (
              <div key={addon.id || idx} className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{addon.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Add-on</p>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 5: Type-check and manually verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

Run: `docker compose up -d --build frontend`
Play through: Start Game → reveal → pick perks (slot 1 restricted to target character) → Confirm Loadout → Win/Lose buttons become enabled → win a match → confirm the next target's perks are empty again and a new item/add-ons display shows.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/PerkPickerPanel.tsx frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx frontend/src/components/streaks/gauntlet/useGauntletRun.ts frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
git commit -m "feat(gauntlet): add manual perk picker, rolled-gear display, gate Win/Lose on a submitted loadout"
```

---

### Task 9: Update `GauntletRulesModal` copy

**Files:**
- Modify: `frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx`

**Interfaces:** none (presentation-only change)

- [ ] **Step 1: Replace the Match Invalidation Exceptions section**

Replace the whole block (`<div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-sm">...</div>` containing "Match Invalidation Exceptions") with:

```tsx
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 space-y-2 shadow-sm">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Disconnects & Cancelled Games
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              If someone disconnects or the game gets cancelled, just play the match again — it won't affect your streak.
            </p>
          </div>
```

- [ ] **Step 2: Manually verify in the browser**

Open the "Gauntlet Rules" modal for both roles, confirm the new copy renders and no references to "DC &lt; 5 Gens"/"Game Cancelled" buttons remain.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx
git commit -m "docs(gauntlet): update rules modal copy for the removed Match Exceptions buttons"
```

---

## Backlog (not yet scheduled — add as new tasks when ready)

Per spec §7 and open questions raised during brainstorming, deliberately deferred:
- Lemon version's actual rules/behavior.
- Item/Addon per-user ownership tracking (mirroring `CharactersHub`'s character/perk ownership UI).
- Tier-scaling of item/add-on counts once the user has decided how that should work.
- The broken `Object of Obsession → Bound by Obsession` perk reference and the 7 scraper-artifact `Addon` rows keyed to `associated_target == "Numbers"` (data-quality issues found during audits, out of scope here beyond the description-emptiness filter in Task 3).

# Frozen Challenge Pools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Gauntlet, Chaos, and History streak runs from silently changing their own rules mid-run when the player unlocks a new character/killer/perk — freeze each run's pool at creation and only re-freeze on reset, a loss that fully resets progress, or a win that completes the run. Also auto-apply a loss to abandoned `in_progress` runs (all four modes, including Page Streak) after 90 days of inactivity, recorded in that mode's match-log history rather than silently deleted.

**Architecture:** Add one JSON snapshot column per affected run table, written by a small `_freeze_*` helper in each service. Every read of "what's in play for this run" switches from a live ownership/perk query to `json.loads(run.owned_*_json or "[]")`. Existing in-progress runs lazily freeze on their first post-migration read (empty-snapshot check), so no backfill script is needed. Separately, an in-process APScheduler job (no new containers/broker) applies the same loss-branch state transition each service already has to stale `in_progress` runs daily, guarded by a Postgres advisory lock so gunicorn's multiple worker processes don't race each other.

**Tech Stack:** Flask, SQLAlchemy, Alembic, APScheduler, pytest (backend); Next.js/React/TypeScript (frontend).

**Spec:** `docs/superpowers/specs/2026-08-21-frozen-challenge-pools-design.md`

## Global Constraints

- Store pool snapshots as name-string lists, matching every existing column in these three tables (`completed_characters_json` etc.) — do not introduce ID-based storage in this change (see spec's "Out of scope").
- Freeze/re-freeze happens at exactly three points per run: creation, a loss that resets progress fully to zero (no checkpoint fallback), and a win that sets `status = "completed"`. A loss that falls back to an already-banked checkpoint does not re-freeze.
- An existing run with an empty/missing snapshot freezes itself once, lazily, the first time it's read after this migration — never write a separate backfill script.
- No UI changes beyond what's listed in Tasks 5-8 — don't touch unrelated board behavior.
- Inactive-run handling (Tasks 9-11) never deletes a run — a `status == "in_progress"` row past `STREAK_INACTIVITY_PRUNE_DAYS` (default 90) gets the same loss treatment a real match loss would (checkpoint fallback or reset-to-zero) plus a match-log row flagged `triggered_by = "inactivity"`. The run survives. `"completed"` runs are never touched, regardless of age.
- The scheduler must not start under `TESTING` config, and `apply_inactivity_losses` must stay callable directly against SQLite (the test DB) without a live Postgres connection.

---

### Task 1: Migration — add pool snapshot columns

**Files:**
- Create: `backend/migrations/versions/freeze_challenge_pools_001.py`
- Modify: `backend/app/models/gauntlet.py`
- Modify: `backend/app/models/chaos.py`
- Modify: `backend/app/models/history.py`

**Interfaces:**
- Produces: `GauntletRun.owned_characters_json`, `ChaosRun.owned_killers_json`, `ChaosRun.unlocked_perks_json`, `HistoryRun.owned_killers_json` — all `Text`, default `"[]"`, nullable=False.
- Produces: `GauntletRun.to_dict()["owned_characters"]`, `ChaosRun.to_dict()["owned_killers"]`, `ChaosRun.to_dict()["unlocked_perks"]` (name list, not full perk objects — see Task 3), `HistoryRun.to_dict()["owned_killers"]` — parsed lists, same pattern as `completed_characters` etc.

- [ ] **Step 1: Add the migration**

```python
# backend/migrations/versions/freeze_challenge_pools_001.py
"""add frozen pool snapshot columns to gauntlet/chaos/history runs

Revision ID: freeze_pools_001
Revises: add_perk_aliases_001
Create Date: 2026-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "freeze_pools_001"
down_revision = "add_perk_aliases_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gauntlet_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_characters_json", sa.Text(), server_default="[]", nullable=False)
        )
    with op.batch_alter_table("chaos_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_killers_json", sa.Text(), server_default="[]", nullable=False)
        )
        batch_op.add_column(
            sa.Column("unlocked_perks_json", sa.Text(), server_default="[]", nullable=False)
        )
    with op.batch_alter_table("history_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("owned_killers_json", sa.Text(), server_default="[]", nullable=False)
        )


def downgrade():
    with op.batch_alter_table("history_runs", schema=None) as batch_op:
        batch_op.drop_column("owned_killers_json")
    with op.batch_alter_table("chaos_runs", schema=None) as batch_op:
        batch_op.drop_column("unlocked_perks_json")
        batch_op.drop_column("owned_killers_json")
    with op.batch_alter_table("gauntlet_runs", schema=None) as batch_op:
        batch_op.drop_column("owned_characters_json")
```

- [ ] **Step 2: Add the column + `to_dict()` entry to `GauntletRun`**

In `backend/app/models/gauntlet.py`, add to the column list (after `current_loadout_json`):

```python
    owned_characters_json: Mapped[str] = mapped_column(Text, default="[]")
```

In `to_dict()`, add alongside `"current_loadout"`:

```python
            "owned_characters": json.loads(self.owned_characters_json or "[]"),
```

- [ ] **Step 3: Add the columns + `to_dict()` entries to `ChaosRun`**

In `backend/app/models/chaos.py`, add to the column list (after `current_addon_rarities_json`):

```python
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    unlocked_perks_json: Mapped[str] = mapped_column(Text, default="[]")
```

In `to_dict()`, add alongside `"current_addon_rarities"`:

```python
            "owned_killers": json.loads(self.owned_killers_json or "[]"),
            "unlocked_perks": json.loads(self.unlocked_perks_json or "[]"),
```

- [ ] **Step 4: Add the column + `to_dict()` entry to `HistoryRun`**

In `backend/app/models/history.py`, add to the column list (after `checkpoint_unlocked_perk_names_json`):

```python
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]")
```

In `to_dict()`, add alongside `"unlocked_perk_names"`:

```python
            "owned_killers": json.loads(self.owned_killers_json or "[]"),
```

- [ ] **Step 5: Run the migration against the dev database**

Run: `cd backend && flask db upgrade` (or `alembic upgrade head` per however this repo invokes it — check `backend/migrations/env.py` if `flask db` isn't wired up)
Expected: no errors; `\d gauntlet_runs`, `\d chaos_runs`, `\d history_runs` in psql show the four new columns.

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/versions/freeze_challenge_pools_001.py backend/app/models/gauntlet.py backend/app/models/chaos.py backend/app/models/history.py
git commit -m "feat(streaks): add frozen pool snapshot columns to gauntlet/chaos/history runs"
```

---

### Task 2: Gauntlet — freeze and use the character pool

**Files:**
- Modify: `backend/app/services/gauntlet/roller.py`
- Modify: `backend/app/services/gauntlet_service.py`
- Test: `backend/tests/unit/test_gauntlet_service.py`

**Interfaces:**
- Consumes: `GauntletRun.owned_characters_json` / `to_dict()["owned_characters"]` from Task 1.
- Produces: `GauntletService._freeze_pool(r: GauntletRun) -> List[str]` (writes `r.owned_characters_json`, does not commit).
- Produces: `roll_gauntlet_target(role, current_streak, completed_characters, owned_characters, target_character=None)` — signature changes, drops `user_id`/`ownership_service`, adds `owned_characters: List[str]`.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/unit/test_gauntlet_service.py`, inside `TestGauntletResults` (reuse its `setUp`, which seeds Nurse+Trapper and creates a run for `resultsuser`):

```python
    def test_new_character_mid_run_is_not_immediately_rollable(self):
        huntress = seed_killer("Huntress")
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            self.assertNotEqual(run["current_character_id"], "Huntress")

    def test_completion_check_ignores_a_character_owned_mid_run(self):
        seed_killer("Huntress")
        run = self.service.get_or_create_run(self.user_id, "killer")
        # get_or_create_run above only re-reads; the pool was frozen to
        # {Nurse, Trapper} back in setUp's initial get_or_create_run call.
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")

    def test_loss_to_zero_refreezes_the_pool(self):
        self.service.submit_result(self.user_id, self.run["id"], "loss")
        seed_killer("Huntress")
        refrozen = self.service.get_or_create_run(self.user_id, "killer")
        self.assertIn("Huntress", refrozen["owned_characters"])

    def test_completing_the_run_refreezes_the_pool(self):
        run = self.run
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")
        seed_killer("Huntress")
        reloaded = self.service.get_or_create_run(self.user_id, "killer")
        self.assertIn("Huntress", reloaded["owned_characters"])
```

Add a new test class for the lazy-freeze-on-read path (an existing run with an empty snapshot, simulating a pre-migration row):

```python
class TestGauntletLazyFreeze(GauntletTestCase):
    def test_existing_run_with_empty_snapshot_freezes_on_read(self):
        seed_killer("Nurse")
        seed_killer("Trapper")
        user_id = self.register_user("lazyfreezeuser")
        run = self.service.get_or_create_run(user_id, "killer")
        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.owned_characters_json = "[]"
        db.session.commit()

        reloaded = self.service.get_or_create_run(user_id, "killer")
        self.assertEqual(sorted(reloaded["owned_characters"]), ["Nurse", "Trapper"])
```

Add the import this new test class needs at the top of the file:

```python
from app.models import GauntletRun
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_gauntlet_service.py -v -k "new_character_mid_run or completion_check_ignores or loss_to_zero_refreezes or completing_the_run_refreezes or lazy_freeze"`
Expected: FAIL — `test_new_character_mid_run_is_not_immediately_rollable` and `test_completion_check_ignores_a_character_owned_mid_run` fail because `roll`/`submit_result` are still live; the two refreeze tests and the lazy-freeze test fail with `KeyError: 'owned_characters'` since `to_dict()` doesn't have it wired to real freeze logic yet (Task 1 added the field but nothing writes it).

- [ ] **Step 3: Change `roll_gauntlet_target`'s signature to take the pool directly**

In `backend/app/services/gauntlet/roller.py`, replace the function:

```python
def roll_gauntlet_target(
    role: str,
    current_streak: int,
    completed_characters: List[str],
    owned_characters: List[str],
    target_character: Optional[str] = None,
) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Selects the next target character and its build guide.
    Returns: (target_character, loadout_dict, tier_info_dict)
    """
    tier_info = get_tier_info(current_streak, role)

    remaining = [c for c in owned_characters if c not in completed_characters]
    if not remaining:
        remaining = owned_characters if owned_characters else [
            "Meg Thomas" if role == "survivor" else "The Trapper"
        ]

    target_char = target_character if target_character else random.choice(remaining)

    loadout = {
        "character": target_char,
        "character_perks": get_character_teachable_perks(target_char),
        "tier_info": tier_info,
    }

    return target_char, loadout, tier_info
```

`pick_initial_target` and `get_owned_character_names` stay exactly as they are — they're still needed for freezing.

- [ ] **Step 4: Add `_freeze_pool` and wire it into every read/write path in `GauntletService`**

In `backend/app/services/gauntlet_service.py`:

```python
    def _freeze_pool(self, r: GauntletRun) -> list:
        names = get_owned_character_names(r.user_id, r.role, self.ownership_service)
        r.owned_characters_json = json.dumps(names)
        return names
```

Change `get_or_create_run`:

```python
    def get_or_create_run(self, user_id: int, role: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(GauntletRun).where(
                GauntletRun.user_id == user_id,
                GauntletRun.role == role,
            )
        ).first()

        if run:
            if not json.loads(run.owned_characters_json or "[]"):
                self._freeze_pool(run)
                db.session.commit()
            data = run.to_dict()
            data["tier_info"] = self.get_tier_info(data["current_streak"], role)
            return data

        target_character = pick_initial_target(user_id, role, self.ownership_service)
        tier_info = self.get_tier_info(0, role)
        initial_loadout = {
            "character": target_character,
            "character_perks": get_character_teachable_perks(target_character),
            "tier_info": tier_info,
        }

        new_run = GauntletRun(
            user_id=user_id,
            role=role,
            status="in_progress",
            current_character_id=target_character,
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_characters_json="[]",
            checkpoint_characters_json="[]",
            current_loadout_json=json.dumps(initial_loadout),
        )
        self._freeze_pool(new_run)
        db.session.add(new_run)
        db.session.commit()

        data = new_run.to_dict()
        data["tier_info"] = tier_info
        return data
```

Change `roll` to pass the frozen pool instead of `ownership_service`:

```python
    def roll(self, user_id: int, role: str, target_character: Optional[str] = None) -> Dict[str, Any]:
        run = self.get_or_create_run(user_id, role)
        completed = run.get("completed_characters", [])

        target_char, loadout, tier_info = roll_gauntlet_target(
            role=role,
            current_streak=run["current_streak"],
            completed_characters=completed,
            owned_characters=run["owned_characters"],
            target_character=target_character,
        )

        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.current_character_id = target_char
        r.current_loadout_json = json.dumps(loadout)
        db.session.commit()

        data = r.to_dict()
        data["tier_info"] = tier_info
        return data
```

Change `submit_result`'s completion check and add the two refreeze points:

```python
        if result == "win":
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            if char_id not in completed:
                completed.append(char_id)
            if CHECKPOINT_INTERVAL > 0 and streak_after % CHECKPOINT_INTERVAL == 0:
                last_checkpoint = streak_after
                checkpoint_chars = list(completed)
            # The gauntlet is won once every character frozen into this
            # run's pool has been cleared.
            owned = json.loads(r.owned_characters_json or "[]")
            if owned and all(name in completed for name in owned):
                r.status = "completed"
        else:
            streak_after = last_checkpoint if CHECKPOINT_INTERVAL > 0 else 0
            completed = list(checkpoint_chars)
            best_after = best_streak

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_characters_json = json.dumps(completed)
        r.checkpoint_characters_json = json.dumps(checkpoint_chars)

        if result == "win" and r.status == "completed":
            self._freeze_pool(r)
        elif result == "loss" and streak_after == 0:
            self._freeze_pool(r)
```

Place that last `if/elif` block right after `r.checkpoint_characters_json = ...` and before the `db.session.add(GauntletMatchLog(...))` call, so the refreeze is part of the same commit.

Update the import line at the top of the file to drop `roll_gauntlet_target`'s now-unused `ownership_service` positional usage — no import changes needed since it's still imported the same way, just called with different keyword arguments.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_gauntlet_service.py -v`
Expected: PASS — all tests including the pre-existing ones (this file's existing tests must still pass unchanged; `test_pool_excludes_killers_past_the_original_cutoff` and `test_a_killer_past_the_cutoff_is_never_drawn` exercise `get_owned_character_names` and `roll` respectively and should be unaffected by the signature change since `roll` itself keeps its public signature).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/gauntlet/roller.py backend/app/services/gauntlet_service.py backend/tests/unit/test_gauntlet_service.py
git commit -m "feat(gauntlet): freeze the character pool per run instead of reading ownership live"
```

---

### Task 3: Chaos — freeze and use the killer roster + perk pool

**Files:**
- Modify: `backend/app/services/chaos_service.py`
- Test: `backend/tests/unit/test_chaos_service.py`

**Interfaces:**
- Consumes: `ChaosRun.owned_killers_json`, `ChaosRun.unlocked_perks_json` / `to_dict()["owned_killers"]`, `to_dict()["unlocked_perks"]` (name list) from Task 1.
- Produces: `ChaosService._freeze_pools(r: ChaosRun) -> None` (writes both columns as name lists, does not commit).
- Produces: `resolve_perks_by_names(names: List[str]) -> List[Dict[str, Any]]` in `backend/app/services/chaos/roller.py` — plain DB lookup, no `lang`, used to turn the frozen name list back into full perk dicts wherever the drawer or the frontend needs icon/description data.
- Produces: `data["unlocked_perks_detail"]` on every `get_or_create_run`/`submit_result` response — the resolved full-object list, for the frontend's perk pool modal (Task 6).

- [ ] **Step 1: Read the existing test file's fixtures**

Open `backend/tests/unit/test_chaos_service.py` and note its `setUp`/seed helpers before writing new tests — mirror their exact seeding style (this file was not read during planning; the implementer must match whatever helper names it already uses, e.g. a `seed_killer`-equivalent, rather than inventing new ones).

- [ ] **Step 2: Write the failing tests**

Add these to the appropriate existing `TestCase` subclass in `backend/tests/unit/test_chaos_service.py` (the one whose `setUp` already creates an in-progress run for one user with at least two owned killers and their perks unlocked):

```python
    def test_new_killer_mid_run_is_not_in_the_completion_check(self):
        # seed a third killer the same way setUp seeded the first two, then
        # win with every killer that was owned at run creation
        seed_killer("Huntress")
        run = self.run
        remaining = list(run["owned_killers"])
        for killer in remaining:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        self.assertEqual(run["status"], "completed")

    def test_new_perk_mid_run_is_not_drawn(self):
        run = self.service.submit_result(self.user_id, self.run["id"], "win", self.run["owned_killers"][0])
        unlocked_names_before = set(run["unlocked_perks"])
        seed_new_perk("Brand New Perk")  # matches setUp's perk-seeding helper
        drawn_names = {p["name"] for p in run["current_perks"]}
        self.assertFalse(drawn_names - unlocked_names_before)

    def test_unlocked_perks_detail_resolves_full_objects(self):
        run = self.run
        self.assertEqual(
            sorted(p["name"] for p in run["unlocked_perks_detail"]),
            sorted(run["unlocked_perks"]),
        )
        self.assertIn("icon_local_path", run["unlocked_perks_detail"][0])

    def test_loss_to_zero_refreezes_both_pools(self):
        self.service.submit_result(self.user_id, self.run["id"], "loss", self.run["owned_killers"][0])
        seed_killer("Huntress")
        refrozen = self.service.get_or_create_run(self.user_id, self.difficulty)
        self.assertIn("Huntress", refrozen["owned_killers"])
```

(`seed_killer` / `seed_new_perk` here are placeholders for whatever this test file's actual seeding helpers are named — replace with the real names once Step 1 is done; keep the assertions.)

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_chaos_service.py -v -k "mid_run or refreezes"`
Expected: FAIL — completion check and perk draw are still live, and `owned_killers`/`unlocked_perks` aren't populated yet.

- [ ] **Step 4: Add `resolve_perks_by_names` to the roller**

In `backend/app/services/chaos/roller.py`, add:

```python
from sqlalchemy import select

from app.core.extensions import db
from app.models import Perk


def resolve_perks_by_names(names: List[str]) -> List[Dict[str, Any]]:
    """Turns a frozen name list back into full perk dicts (icon, description).
    Plain DB lookup, no lang param -- this is an internal service call, not
    the locale-aware /api/v1/perks route, so it can't reintroduce the
    Page-Streak-icon-style name/translation drift."""
    if not names:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.name.in_(names))).all()
    by_name = {p.name: p.to_dict() for p in perks}
    return [by_name[n] for n in names if n in by_name]
```

- [ ] **Step 5: Add `_freeze_pools` and wire it in**

In `backend/app/services/chaos_service.py`:

```python
    def _freeze_pools(self, r: ChaosRun) -> None:
        r.owned_killers_json = json.dumps(get_owned_killer_names(r.user_id, self.ownership_service))
        unlocked = get_unlocked_killer_perks(r.user_id, self.ownership_service)
        r.unlocked_perks_json = json.dumps([p["name"] for p in unlocked])
```

Change `_draw_build` to take the already-resolved frozen pool instead of querying live:

```python
    def _draw_build(self, unlocked_perks, used_perk_names):
        perks, updated_used = draw_chaos_perks(unlocked_perks, used_perk_names)
        addon_rarities = draw_addon_rarities()
        return perks, updated_used, addon_rarities
```

Update the import line at the top of `chaos_service.py` to add `resolve_perks_by_names`:

```python
from app.services.chaos import (
    checkpoint_interval,
    draw_addon_rarities,
    draw_chaos_perks,
    fetch_chaos_user_stats,
    get_owned_killer_names,
    get_unlocked_killer_perks,
    resolve_perks_by_names,
)
```

Update `get_or_create_run` to freeze on creation and lazily on read, resolving the frozen names to full objects for the draw and for `unlocked_perks_detail`:

```python
    def get_or_create_run(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(ChaosRun).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
        ).first()
        if run:
            if not json.loads(run.owned_killers_json or "[]") or not json.loads(run.unlocked_perks_json or "[]"):
                self._freeze_pools(run)
                db.session.commit()
            data = run.to_dict()
            data["checkpoint_interval"] = checkpoint_interval(difficulty)
            data["unlocked_perks_detail"] = resolve_perks_by_names(data["unlocked_perks"])
            return data

        new_run = ChaosRun(
            user_id=user_id,
            difficulty=difficulty,
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            checkpoint_used_perks_json="[]",
            perks_revealed=False,
        )
        self._freeze_pools(new_run)
        unlocked_detail = resolve_perks_by_names(json.loads(new_run.unlocked_perks_json))
        perks, used_perks, addon_rarities = self._draw_build(unlocked_detail, [])
        new_run.used_perks_json = json.dumps(used_perks)
        new_run.current_perks_json = json.dumps(perks)
        new_run.current_addon_rarities_json = json.dumps(addon_rarities)
        db.session.add(new_run)
        db.session.commit()

        data = new_run.to_dict()
        data["checkpoint_interval"] = checkpoint_interval(difficulty)
        data["unlocked_perks_detail"] = unlocked_detail
        return data
```

Update `submit_result`'s completion check, perk draw, and add the two refreeze points:

```python
        owned = json.loads(r.owned_killers_json or "[]")
        if result == "win" and owned and all(name in completed for name in owned):
            r.status = "completed"
            r.used_perks_json = json.dumps(used_perks)
            self._freeze_pools(r)
            db.session.commit()
        else:
            unlocked_detail = resolve_perks_by_names(json.loads(r.unlocked_perks_json or "[]"))
            new_perks, updated_used, addon_rarities = self._draw_build(unlocked_detail, used_perks)
            r.used_perks_json = json.dumps(updated_used)
            r.current_perks_json = json.dumps(new_perks)
            r.current_addon_rarities_json = json.dumps(addon_rarities)
            r.perks_revealed = False
            if result == "loss" and streak_after == 0:
                self._freeze_pools(r)
            db.session.commit()

        data = r.to_dict()
        data["checkpoint_interval"] = checkpoint_interval(r.difficulty)
        data["unlocked_perks_detail"] = resolve_perks_by_names(data["unlocked_perks"])
        return data
```

This replaces the existing `owned = get_owned_killer_names(...)` line, the `if result == "win" and owned and all(...)` block, the `else` branch's `new_perks, updated_used, addon_rarities = self._draw_build(user_id, used_perks)` call, and the trailing `data = r.to_dict(); data["checkpoint_interval"] = ...; return data` lines at the end of the method (search for them — this plan assumes their current form matches what was read from the file earlier in this session; adjust the replacement to match whatever's actually there if it differs slightly).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_chaos_service.py -v`
Expected: PASS — all tests, including pre-existing ones.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/chaos_service.py backend/tests/unit/test_chaos_service.py
git commit -m "feat(chaos): freeze the killer roster and perk pool per run instead of reading ownership live"
```

---

### Task 4: History — freeze and use the killer roster

**Files:**
- Modify: `backend/app/services/history_service.py`
- Test: `backend/tests/unit/test_history_service.py`

**Interfaces:**
- Consumes: `HistoryRun.owned_killers_json` / `to_dict()["owned_killers"]` from Task 1.
- Produces: `HistoryService._freeze_pool(run: HistoryRun) -> List[str]` (writes `run.owned_killers_json`, does not commit).

- [ ] **Step 1: Read the existing test file's fixtures**

Open `backend/tests/unit/test_history_service.py` and note its seeding helpers and `setUp` before writing new tests, same as Task 3 Step 1.

- [ ] **Step 2: Write the failing tests**

```python
    def test_new_killer_mid_run_does_not_reshuffle_the_active_row(self):
        before = self.service.get_or_create_run(self.user_id, self.mode)
        row_before = before["current_row_killers"]
        seed_killer("Some New Killer")
        after = self.service.get_or_create_run(self.user_id, self.mode)
        self.assertEqual(after["current_row_killers"], row_before)

    def test_hell_loss_refreezes_the_roster(self):
        # assumes self.mode == "hell" in this test's fixture; if not, create
        # a dedicated hell-mode run here instead of reusing self.run
        run = self.service.submit_result(self.user_id, self.run["id"], "loss", self.run["current_row_killers"][0])
        seed_killer("Some New Killer")
        refrozen = self.service.get_or_create_run(self.user_id, self.mode)
        self.assertIn("Some New Killer", refrozen["owned_killers"])

    def test_medium_checkpoint_loss_does_not_refreeze(self):
        # win the first row to bank a medium-mode checkpoint, then lose --
        # the roster snapshot must stay exactly what it was at row start
        pass  # implementer: flesh out using this file's medium-mode fixtures
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_history_service.py -v -k "mid_run or refreezes"`
Expected: FAIL — roster is still recomputed live on every read.

- [ ] **Step 4: Add `_freeze_pool` and wire it in**

In `backend/app/services/history_service.py`:

```python
    def _freeze_pool(self, run: HistoryRun) -> List[str]:
        names = get_owned_killer_names_by_release(run.user_id, self.ownership_service)
        run.owned_killers_json = json.dumps(names)
        return names
```

Change `_augment` to source `owned_names` from the run's own snapshot instead of a parameter, freezing lazily if empty:

```python
    def _augment(self, run: HistoryRun) -> Dict[str, Any]:
        owned_names = json.loads(run.owned_killers_json or "[]")
        if not owned_names:
            owned_names = self._freeze_pool(run)
            db.session.commit()
        rows = build_rows(owned_names)

        if run.status == "in_progress" and rows and run.current_row_index >= len(rows):
            run.current_row_index = len(rows) - 1
            run.completed_killers_json = "[]"
            db.session.commit()

        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []

        if current_row:
            completed = json.loads(run.completed_killers_json or "[]")
            filtered = [k for k in completed if k in current_row]
            if filtered != completed:
                run.completed_killers_json = json.dumps(filtered)
                db.session.commit()

        data = run.to_dict()
        data["current_row_killers"] = current_row
        data["row_size"] = ROW_SIZE
        data["total_rows"] = len(rows)
        data["total_owned_killers"] = len(owned_names)
        return data
```

Update every call site of `_augment` to drop the now-removed `owned_names` argument (`self._augment(run, owned_names)` → `self._augment(run)`) in `get_or_create_run` and `submit_result`.

Update `get_or_create_run` to freeze on creation and stop calling `self._owned_names(user_id)` up front:

```python
    def get_or_create_run(self, user_id: int, mode: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).first()
        if run:
            return self._augment(run)

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
        self._freeze_pool(run)
        db.session.add(run)
        db.session.commit()
        return self._augment(run)
```

Update `submit_result` to read `current_row` off the run's own frozen snapshot instead of calling `self._owned_names(user_id)` + `build_rows(...)` again, and add the two refreeze points:

```python
        owned_names = json.loads(run.owned_killers_json or "[]")
        rows = build_rows(owned_names)
        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []
        if killer_id not in current_row:
            raise ValueError(f"{killer_id} is not in the active row")
```

(replaces the existing `owned_names = self._owned_names(user_id)` / `rows = build_rows(owned_names)` / `current_row = ...` block near the top of `submit_result`)

Then, in the `else` (loss) branch's hell-mode path (`if run.mode == "medium": ... else: ...`), add the refreeze after the existing reset assignments:

```python
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
                self._freeze_pool(run)
```

And in the win branch, right after `if run.current_row_index >= len(rows): run.status = "completed"`, add:

```python
                if run.current_row_index >= len(rows):
                    run.status = "completed"
                    self._freeze_pool(run)
```

Finally, update the `data = self._augment(run, owned_names)` call at the end of `submit_result` to `data = self._augment(run)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_history_service.py -v`
Expected: PASS — all tests, including pre-existing ones. Pay particular attention to any pre-existing test that asserted live-roster behavior (matching the old design spec) — per this plan's spec, that behavior is intentionally reversed, so such a test's assertion should be updated to match the new frozen behavior rather than the freeze logic being weakened to keep it passing.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/history_service.py backend/tests/unit/test_history_service.py
git commit -m "feat(history): freeze the killer roster per run instead of recomputing rows live"
```

---

### Task 5: Frontend — Gauntlet board reads the frozen roster

**Files:**
- Modify: `frontend/src/types/gauntletStreak.ts`
- Modify: `frontend/src/components/streaks/gauntlet/GauntletBoard.tsx`

**Interfaces:**
- Consumes: `run.owned_characters: string[]` from Task 2's `to_dict()`.
- Produces: `characters: OwnedCharacterItem[]` passed to `ActiveTargetStage` and `CharacterRosterGrid`, now sourced from `run.owned_characters` instead of `useOwnedCharacters`'s live fetch whenever `run` exists.

- [ ] **Step 1: Add `owned_characters` to the `GauntletRun` type**

In `frontend/src/types/gauntletStreak.ts`, add `owned_characters: string[];` to the `GauntletRun` interface (check the file for the interface's exact current shape before editing — this plan was written without reading it, so match existing field ordering/style).

- [ ] **Step 2: Build the roster from the run instead of the live hook**

In `frontend/src/components/streaks/gauntlet/GauntletBoard.tsx`, after the existing:

```tsx
  const { characters, loading: loadingRoster } = useOwnedCharacters(role, run?.tier_info?.roster_limit);
```

add:

```tsx
  const frozenCharacters: OwnedCharacterItem[] = React.useMemo(
    () => (run?.owned_characters ?? []).map((name) => ({ name })),
    [run?.owned_characters]
  );
  const rosterCharacters = run ? frozenCharacters : characters;
```

(`OwnedCharacterItem` is already imported via `./useOwnedCharacters`'s export, used elsewhere in this file — confirm the import line already brings it in, or add it.)

Replace both usages of `characters={characters}` (passed to `ActiveTargetStage` and `CharacterRosterGrid`) with `characters={rosterCharacters}`. Leave `loading={loadingRoster}` as-is on `CharacterRosterGrid` — it still reflects the live hook's loading state, which only matters before a run exists.

- [ ] **Step 3: Manually verify in the browser**

Run: `docker compose up -d --build frontend backend` (dev-container rebuild), then open a Gauntlet run, own a new character mid-run via the Characters page in another tab, and confirm the roster grid does not show the new character until the run is reset, lost to zero, or completed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/gauntletStreak.ts frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
git commit -m "feat(gauntlet): read the roster from the run's frozen snapshot"
```

---

### Task 6: Frontend — Chaos board reads the frozen roster and perk pool

**Files:**
- Modify: `frontend/src/types/chaosStreak.ts`
- Modify: `frontend/src/components/streaks/chaos/ChaosBoard.tsx`

**Interfaces:**
- Consumes: `run.owned_killers: string[]`, `run.unlocked_perks_detail: Perk[]` from Task 3's service response (`unlocked_perks` itself is the bare name list mirrored from storage — the frontend wants the resolved detail list, not that one).
- Produces: `killers` passed to `KillerPickerGrid` and `perkPool` passed to `SlotMachineStage`/`ChaosPerkPoolModal`, sourced from the run once it exists.

- [ ] **Step 1: Add the fields to the `ChaosRun` type**

In `frontend/src/types/chaosStreak.ts`, add `owned_killers: string[];`, `unlocked_perks: string[];`, and `unlocked_perks_detail: Perk[];` to the `ChaosRun` interface (check the file for its exact current shape and the `Perk` import path before editing).

- [ ] **Step 2: Build killers/perkPool from the run instead of the live hooks**

In `frontend/src/components/streaks/chaos/ChaosBoard.tsx`, after:

```tsx
  const { killers, loading: loadingKillers } = useOwnedKillers();
  const { pool: perkPool } = useKillerPerkPool();
```

add:

```tsx
  const rosterKillers = run ? run.owned_killers : killers;
  const rosterPerkPool = run ? run.unlocked_perks_detail : perkPool;
```

Replace `killers={killers}` (passed to `KillerPickerGrid`) with `killers={rosterKillers}`, and every other use of `killers`/`perkPool` in this file that concerns the active run's picker/pool (not the dev-only `handleDevSkipToWin`, which should keep using the live `killers` list since it's an admin-only debug shortcut, not player-facing pool logic) with the `rosterKillers`/`rosterPerkPool` equivalents. Pass `perkPool={rosterPerkPool}` to `ChaosPerkPoolModal`.

- [ ] **Step 3: Manually verify in the browser**

Same manual check as Task 5 Step 3, but for Chaos: unlock a new perk mid-run and confirm it never appears in the slot machine until reset/loss-to-zero/completion.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/chaosStreak.ts frontend/src/components/streaks/chaos/ChaosBoard.tsx
git commit -m "feat(chaos): read the killer roster and perk pool from the run's frozen snapshot"
```

---

### Task 7: Frontend — History board's next-row preview reads the frozen roster

**Files:**
- Modify: `frontend/src/types/historyStreak.ts`
- Modify: `frontend/src/components/streaks/history/HistoryBoard.tsx`

**Interfaces:**
- Consumes: `run.owned_killers: string[]` from Task 4's `to_dict()`.
- Produces: `killers` prop passed to `HistoryNextRowPreview`, sourced from `run.owned_killers` instead of `useOwnedKillers()`'s live fetch.

- [ ] **Step 1: Add `owned_killers` to the `HistoryRun` type**

In `frontend/src/types/historyStreak.ts`, add `owned_killers: string[];` to the `HistoryRun` interface (check current shape first).

- [ ] **Step 2: Swap the preview's data source**

In `frontend/src/components/streaks/history/HistoryBoard.tsx`, find:

```tsx
            {run && (
              <HistoryNextRowPreview
                killers={ownedKillers}
                rowSize={run.row_size}
                currentRowIndex={run.current_row_index}
              />
            )}
```

and change `killers={ownedKillers}` to `killers={run.owned_killers}`. If `ownedKillers`/`useOwnedKillers()` becomes unused elsewhere in this file after the change, remove the now-dead import and hook call; if `KillerPickerGrid` (used for the active row's pick buttons) still needs live-loading state (`loadingKillers`) for its own `loading` prop, keep just that part.

- [ ] **Step 3: Manually verify in the browser**

Own a new killer mid-run and confirm the "next row" preview doesn't show it until reset/loss-to-zero/completion.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/historyStreak.ts frontend/src/components/streaks/history/HistoryBoard.tsx
git commit -m "feat(history): read the next-row preview roster from the run's frozen snapshot"
```

---

### Task 8: Rules modal copy

**Files:**
- Modify: `frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx`
- Modify: `frontend/src/components/streaks/chaos/ChaosRulesModal.tsx`
- Modify: `frontend/src/components/streaks/history/HistoryRulesModal.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`

**Interfaces:**
- Consumes: nothing new — pure copy addition to each modal's existing rules list/section, plus one inline caption for Page Streak (which has no Rules modal).

- [ ] **Step 1: Add the freeze + retention note to `GauntletRulesModal`**

Open the file, find wherever its existing rules bullets/paragraphs are listed, and add one entry in the same style as its neighbors:

```
The roster is locked in for the run you're on. New characters you unlock mid-run won't join until you reset, lose back to zero, or complete it.
An in-progress run untouched for 90 days automatically counts as a loss.
```

- [ ] **Step 2: Add the freeze + retention note to `ChaosRulesModal`**

Same placement pattern, worded for killers/perks, as two separate rule lines:

```
The pool is locked in for the run you're on. New killers or perks you unlock mid-run won't join until you reset, lose back to zero, or complete it.
An in-progress run untouched for 90 days automatically counts as a loss.
```

- [ ] **Step 3: Add the freeze + retention note to `HistoryRulesModal`**

Same placement pattern, worded for killers, as two separate rule lines:

```
The roster is locked in for the run you're on. New killers you unlock mid-run won't join until you reset, lose back to zero, or complete it.
An in-progress run untouched for 90 days automatically counts as a loss.
```

- [ ] **Step 4: Add a retention caption to Page Streak**

Page Streak has no Rules modal (its "layout frozen {date}" header text already covers the pool-freeze idea — it's always been frozen, so it needs no new copy for that part). It does need the retention note. In `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`, find the block that renders the reset control (the `confirmingReset`/`ResetConfirmModal` section added earlier this session) and add a short caption next to it, matching this file's existing small-text style (e.g. the `text-[11px] text-slate-500` pattern used elsewhere in this file):

```tsx
<p className="mt-2 text-[11px] text-slate-500">
  An in-progress run untouched for 90 days automatically counts as a loss.
</p>
```

- [ ] **Step 5: Manually verify in the browser**

Open each Rules modal and the Page Streak run view, confirm the new lines render correctly, match existing typography, and don't break layout.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx frontend/src/components/streaks/chaos/ChaosRulesModal.tsx frontend/src/components/streaks/history/HistoryRulesModal.tsx frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
git commit -m "docs(streaks): explain the frozen pool and 90-day inactivity cleanup in each mode's rules copy"
```

---

### Task 9: Migration — add `triggered_by` to every match-log table

**Files:**
- Create: `backend/migrations/versions/inactivity_loss_flag_001.py`
- Modify: `backend/app/models/gauntlet.py`
- Modify: `backend/app/models/chaos.py`
- Modify: `backend/app/models/history.py`
- Modify: `backend/app/models/page_streak.py`

**Interfaces:**
- Produces: `GauntletMatchLog.triggered_by`, `ChaosMatchLog.triggered_by`, `HistoryMatchLog.triggered_by`, `PageStreakPageLog.triggered_by` — all `String(20)`, default `"player"`, nullable=False. Values used: `"player"` (every existing/real submission) and `"inactivity"` (Task 10/11's auto-loss path).
- Produces: each of those four `to_dict()` methods gains a `"triggered_by": self.triggered_by` entry, plain passthrough (no JSON parsing needed, it's already a scalar column).

- [ ] **Step 1: Add the migration**

```python
# backend/migrations/versions/inactivity_loss_flag_001.py
"""add triggered_by to gauntlet/chaos/history/page-streak match logs

Revision ID: inactivity_loss_001
Revises: freeze_pools_001
Create Date: 2026-08-21 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "inactivity_loss_001"
down_revision = "freeze_pools_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gauntlet_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("chaos_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("history_match_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )
    with op.batch_alter_table("page_streak_page_logs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("triggered_by", sa.String(length=20), server_default="player", nullable=False)
        )


def downgrade():
    with op.batch_alter_table("page_streak_page_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("history_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("chaos_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
    with op.batch_alter_table("gauntlet_match_logs", schema=None) as batch_op:
        batch_op.drop_column("triggered_by")
```

- [ ] **Step 2: Add the column + `to_dict()` entry to `GauntletMatchLog`**

In `backend/app/models/gauntlet.py`, add to `GauntletMatchLog`'s column list (after `timestamp`):

```python
    triggered_by: Mapped[str] = mapped_column(String(20), default="player")
```

In `GauntletMatchLog.to_dict()`, add:

```python
            "triggered_by": self.triggered_by,
```

- [ ] **Step 3: Add the column + `to_dict()` entry to `ChaosMatchLog`**

Same pattern in `backend/app/models/chaos.py`, on `ChaosMatchLog`.

- [ ] **Step 4: Add the column + `to_dict()` entry to `HistoryMatchLog`**

Same pattern in `backend/app/models/history.py`, on `HistoryMatchLog`.

- [ ] **Step 5: Add the column + `to_dict()` entry to `PageStreakPageLog`**

Same pattern in `backend/app/models/page_streak.py`, on `PageStreakPageLog`.

- [ ] **Step 6: Run the migration against the dev database**

Run: `cd backend && flask db upgrade` (or whatever this repo's actual migration-invocation command is — check `backend/migrations/env.py` / how Task 1's migration was actually applied, per that task's report, and use the same method).
Expected: no errors; `\d gauntlet_match_logs`, `\d chaos_match_logs`, `\d history_match_logs`, `\d page_streak_page_logs` in psql each show `triggered_by` with `not null` and a `'player'::character varying` (or equivalent) default.

- [ ] **Step 7: Commit**

```bash
git add backend/migrations/versions/inactivity_loss_flag_001.py backend/app/models/gauntlet.py backend/app/models/chaos.py backend/app/models/history.py backend/app/models/page_streak.py
git commit -m "feat(streaks): add triggered_by flag to every match-log table"
```

---

### Task 10: Per-mode auto-loss methods

**Files:**
- Modify: `backend/app/services/gauntlet_service.py`
- Modify: `backend/app/services/chaos_service.py`
- Modify: `backend/app/services/history_service.py`
- Modify: `backend/app/services/page_streak/runs.py`
- Test: `backend/tests/unit/test_gauntlet_service.py`
- Test: `backend/tests/unit/test_chaos_service.py`
- Test: `backend/tests/unit/test_history_service.py`
- Test: `backend/tests/unit/test_page_streak_service.py`

**Interfaces:**
- Consumes: `triggered_by` columns from Task 9; `_freeze_pool`/`_freeze_pools` from Tasks 2-4.
- Produces: `GauntletService.submit_result(user_id, run_id, result, triggered_by: str = "player")` — existing method gains one optional trailing parameter, passed straight into the `GauntletMatchLog` it writes.
- Produces: `ChaosService.apply_inactivity_loss(run_id: int) -> None` — applies the same state transition `submit_result`'s loss branch would (checkpoint fallback or reset-to-zero, including the Task 3 refreeze-on-zero rule), without needing a `killer_id`. Writes a `ChaosMatchLog` with `killer_id=""`, `result="loss"`, `triggered_by="inactivity"`.
- Produces: `HistoryService.apply_inactivity_loss(run_id: int) -> None` — same idea for History (medium checkpoint fallback / hell reset-to-zero, including the Task 4 refreeze rule). Writes a `HistoryMatchLog` with `killer_id=""`, `triggered_by="inactivity"`.
- Produces: `apply_inactivity_loss(run_id: int) -> None` as a new module-level function in `backend/app/services/page_streak/runs.py` (matching that file's existing module-function style, not a class method) — resets `current_page` to 1 and increments `attempt`, exactly like a real loss would, and writes a `PageStreakPageLog` with `perks_json="[]"`, `result="loss"`, `triggered_by="inactivity"`, `page_number` set to whatever page the run was on before the reset.
- Each of the four functions/methods returns `None` and is a no-op (does nothing, no log row written) if the run doesn't exist or is already `"completed"` — the cleanup job in Task 11 only calls these for rows it already filtered to `status == "in_progress"`, but the guard makes each function safe to call standalone too (e.g. from a test) without that pre-filtering.

- [ ] **Step 1: Write the failing tests for Gauntlet**

Add to `backend/tests/unit/test_gauntlet_service.py`'s `TestGauntletResults` class:

```python
    def test_submit_result_records_triggered_by_player_by_default(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.triggered_by, "player")

    def test_submit_result_records_triggered_by_inactivity_when_passed(self):
        self.service.submit_result(self.user_id, self.run["id"], "loss", triggered_by="inactivity")
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")
```

Add the import this needs: `from app.models import GauntletMatchLog` (alongside this file's existing `from app.models import Character, Perk` import — extend that line rather than adding a second import line).

- [ ] **Step 2: Run the new Gauntlet tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_gauntlet_service.py -v -k triggered_by`
Expected: FAIL with `TypeError: submit_result() got an unexpected keyword argument 'triggered_by'`.

- [ ] **Step 3: Add the `triggered_by` parameter to `GauntletService.submit_result`**

In `backend/app/services/gauntlet_service.py`, change the method signature and the `GauntletMatchLog(...)` construction:

```python
    def submit_result(self, user_id: int, run_id: int, result: str, triggered_by: str = "player") -> Dict[str, Any]:
```

and inside the body, where `GauntletMatchLog(...)` is constructed, add `triggered_by=triggered_by,` as one more keyword argument (any position in the constructor call is fine — put it next to `result=result,` for readability).

- [ ] **Step 4: Run the Gauntlet tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_gauntlet_service.py -v`
Expected: PASS — all tests.

- [ ] **Step 5: Write the failing tests for Chaos**

Read `backend/tests/unit/test_chaos_service.py`'s existing fixtures first (as in Task 3), then add, in the same `TestCase` subclass Task 3's tests landed in:

```python
    def test_apply_inactivity_loss_resets_to_zero_with_no_checkpoint(self):
        self.service.apply_inactivity_loss(self.run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, self.difficulty)
        self.assertEqual(reloaded["current_streak"], 0)

    def test_apply_inactivity_loss_writes_a_flagged_match_log(self):
        self.service.apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(ChaosMatchLog).where(ChaosMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        run = self.run
        for killer in run["owned_killers"]:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        self.assertEqual(run["status"], "completed")
        before_count = db.session.query(ChaosMatchLog).count()
        self.service.apply_inactivity_loss(run["id"])
        self.assertEqual(db.session.query(ChaosMatchLog).count(), before_count)
```

Add whatever imports this needs (`from app.models import ChaosMatchLog`, `from sqlalchemy import select` if not already present) matching this file's existing import style.

- [ ] **Step 6: Run the new Chaos tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_chaos_service.py -v -k inactivity`
Expected: FAIL with `AttributeError: 'ChaosService' object has no attribute 'apply_inactivity_loss'`.

- [ ] **Step 7: Add `ChaosService.apply_inactivity_loss`**

In `backend/app/services/chaos_service.py`:

```python
    def apply_inactivity_loss(self, run_id: int) -> None:
        """Applies the same state transition submit_result's loss branch
        would, without a killer_id -- there's no real match being played.
        Used only by the inactivity cleanup job (Task 11). A no-op if the
        run doesn't exist or is already completed."""
        r = db.session.scalars(select(ChaosRun).where(ChaosRun.id == run_id)).first()
        if not r or r.status == "completed":
            return

        current_streak = r.current_streak
        last_checkpoint = r.last_checkpoint_streak
        interval = checkpoint_interval(r.difficulty)

        if interval > 0:
            streak_after = last_checkpoint
            completed = json.loads(r.checkpoint_killers_json or "[]")
            used_perks = json.loads(r.checkpoint_used_perks_json or "[]")
            checkpoint_killers = list(completed)
            checkpoint_used_perks = list(used_perks)
        else:
            streak_after = 0
            completed = []
            used_perks = []
            last_checkpoint = 0
            checkpoint_killers = []
            checkpoint_used_perks = []

        db.session.add(ChaosMatchLog(
            run_id=run_id,
            killer_id="",
            result="loss",
            perks_json=r.current_perks_json,
            addon_rarities_json=r.current_addon_rarities_json,
            streak_before=current_streak,
            streak_after=streak_after,
            triggered_by="inactivity",
        ))

        r.current_streak = streak_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers_json = json.dumps(completed)
        r.checkpoint_killers_json = json.dumps(checkpoint_killers)
        r.checkpoint_used_perks_json = json.dumps(checkpoint_used_perks)

        unlocked_detail = resolve_perks_by_names(json.loads(r.unlocked_perks_json or "[]"))
        new_perks, updated_used, addon_rarities = self._draw_build(unlocked_detail, used_perks)
        r.used_perks_json = json.dumps(updated_used)
        r.current_perks_json = json.dumps(new_perks)
        r.current_addon_rarities_json = json.dumps(addon_rarities)
        r.perks_revealed = False

        if streak_after == 0:
            self._freeze_pools(r)

        db.session.commit()
```

Add `ChaosMatchLog` to this file's existing `from app.models import ...` import line.

- [ ] **Step 8: Run the Chaos tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_chaos_service.py -v`
Expected: PASS — all tests.

- [ ] **Step 9: Write the failing tests for History**

Read `backend/tests/unit/test_history_service.py`'s existing fixtures first, then add:

```python
    def test_apply_inactivity_loss_writes_a_flagged_match_log(self):
        self.service.apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(HistoryMatchLog).where(HistoryMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        # implementer: drive self.run (or a dedicated run) to status ==
        # "completed" using this file's existing win-loop pattern, then
        # assert apply_inactivity_loss makes no further change (no new
        # HistoryMatchLog row, run.status stays "completed")
        pass
```

(the second test is intentionally left for the implementer to flesh out using this file's actual completion-flow pattern, mirroring how Task 4 already asked for a hand-adapted test — do not leave it as `pass` in the final code; replace `pass` with real setup + assertions before considering this step done)

- [ ] **Step 10: Run the new History tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_history_service.py -v -k inactivity`
Expected: FAIL with `AttributeError: 'HistoryService' object has no attribute 'apply_inactivity_loss'`.

- [ ] **Step 11: Add `HistoryService.apply_inactivity_loss`**

In `backend/app/services/history_service.py`:

```python
    def apply_inactivity_loss(self, run_id: int) -> None:
        """Applies the same state transition submit_result's loss branch
        would, without a killer_id. Used only by the inactivity cleanup job
        (Task 11). A no-op if the run doesn't exist or is already completed."""
        run = db.session.scalars(select(HistoryRun).where(HistoryRun.id == run_id)).first()
        if not run or run.status == "completed":
            return

        streak_before = run.total_killers_beaten
        row_index_for_log = run.current_row_index

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
            self._freeze_pool(run)

        streak_after = run.total_killers_beaten
        run.completed_killers_json = json.dumps(completed)
        run.unlocked_perk_names_json = json.dumps(unlocked)

        db.session.add(HistoryMatchLog(
            run_id=run_id,
            killer_id="",
            result="loss",
            row_index=row_index_for_log,
            streak_before=streak_before,
            streak_after=streak_after,
            triggered_by="inactivity",
        ))
        db.session.commit()
```

Add `HistoryMatchLog` to this file's existing `from app.models import ...` import line.

- [ ] **Step 12: Run the History tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_history_service.py -v`
Expected: PASS — all tests.

- [ ] **Step 13: Write the failing test for Page Streak**

Read `backend/tests/unit/test_page_streak_service.py`'s existing fixtures first, then add a test in the same style verifying: after `apply_inactivity_loss(run_id)`, the run's `current_page` is back to 1, `attempt` incremented by 1, and a `PageStreakPageLog` row exists with `result == "loss"` and `triggered_by == "inactivity"`.

- [ ] **Step 14: Run the new Page Streak test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_page_streak_service.py -v -k inactivity`
Expected: FAIL — `apply_inactivity_loss` doesn't exist yet.

- [ ] **Step 15: Add `apply_inactivity_loss` to `backend/app/services/page_streak/runs.py`**

```python
def apply_inactivity_loss(run_id: int) -> None:
    """Applies the same reset a real loss would (back to page 1, attempt
    incremented), without a real perks/page submission. Used only by the
    inactivity cleanup job (Task 11). A no-op if the run doesn't exist or
    is already completed."""
    r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run_id)).first()
    if not r or r.status == "completed":
        return

    db.session.add(PageStreakPageLog(
        run_id=r.id,
        attempt=r.attempt,
        page_number=r.current_page,
        perks_json="[]",
        result="loss",
        triggered_by="inactivity",
    ))

    r.current_page = 1
    r.attempt = r.attempt + 1

    db.session.commit()
```

This needs `PageStreakPageLog` added to this file's existing `from app.models import ...` import line (it already imports `PageStreakPageLog, PageStreakRun, utcnow` per the file header read earlier this session — just confirm it's there).

- [ ] **Step 16: Run the Page Streak tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_page_streak_service.py -v`
Expected: PASS — all tests.

- [ ] **Step 17: Run every touched test file together**

Run: `cd backend && python -m pytest tests/unit/test_gauntlet_service.py tests/unit/test_chaos_service.py tests/unit/test_history_service.py tests/unit/test_page_streak_service.py -v`
Expected: PASS, zero failures.

- [ ] **Step 18: Commit**

```bash
git add backend/app/services/gauntlet_service.py backend/app/services/chaos_service.py backend/app/services/history_service.py backend/app/services/page_streak/runs.py backend/tests/unit/test_gauntlet_service.py backend/tests/unit/test_chaos_service.py backend/tests/unit/test_history_service.py backend/tests/unit/test_page_streak_service.py
git commit -m "feat(streaks): add per-mode auto-loss methods for the inactivity cleanup job"
```

---

### Task 11: Inactive-run cleanup job (APScheduler)

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/core/config.py`
- Create: `backend/app/services/streak_cleanup_service.py`
- Modify: `backend/app/__init__.py`
- Test: `backend/tests/unit/test_streak_cleanup_service.py`

**Interfaces:**
- Consumes: `GauntletService.submit_result(..., triggered_by=...)`, `ChaosService.apply_inactivity_loss`, `HistoryService.apply_inactivity_loss`, `page_streak.runs.apply_inactivity_loss` from Task 10.
- Produces: `apply_inactivity_losses(inactive_after_days: int = 90) -> Dict[str, int]` in `backend/app/services/streak_cleanup_service.py` — finds `in_progress` rows older than the cutoff across all four tables and applies the matching auto-loss function to each, returns `{table_name: affected_count}`.
- Produces: `Config.STREAK_INACTIVITY_PRUNE_DAYS` (int, default 90, overridable via the `STREAK_INACTIVITY_PRUNE_DAYS` env var).
- Produces: a `BackgroundScheduler` started inside `create_app()`, disabled when `app.config["TESTING"]` is true, running `apply_inactivity_losses()` daily at 03:00 server time.

- [ ] **Step 1: Add the dependency**

In `backend/requirements.txt`, add a new line (matching this file's existing `Name>=version` style):

```
APScheduler>=3.10.4
```

- [ ] **Step 2: Add the config value**

In `backend/app/core/config.py`, inside the `Config` class (alongside the other `os.getenv(...)`-backed settings near the top), add:

```python
    STREAK_INACTIVITY_PRUNE_DAYS = int(os.getenv("STREAK_INACTIVITY_PRUNE_DAYS", "90"))
```

- [ ] **Step 3: Write the failing tests**

```python
# backend/tests/unit/test_streak_cleanup_service.py
import unittest
from datetime import timedelta

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import (
    ChaosMatchLog, ChaosRun, GauntletMatchLog, GauntletRun,
    HistoryMatchLog, HistoryRun, PageStreakPageLog, PageStreakRun, utcnow,
)
from app.services.streak_cleanup_service import apply_inactivity_losses


class StreakCleanupTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _stale_gauntlet_run(self, days_old, status="in_progress"):
        run = GauntletRun(
            user_id=1,
            role="killer",
            status=status,
            current_character_id="Trapper",
            owned_characters_json="[]",
        )
        db.session.add(run)
        db.session.commit()
        run.updated_at = utcnow() - timedelta(days=days_old)
        db.session.commit()
        return run

    def test_applies_a_loss_to_an_in_progress_run_past_the_threshold(self):
        run = self._stale_gauntlet_run(days_old=91)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 1)
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")
        # The run itself survives -- it's a loss, not a deletion.
        self.assertEqual(db.session.query(GauntletRun).count(), 1)

    def test_does_not_touch_a_recently_touched_run(self):
        self._stale_gauntlet_run(days_old=10)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_does_not_touch_a_completed_run_past_the_threshold(self):
        self._stale_gauntlet_run(days_old=200, status="completed")
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_applies_across_all_four_run_tables(self):
        self._stale_gauntlet_run(days_old=91)

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db.session.add(chaos)
        db.session.commit()
        chaos.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        db.session.add(history)
        db.session.commit()
        history.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        page = PageStreakRun(
            user_id=1, killer="Trapper", status="in_progress",
            attempt=1, current_page=1, best_page=0, pages_json="[]",
        )
        db.session.add(page)
        db.session.commit()
        page.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected, {
            "gauntlet_runs": 1,
            "chaos_runs": 1,
            "history_runs": 1,
            "page_streak_runs": 1,
        })
        self.assertEqual(db.session.query(ChaosMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(HistoryMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(PageStreakPageLog).filter_by(triggered_by="inactivity").count(), 1)
```

Add `from sqlalchemy import select` to this test file's imports. Check `app/models/__init__.py` exports `utcnow`, `GauntletMatchLog`, `ChaosMatchLog`, `HistoryMatchLog`, `PageStreakPageLog` (all confirmed present as of Tasks 1 and 9 — if any name doesn't match exactly what those tasks actually landed, use the real name).

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_streak_cleanup_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.streak_cleanup_service'`.

- [ ] **Step 5: Write `apply_inactivity_losses`**

```python
# backend/app/services/streak_cleanup_service.py
import logging
from datetime import timedelta
from typing import Dict

from sqlalchemy import select, text

from app.core.extensions import db
from app.models import ChaosRun, GauntletRun, HistoryRun, PageStreakRun
from app.models.base import utcnow
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.page_streak.runs import apply_inactivity_loss as apply_page_streak_inactivity_loss

logger = logging.getLogger(__name__)

# Arbitrary fixed key for this job's Postgres advisory lock -- any int works,
# it just has to be the same value every time this job runs.
_ADVISORY_LOCK_KEY = 851193001


def apply_inactivity_losses(inactive_after_days: int = 90) -> Dict[str, int]:
    """Finds in-progress streak runs whose updated_at is older than
    inactive_after_days and applies the same loss a real match would --
    checkpoint fallback or reset-to-zero, plus a match-log row flagged
    triggered_by='inactivity'. The run itself is never deleted; a
    completed run is never touched.

    Guarded by a Postgres advisory lock so that under gunicorn's multiple
    worker processes, only one worker's scheduler tick actually performs
    the pass. Skipped entirely on non-Postgres dialects (the test suite
    runs on in-memory SQLite, which has no advisory lock function), so this
    stays directly unit-testable without a Postgres fixture.
    """
    is_postgres = db.engine.dialect.name == "postgresql"
    if is_postgres:
        got_lock = db.session.execute(
            text("SELECT pg_try_advisory_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        ).scalar()
        if not got_lock:
            return {}

    try:
        cutoff = utcnow() - timedelta(days=inactive_after_days)
        affected: Dict[str, int] = {}

        gauntlet_service = GauntletService()
        stale_gauntlet = db.session.scalars(
            select(GauntletRun).where(GauntletRun.status == "in_progress", GauntletRun.updated_at < cutoff)
        ).all()
        for run in stale_gauntlet:
            gauntlet_service.submit_result(run.user_id, run.id, "loss", triggered_by="inactivity")
        affected["gauntlet_runs"] = len(stale_gauntlet)

        chaos_service = ChaosService()
        stale_chaos = db.session.scalars(
            select(ChaosRun).where(ChaosRun.status == "in_progress", ChaosRun.updated_at < cutoff)
        ).all()
        for run in stale_chaos:
            chaos_service.apply_inactivity_loss(run.id)
        affected["chaos_runs"] = len(stale_chaos)

        history_service = HistoryService()
        stale_history = db.session.scalars(
            select(HistoryRun).where(HistoryRun.status == "in_progress", HistoryRun.updated_at < cutoff)
        ).all()
        for run in stale_history:
            history_service.apply_inactivity_loss(run.id)
        affected["history_runs"] = len(stale_history)

        stale_page_streak = db.session.scalars(
            select(PageStreakRun).where(PageStreakRun.status == "in_progress", PageStreakRun.updated_at < cutoff)
        ).all()
        for run in stale_page_streak:
            apply_page_streak_inactivity_loss(run.id)
        affected["page_streak_runs"] = len(stale_page_streak)

        for table_name, count in affected.items():
            if count:
                logger.info(
                    "Applied an inactivity loss to %d %s rows (>%dd idle)",
                    count, table_name, inactive_after_days,
                )
        return affected
    finally:
        if is_postgres:
            db.session.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": _ADVISORY_LOCK_KEY})
            db.session.commit()
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_streak_cleanup_service.py -v`
Expected: PASS — all four tests.

- [ ] **Step 7: Wire the scheduler into `create_app()`**

In `backend/app/__init__.py`, add near the top with the other imports:

```python
from apscheduler.schedulers.background import BackgroundScheduler
```

Then, right before the existing `return flask_app` at the end of `create_app()`, add:

```python
    if not flask_app.config.get("TESTING"):
        def _run_inactivity_job():
            with flask_app.app_context():
                from app.services.streak_cleanup_service import apply_inactivity_losses
                apply_inactivity_losses(flask_app.config["STREAK_INACTIVITY_PRUNE_DAYS"])

        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(
            _run_inactivity_job,
            trigger="cron",
            hour=3,
            minute=0,
            id="apply_inactivity_streak_losses",
            replace_existing=True,
        )
        scheduler.start()

    return flask_app
```

- [ ] **Step 8: Run the full backend test suite to confirm nothing else broke**

Run: `cd backend && python -m pytest -v`
Expected: PASS, zero failures. In particular, every other test file's `create_app(TestingConfig)` call must still work without spinning up a real scheduler (guarded by the `TESTING` check above) — this is the thing most likely to break silently (e.g. a hung test process from a live background thread) if the guard is missing or misplaced.

- [ ] **Step 9: Commit**

```bash
git add backend/requirements.txt backend/app/core/config.py backend/app/services/streak_cleanup_service.py backend/app/__init__.py backend/tests/unit/test_streak_cleanup_service.py
git commit -m "feat(streaks): auto-apply a loss to in-progress runs untouched for 90 days via APScheduler"
```

---

### Task 12: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: PASS, zero failures, zero errors.

- [ ] **Step 2: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no output (clean).

- [ ] **Step 3: Rebuild and smoke-test both containers**

Run: `docker compose up -d --build frontend backend`
Then manually re-walk all three manual-verification steps from Tasks 5-7 in one session against the rebuilt containers, plus: start a fresh Gauntlet/Chaos/History run each, confirm they still work end-to-end (roll/pick, win, lose, reset) exactly as before this change for a player who *isn't* unlocking anything mid-run. Check the backend container's logs (`docker logs dbd_backend`) for a clean startup with no APScheduler errors.

- [ ] **Step 3b: Manually verify the inactivity auto-loss end to end**

Start a Gauntlet run, then directly update its `updated_at` in the dev database to 91 days ago (`docker exec dbd_db psql -U postgres -d dbd_db -c "UPDATE gauntlet_runs SET updated_at = now() - interval '91 days' WHERE id = <id>;"`), then manually invoke `apply_inactivity_losses(inactive_after_days=90)` once (e.g. via a one-off `flask shell` command inside the backend container, or by temporarily lowering `STREAK_INACTIVITY_PRUNE_DAYS` and letting the scheduler's next tick catch it in a local test run — whichever is faster to set up). Confirm: the run still exists (not deleted), its streak fell back to checkpoint/zero exactly like a real loss, and a new match-log row exists with `triggered_by = 'inactivity'`. Repeat for one of Chaos/History/Page Streak to spot-check the pattern holds outside Gauntlet too.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feature/freeze-challenge-pools
```

Do not open a pull request — the user opens PRs to `develop` themselves.

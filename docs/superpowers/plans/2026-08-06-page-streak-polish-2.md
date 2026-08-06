# Page Streak Polish — Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three items from the user's second hands-on test — make perk icons fill their diamond frames, rename the exclusion modal so its checkbox polarity reads correctly, and order the killer roster by release order instead of alphabetically.

**Architecture:** Two small frontend edits plus one backend ordering change. The roster order is derived in `PageStreakService` from the position of each killer's entry in the scraped character list, because the backend is the only place allowed to order data for this feature.

**Tech Stack:** Flask + SQLite (`unittest`), Next.js 16, React 19, TypeScript 5.7, Tailwind CSS v4.

**Branch:** `feature/page-streak-mechanics`.

## Deliberately out of scope

Killer portraits are wrong for many killers (Trapper shows bear traps, Spirit shows a hand). Root cause is in `backend/app/services/scraper_service.py`: `process_page` runs the Survivors index first with a shared `seen_slugs` set, so killers are captured under category `Survivor` while only powers remain for `Killer`; perks then match the power-page entry ("Trapper") rather than the portrait entry ("The Trapper"). **The user has deferred this to a separate branch.** Do not fix the scraper, do not re-scrape, do not change perk↔character matching, and do not change how avatars are resolved.

## Global Constraints

- All work commits to `feature/page-streak-mechanics`.
- **Frontend gate:** `npx tsc --noEmit` then `npm run build`, both from `frontend/`, both must pass.
- **Backend gate:** containerised, source mounted (the image does not ship `tests/`), run from the repo root:
  `docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests`
  The suite currently stands at **101 tests, OK** and must stay green.
- **Never run `npm run lint`** — Next.js 16 removed `next lint`; it fails project-wide and is not to be fixed here.
- **Never start `npm run dev`** in a subagent session — it hangs.
- No new dependencies. No frontend test framework.
- All copy hardcoded English; no keys added to `frontend/src/locales/*.json`.
- Do not touch `scraper_service.py`, `Navbar.tsx`, `Sidebar.tsx`, or the Gauntlet's `CharacterRosterGrid.tsx`.
- `perk_service.py` may receive exactly one **additive** method (Task 3). Do not modify any existing method there — `get_characters()` sorts alphabetically and other tabs depend on that.

---

### Task 1: Perk icons fill their frame

**Files:**
- Modify: `frontend/src/components/streaks/page-streak/PerkTile.tsx`
- Modify: `frontend/src/components/streaks/page-streak/BuildBar.tsx`
- Modify: `frontend/src/components/streaks/page-streak/RunHistory.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks.

**The problem:** the perk artwork is a small square floating inside a much larger diamond frame. The wiki icons are themselves diamond-shaped with transparent corners, so they should be scaled up to sit inside the frame rather than be inset within it.

- [ ] **Step 1: Enlarge the tile icon**

In `PerkTile.tsx`, the image currently renders at `h-[62%] w-[62%]`. Change that one className to:

```tsx
              className="h-[96%] w-[96%] object-contain drop-shadow"
```

Leave everything else in the file alone — the diamond `clip-path`, the frame colours, the selection scale and the `motion-reduce:` classes all stay.

- [ ] **Step 2: Enlarge the build-slot icon**

In `BuildBar.tsx`, the slot image renders at `h-[70%] w-[70%]`. Change that className to:

```tsx
                  <img src={iconByPerk[name]} alt="" className="h-[96%] w-[96%] object-contain" />
```

- [ ] **Step 3: Enlarge the history icon**

In `RunHistory.tsx`, the history image renders at `h-[70%] w-[70%]`. Change that className to:

```tsx
                        <img src={iconByPerk[perk]} alt={perk} className="h-[96%] w-[96%] object-contain" />
```

The 24px (`h-6 w-6`) diamond size itself does not change — the user settled that in the previous round. Only the image inside it grows.

- [ ] **Step 4: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/page-streak/PerkTile.tsx frontend/src/components/streaks/page-streak/BuildBar.tsx frontend/src/components/streaks/page-streak/RunHistory.tsx
git commit -m "fix(page-streak): scale perk icons to fill their diamond frames"
```

---

### Task 2: Rename the exclusion modal around ownership

**Files:**
- Modify: `frontend/src/components/streaks/page-streak/ExcludedPerksModal.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRoster.tsx`

**Interfaces:**
- Consumes: `fetchExcludedPerks` / `saveExcludedPerks` unchanged — this is copy and counters only, the payload is untouched.
- Produces: nothing consumed by later tasks.

**The problem the user reported:** the modal is titled "Perks I don't own" while a **checked** box means "I own this perk". Reading the title, an all-checked list looks like "I own none of them". The fix is to name the screen after what the checkboxes assert.

- [ ] **Step 1: Retitle the modal**

In `ExcludedPerksModal.tsx`, replace the header block's title and description:

```tsx
            <h2 className="text-sm font-extrabold text-slate-100">My perk collection</h2>
            <p className="mt-1 text-xs text-slate-500">
              Checked perks are the ones you own. Unchecking one removes it from the pool and renumbers the pages. Runs already in progress keep their frozen layout.
            </p>
```

- [ ] **Step 2: Count what the user owns, not what they lack**

Still in `ExcludedPerksModal.tsx`, the footer currently reads `{owned} of {allPerks.length} · {projectedPages} pages`. Keep that — it already counts owned perks — but make the unit explicit:

```tsx
          <span className="font-mono text-[11px] text-orange-400">
            {owned} of {allPerks.length} perks owned · {projectedPages} pages
          </span>
```

- [ ] **Step 3: Rename the button that opens it**

In `PageStreakRoster.tsx`, the trigger button currently reads `Perks I don&apos;t own ({excludedCount})`. Replace the button's label with the owned count, which reads the same way as the modal:

```tsx
          Perk collection ({poolSize})
```

`poolSize` is already in this component's state and is the number of perks left in the pool — i.e. the ones the user owns. `excludedCount` becomes unused: remove its `useState` declaration and the `setExcludedCount(...)` call in `load()`, so no dead state remains.

- [ ] **Step 4: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean. In particular, `tsc` must not report `excludedCount` as unused-but-declared — remove it fully rather than leaving it assigned.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/page-streak/ExcludedPerksModal.tsx frontend/src/components/streaks/page-streak/PageStreakRoster.tsx
git commit -m "fix(page-streak): name the perk modal after ownership, not exclusion"
```

---

### Task 3: Order the roster by release order

**Files:**
- Modify: `backend/app/services/perk_service.py` (one additive method)
- Modify: `backend/app/services/page_streak_service.py`
- Test: `backend/tests/test_page_streak_service.py`

**Interfaces:**
- Consumes: a new `PerkService.get_characters_in_scrape_order()` returning the character records as dicts **in the order they appear in `characters.json`**.
- Produces: `.get_killers()` returns the same 40 names as before, but ordered by release order instead of alphabetically. `.get_roster()` inherits that order because it iterates `get_killers()`.

**Why the existing method cannot be used:** `PerkService.get_characters()` ends with `sorted(results, key=lambda x: x.name)`, so it hands back an alphabetical list and destroys the ordering this task needs. Other tabs rely on that alphabetical behaviour, so it must not be changed — hence a separate, additive accessor over the same cache.

**Why this works without touching the scraper:** the character list contains an entry named `The <Killer>` for most killers, and their positions in the file follow the wiki's killer ordering (Trapper, Wraith, Hillbilly, Nurse, Shape, Hag, Doctor, Huntress, Cannibal, Nightmare, Pig, …). Verified against the live data: 35 of the 40 roster killers have a `The <name>` entry, the other 5 have an entry under their own name, and none are missing from the list entirely.

**Ordering rule to implement exactly:**
1. For each killer name from the perk data, find its position in the character list, preferring an entry named `The <name>` and falling back to an entry named exactly `<name>`.
2. Killers with a position sort first, ascending by position.
3. Killers with no position sort after them, alphabetically, so the list stays deterministic.

- [ ] **Step 1: Write the failing test**

Append this class to `backend/tests/test_page_streak_service.py`, above the trailing `if __name__ == "__main__":` block:

```python
class OrderedFakePerkService(FakePerkService):
    """Adds a scrape-ordered character list so roster ordering can be exercised."""

    def __init__(self, perks, characters):
        super().__init__(perks)
        self._characters = characters

    def get_characters_in_scrape_order(self):
        return list(self._characters)


class TestPageStreakRosterOrder(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_order.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        perks = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        # make_perks reuses names, so give every perk a unique one.
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"

        # Scrape order: Trapper before Wraith before Nurse. Animatronic is absent
        # from the character list entirely, which is the real 5-killer edge case.
        characters = [
            {"name": "The Trapper", "category": "Survivor"},
            {"name": "Trapper", "category": "Survivor"},
            {"name": "The Wraith", "category": "Survivor"},
            {"name": "Nurse", "category": "Survivor"},
        ]

        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=OrderedFakePerkService(perks, characters),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_killers_follow_character_list_order(self):
        self.assertEqual(self.service.get_killers(), ["Trapper", "Wraith", "Nurse", "Animatronic"])

    def test_killer_missing_from_character_list_is_kept_at_the_end(self):
        self.assertIn("Animatronic", self.service.get_killers())

    def test_roster_uses_the_same_order(self):
        self.assertEqual(
            [entry["killer"] for entry in self.service.get_roster()],
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_ordering_survives_a_perk_service_without_characters(self):
        service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(make_perks(3, character="Nurse")),
        )
        self.assertEqual(service.get_killers(), ["Nurse"])
```

Note the last test: the plain `FakePerkService` has no `get_characters_in_scrape_order` method at all, which is exactly what a partial or stubbed perk service looks like. The implementation must degrade to alphabetical rather than raise.

- [ ] **Step 2: Run the test to verify it fails**

Run from the repo root:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_page_streak_service.TestPageStreakRosterOrder -v
```

Expected: FAIL on `test_killers_follow_character_list_order` — the current implementation returns `['Animatronic', 'Nurse', 'Trapper', 'Wraith']` (alphabetical).

- [ ] **Step 3: Expose the scrape order**

In `backend/app/services/perk_service.py`, add this method immediately after the existing `get_characters` method. It reads the same cache that `get_characters` reads, but without the alphabetical sort:

```python
    def get_characters_in_scrape_order(self) -> List[Dict[str, Any]]:
        """Character records in the order they appear in characters.json.

        get_characters() sorts alphabetically, which callers there depend on.
        Page streak needs the raw scrape order because it tracks the wiki's
        killer ordering, so it gets its own accessor over the same cache.
        """
        return [c.model_dump() for c in self._characters_cache]
```

Do not modify `get_characters` or any other existing method in this file.

- [ ] **Step 4: Implement the ordering**

In `backend/app/services/page_streak_service.py`, replace the existing `get_killers` method:

```python
    def get_killers(self):
        names = {
            p["character"]
            for p in self._all_killer_perks()
            if p.get("character") and p["character"] != GENERAL_CHARACTER
        }
        return sorted(names)
```

with this pair of methods:

```python
    def _character_positions(self):
        """Map a killer name to its position in the scraped character list.

        The scrape order follows the wiki's killer ordering, so it is the closest
        thing we have to release order. Most killers appear as "The <name>"; a few
        only under their bare name. Returns an empty map when the perk service
        cannot supply characters, in which case ordering falls back to alphabetical.
        """
        get_ordered = getattr(self.perk_service, "get_characters_in_scrape_order", None)
        if not callable(get_ordered):
            return {}
        try:
            characters = get_ordered() or []
        except Exception:
            return {}

        positions = {}
        for index, character in enumerate(characters):
            name = (character or {}).get("name")
            if name and name not in positions:
                positions[name] = index
        return positions

    def get_killers(self):
        names = {
            p["character"]
            for p in self._all_killer_perks()
            if p.get("character") and p["character"] != GENERAL_CHARACTER
        }
        positions = self._character_positions()

        def sort_key(name):
            position = positions.get(f"The {name}", positions.get(name))
            if position is None:
                # Unknown killers keep a deterministic place after the known ones.
                return (1, 0, name)
            return (0, position, name)

        return sorted(names, key=sort_key)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run from the repo root:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_page_streak_service -v
```

Expected: PASS, including the four new tests.

Then the whole suite:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests
```

Expected: 105 tests, OK.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/perk_service.py backend/app/services/page_streak_service.py backend/tests/test_page_streak_service.py
git commit -m "feat(page-streak): order the killer roster by release order"
```

---

## Manual verification (controller, after Task 3)

Rebuild both containers and check at `http://localhost/en/streaks/killer/page-streak`:

1. The roster starts with Trapper, Wraith, Hillbilly, Nurse, Shape — not Animatronic, Artist, Blight.
2. Killers with no character-list entry still appear, at the end.
3. Perk icons fill their diamond frames in the page grid, the build bar and the history.
4. The modal is titled "My perk collection" and its footer counts perks owned.
5. The roster button reads "Perk collection (N)" where N is the owned count.

## Done criteria

- Backend suite green at 105 tests; `npx tsc --noEmit` and `npm run build` clean.
- The five manual checks above pass.
- `scraper_service.py` untouched — killer portraits remain a known defect deferred to its own branch.

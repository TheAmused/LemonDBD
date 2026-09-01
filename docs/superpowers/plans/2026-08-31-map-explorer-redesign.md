# Map Explorer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Map Explorer's pannable-canvas/source-toggle UI with a realm-grouped card grid (Hens333 data only) that opens the existing Fullscreen viewer on click, backed by a corrected realm classification and new realm banner images from wiki.gg.

**Architecture:** Backend fixes realm data at the scrape source (folder segment already embedded in `callout_image_url`), adds a `Realm` model + wiki.gg image scrape step, and drops the SamoelColt driver entirely (data + files + code). Frontend replaces the old `DesktopMapLayout`/`MobileMapLayout`/`MapCanvas` pan-zoom stack with a new `MapCard` (styled after `PerkCard`, but with an always-visible name label) rendered in realm-grouped sections; `FullscreenMapEngine`/`TileInspectorDrawer` are untouched and remain the click target.

**Tech Stack:** Flask + SQLAlchemy (`db.create_all()`-driven schema, no Alembic in the live path — confirmed: `backend/migrations/` has 7 revisions but nothing in the codebase ever calls `alembic upgrade`; `DatabaseService.init_db()` calls `db.create_all()` on every startup, in both the Postgres and non-Postgres paths), BeautifulSoup scraping, Next.js App Router + Tailwind frontend, `tsx --test` for frontend unit tests, `pytest` for backend unit tests.

**Spec:** `docs/superpowers/specs/2026-08-31-map-explorer-redesign-design.md`

## Global Constraints

- No changes to `FullscreenMapEngine.tsx`, `TileInspectorDrawer.tsx`, or `mapLandmarks.ts` internals.
- No changes to `VoiceCommandBanner.tsx`, `VoiceEngineInfoModal.tsx`, or `mapVoiceMatcher.ts` internals — they are relocated behind the new toggle, not edited.
- No new filter axis beyond realm; no source toggle (only one map source remains).
- No changes to `map_tiles`/`map_objectives` scrape/sync logic.
- Realm-fix must live in scraper code (`HensMapScraperDriver`), never a one-off SQL UPDATE — the sync is upsert-only and would silently revert a DB-only fix on the next scrape.
- `Realm` has no FK from `map_realms` — match by string name, with a graceful missing-image fallback.
- No `dict?: any` anywhere — every dict/type must be concrete (repo-wide rule).
- No em dashes in any UI-facing copy (existing user rule).
- Realm sections render alphabetically by realm name.
- New/changed locale strings land in `en/maps.ts` first as source of truth; `pl`/`de`/`es`/`ja` get English-placeholder stubs now, translated in a later dedicated pass.

---

## File Structure

**Backend — new/modified:**
- `backend/app/models/map.py` — add `Realm` model
- `backend/app/models/__init__.py` — register `Realm`
- `backend/app/scrapers/types.py` — add `RealmImageData` dataclass
- `backend/app/scrapers/maps.py` — fix `HensMapScraperDriver` realm parsing; delete `SamoelColtMapScraperDriver`
- `backend/app/scrapers/wikigg.py` — add `scrape_realm_images()`
- `backend/app/services/scraper/db_sync.py` — add `sync_realms_to_db()`, wire into `sync_all_to_database()`
- `backend/app/services/scraper/pipeline.py` — drop SamoelColt call, add realm-image scrape call, pass `realms` through
- `backend/app/services/scraper_service.py` — drop `samoel_map_driver`
- `backend/app/services/maps/queries.py` — add `fetch_realms()`
- `backend/app/services/maps/__init__.py` — export `fetch_realms`
- `backend/app/services/map_service.py` — add `get_realms()`
- `backend/app/routes/maps.py` — add `GET /api/v1/maps/realms`
- `backend/scripts/backfill_map_realms.py` — new one-time backfill script
- `backend/tests/unit/scrapers/test_hens_map_realm_mapping.py` — new
- `backend/tests/unit/scripts/test_backfill_map_realms.py` — new
- `backend/tests/unit/api/test_maps_realms_route.py` — new

**Frontend — new/modified/removed:**
- `frontend/src/types/map.ts` — add `Realm` interface, drop dead `MapSource`-only fields from UI-facing types
- `frontend/src/services/mapApi.ts` — add `fetchRealms()`
- `frontend/src/components/maps/MapCard.tsx` — new
- `frontend/src/hooks/useMapExplorerData.ts` — simplified (drop source-toggle logic, add realm grouping/sorting + realm images)
- `frontend/src/components/maps/MapExplorer.tsx` — rewritten (sectioned grid, no pan/zoom canvas)
- `frontend/src/app/[locale]/maps/page.tsx` — add Text/Voice toggle, hardcode single source for `VoiceCommandBanner`
- `frontend/src/utils/mapUtils.ts` — drop `handlePopoutImageWindow`, keep `getMapImageSrc`
- `frontend/src/locales/en/maps.ts` (+ `pl`/`de`/`es`/`ja` stubs) — add new keys, remove confirmed-dead keys
- `frontend/src/__tests__/unit/mapHooks.test.ts` — trim `useMapGestures`/SamoelColt cases
- `frontend/src/__tests__/unit/mapCard.test.ts` — new
- **Delete:** `frontend/src/components/maps/layouts/` (whole dir: `DesktopMapLayout.tsx`, `MobileMapLayout.tsx`, `index.ts`), `MapCanvas.tsx`, `MapControls.tsx`, `MapLegendDrawer.tsx`, `MapDirectoryList.tsx`, `VoiceNavButton.tsx`, `frontend/src/hooks/useMapGestures.ts`, `frontend/src/__tests__/unit/mapLayouts.test.ts`, `frontend/src/__tests__/unit/mapSubcomponents.test.ts`
- **Kept but currently unused** (per spec §5 — re-homed into `FullscreenMapEngine` in later, separate work): `VariantSwitcherBar.tsx`

**Verified dead-code facts driving the above (from direct investigation, not the spec):**
- `MapControls.tsx` and `MapLegendDrawer.tsx` are imported ONLY by `DesktopMapLayout.tsx`/`MobileMapLayout.tsx` — not named in the spec's removal table (an oversight there), but they become orphaned the moment those two layouts are deleted, so they are added to the removal list here.
- `VoiceNavButton.tsx` already has zero importers today.
- `useMapGestures.ts` is imported only by the current `MapExplorer.tsx`, which is being rewritten without a pan/zoom canvas (`FullscreenMapEngine` manages its own zoom/pan internally — confirmed no `canvasHandlers`/`transformStyle` props on its interface).
- `VariantSwitcherBar.tsx` is imported only by the two layouts being removed and is NOT already used inside `FullscreenMapEngine.tsx` (confirmed via import grep) — matches spec §5's "kept for later" disposition, not a live re-home today.
- i18n keys confirmed dead-after-removal (used only in files being deleted): `providerToggleAria`, `allSources`, `realmFiltersAria`, `realmPillsAria`, `mapDirectory`, `loadingDirectory`, `directoryAndLegendsAria`, `sectorLegendAria`, `closeBottomSheetAria`, `popoutAria`, `popout`, `dragPanScrollZoom`, `mapControlsAria`, `zoomIn`, `zoomOut`, `fitToScreen`, `set100Zoom`, `set150Zoom`, `set200Zoom`, `resetPanZoom` (also used in `MapControls.tsx`, being removed — but NOT in `FullscreenMapEngine.tsx`, which uses `resetPanAndZoomAria`/`resetZoomPan` instead, so double-checked separately below), `resetPanAndZoomAria`, `launch2DEngine`, `twoDEngine`, `noMapsAdjustFilter`, `allRealms`, `filterByRealm`, `noMapsFound`, `sourceSamoelIsometric`, `sourceSamoel`, `quadrantSystemTitle`, `quadrantSystemSubtitle`, `samoelIsometricScheme`, `isometricScheme`.
  - **Correction while drafting:** `resetPanZoom` and `resetPanAndZoomAria` were grepped as "2 files" (also `FullscreenMapEngine.tsx`); Task 15 re-verifies each key individually with a fresh grep immediately before deleting it, so a stale note here cannot cause a wrong deletion.
- `providerAria` and `isometricScheme` (and a few others) are used by kept files too (`VoiceCommandBanner.tsx` uses `providerAria`) — NOT in the removal list.

---

### Task 1: `Realm` model

**Files:**
- Modify: `backend/app/models/map.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: `Realm` SQLAlchemy model with `id`, `name` (unique), `image_url`, `image_local_path`. Table auto-created by `db.create_all()` on next backend start — no Alembic revision needed (confirmed: this repo's live schema path never runs `alembic upgrade`).

- [ ] **Step 1: Add the model**

Append to `backend/app/models/map.py` (after the imports, before `MapRealm`):

```python
class Realm(Base):
    __tablename__ = "realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "image_url": self.image_url or "",
            "image_local_path": self.image_local_path or "",
        }
```

- [ ] **Step 2: Register in `app.models`**

In `backend/app/models/__init__.py`, change:
```python
from app.models.map import MapObjective, MapRealm, MapTile
```
to:
```python
from app.models.map import MapObjective, MapRealm, MapTile, Realm
```
and add `"Realm",` to `__all__` (next to `"MapRealm",`).

- [ ] **Step 3: Verify table creation**

Run: `docker compose restart backend && docker compose logs backend --tail=50`
Expected: no errors; `docker compose exec -T db psql -U postgres -d dbd_db -c "\d realms"` shows the new table with `id`, `name`, `image_url`, `image_local_path`, `created_at` columns.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/map.py backend/app/models/__init__.py
git commit -m "feat: add Realm model for map explorer redesign"
```

---

### Task 2: Fix Hens333 realm classification at the scrape source

**Files:**
- Modify: `backend/app/scrapers/maps.py`
- Test: `backend/tests/unit/scrapers/test_hens_map_realm_mapping.py`

**Interfaces:**
- Produces: `resolve_hens_realm(map_name: str, dpath: str) -> str` module-level function in `backend/app/scrapers/maps.py`, used by `HensMapScraperDriver.scrape_maps()` in place of the current `realm_name` derivation.

**Verified facts driving this fix (queried directly against the live `map_realms` table):**
- The primary `realm_wrappers` branch derives `realm_name` from an `<h1>` heading inside each `div.realm-wrapper`; today `soup.find_all("div", class_="realm-wrapper")` returns nothing (site structure changed), so scraping always falls into the fallback branch.
- The fallback branch sets `realm_name = dpath.split("/")[0] if "/" in dpath else "General Realm"` — but the real `dpath` values used to build `callout_image_url` don't reliably contain "/" at the point this runs today, so every one of the 58 rows lands on `"General Realm"`.
- The real realm folder IS present in every `callout_image_url` already stored (e.g. `.../callouts/Azarovs/Blood%20Lodge.webp`), confirmed via direct query. There are exactly 15 distinct folders, cross-verified against `SamoelColtMapScraperDriver`'s already-correct realm data:

  | Folder (URL-encoded) | Canonical realm |
  |---|---|
  | `Azarovs` | Autohaven Wreckers |
  | `Badham` | Springwood |
  | `Boneyard` | Forsaken Boneyard |
  | `Borgo` | The Decimated Borgo |
  | `Coldwind` | Coldwind Farm |
  | `Crotus%20Pen` | Disturbed Ward |
  | `Dvarka%20Deepwood` | Dvarka Deepwood |
  | `McMillan` | The Macmillan Estate |
  | `Ormond` | Ormond |
  | `Other` | *(per-map override, see below)* |
  | `Raccoon%20City` | Raccoon City |
  | `Red%20Forest` | Red Forest |
  | `Sleepless%20District` | Sleepless District |
  | `Swamp` | Backwater Swamp |
  | `Yamaoka` | Yamaoka Estate |

  The `Other` folder holds 10 maps that each belong to a distinct realm, resolved by matching each map's name (case-insensitive) against SamoelColt's existing correct data:

  | Hens333 map name | Canonical realm |
  |---|---|
  | Dead Dawg Saloon | Grave of Glenvale |
  | Fallen Refuge | Withered Isle |
  | Freddy Fazbears Pizza | Withered Isle |
  | Garden of Joy | Withered Isle |
  | Greenville Square | Withered Isle |
  | Lampkin Lane | Haddonfield |
  | Midwich Elementary School | Silent Hill |
  | The Game | Gideon Meat Plant |
  | The Underground Complex | Hawkins National Laboratory |
  | Treatment Theatre | Lery's Memorial Institute |

  `Sleepless District` has no SamoelColt counterpart (newer map, that driver hasn't been updated) — its single map ("Trickster's Delusion") uses the folder name itself as the realm name, since it's already a clean, correctly capitalized name and there is no other source to cross-check against.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/scrapers/test_hens_map_realm_mapping.py`:

```python
# backend/tests/unit/scrapers/test_hens_map_realm_mapping.py
import pytest

from app.scrapers.maps import resolve_hens_realm


@pytest.mark.unit
class TestResolveHensRealm:
    @pytest.mark.parametrize(
        "map_name,dpath,expected_realm",
        [
            ("Blood Lodge", "Azarovs/Blood Lodge.webp", "Autohaven Wreckers"),
            ("Preschool I", "Badham/Preschool1.webp", "Springwood"),
            ("Dead Sands", "Boneyard/Dead Sands.webp", "Forsaken Boneyard"),
            ("Shattered Square", "Borgo/Shattered Square.webp", "The Decimated Borgo"),
            ("Rancid Abbatoir", "Coldwind/Rancid Abbatoir.webp", "Coldwind Farm"),
            ("Crotus Prenn Asylum", "Crotus Pen/Crotus Prenn Asylum.webp", "Disturbed Ward"),
            ("Toba Landing", "Dvarka Deepwood/Toba Landing.webp", "Dvarka Deepwood"),
            ("Coal Tower", "McMillan/Coal Tower.webp", "The Macmillan Estate"),
            ("Mount Ormond Resort", "Ormond/Mount Ormond Resort.webp", "Ormond"),
            ("Raccoon City Police Station East", "Raccoon City/RPD East.webp", "Raccoon City"),
            ("Mother's Dwelling", "Red Forest/Mothers Dwelling.webp", "Red Forest"),
            ("Trickster's Delusion", "Sleepless District/Tricksters Delusion.webp", "Sleepless District"),
            ("Grim Pantry", "Swamp/Grim Pantry.webp", "Backwater Swamp"),
            ("Family Residence", "Yamaoka/Family Residence.webp", "Yamaoka Estate"),
        ],
    )
    def test_resolves_realm_from_folder(self, map_name, dpath, expected_realm):
        assert resolve_hens_realm(map_name, dpath) == expected_realm

    @pytest.mark.parametrize(
        "map_name,expected_realm",
        [
            ("Dead Dawg Saloon", "Grave of Glenvale"),
            ("Fallen Refuge", "Withered Isle"),
            ("Freddy Fazbears Pizza", "Withered Isle"),
            ("Garden of Joy", "Withered Isle"),
            ("Greenville Square", "Withered Isle"),
            ("Lampkin Lane", "Haddonfield"),
            ("Midwich Elementary School", "Silent Hill"),
            ("The Game", "Gideon Meat Plant"),
            ("The Underground Complex", "Hawkins National Laboratory"),
            ("Treatment Theatre", "Lery's Memorial Institute"),
        ],
    )
    def test_resolves_realm_for_other_bucket_overrides(self, map_name, expected_realm):
        dpath = f"Other/{map_name}.webp"
        assert resolve_hens_realm(map_name, dpath) == expected_realm

    def test_unknown_folder_and_name_falls_back_to_folder_name(self):
        assert resolve_hens_realm("Some New Map", "BrandNewFolder/Some New Map.webp") == "BrandNewFolder"

    def test_no_folder_segment_falls_back_to_general_realm(self):
        assert resolve_hens_realm("Orphan Map", "Orphan Map.webp") == "General Realm"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/scrapers/test_hens_map_realm_mapping.py -v`
Expected: FAIL with `ImportError: cannot import name 'resolve_hens_realm'`

- [ ] **Step 3: Implement `resolve_hens_realm` and wire it in**

In `backend/app/scrapers/maps.py`, add near the top (after the module-level `logger = logging.getLogger(__name__)` line, before `get_map_landmarks_data`):

```python
FOLDER_REALM_MAP: dict[str, str] = {
    "azarovs": "Autohaven Wreckers",
    "badham": "Springwood",
    "boneyard": "Forsaken Boneyard",
    "borgo": "The Decimated Borgo",
    "coldwind": "Coldwind Farm",
    "crotus pen": "Disturbed Ward",
    "dvarka deepwood": "Dvarka Deepwood",
    "mcmillan": "The Macmillan Estate",
    "ormond": "Ormond",
    "raccoon city": "Raccoon City",
    "red forest": "Red Forest",
    "sleepless district": "Sleepless District",
    "swamp": "Backwater Swamp",
    "yamaoka": "Yamaoka Estate",
}

OTHER_MAP_REALM_OVERRIDES: dict[str, str] = {
    "dead dawg saloon": "Grave of Glenvale",
    "fallen refuge": "Withered Isle",
    "freddy fazbears pizza": "Withered Isle",
    "garden of joy": "Withered Isle",
    "greenville square": "Withered Isle",
    "lampkin lane": "Haddonfield",
    "midwich elementary school": "Silent Hill",
    "the game": "Gideon Meat Plant",
    "the underground complex": "Hawkins National Laboratory",
    "treatment theatre": "Lery's Memorial Institute",
}


def resolve_hens_realm(map_name: str, dpath: str) -> str:
    """Derive the real realm name from the folder segment already embedded in
    a Hens333 callout dpath (e.g. "Azarovs/Blood Lodge.webp" -> "Autohaven
    Wreckers"). The site's realm-wrapper HTML this previously read from no
    longer exists, which is why every map used to land on "General Realm"."""
    if "/" not in dpath:
        return "General Realm"

    folder = dpath.split("/")[0].strip()
    folder_key = folder.lower()

    if folder_key == "other":
        name_key = map_name.strip().lower()
        if name_key in OTHER_MAP_REALM_OVERRIDES:
            return OTHER_MAP_REALM_OVERRIDES[name_key]
        return folder

    return FOLDER_REALM_MAP.get(folder_key, folder)
```

Then, in `HensMapScraperDriver.scrape_maps()`, replace both realm-derivation sites:

In the fallback branch (no `realm_wrappers`):
```python
                    realm_name = dpath.split("/")[0] if "/" in dpath else "General Realm"
```
becomes:
```python
                    realm_name = resolve_hens_realm(map_name, dpath)
```

In the `realm_wrappers` branch:
```python
                h1 = rw.find(["h1", "h2", "h3", "div"], class_=lambda c: not c or "realm" in str(c).lower())
                realm_name = h1.get_text(strip=True) if h1 else "General Realm"
```
becomes:
```python
                h1 = rw.find(["h1", "h2", "h3", "div"], class_=lambda c: not c or "realm" in str(c).lower())
```
(drop the `realm_name` assignment here — it's now derived per-map from `dpath` below), and inside that branch's inner `for btn in rw.find_all(...)` loop, right after `map_slug = sanitize_filename(map_name)`, add:
```python
                    realm_name = resolve_hens_realm(map_name, dpath)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/scrapers/test_hens_map_realm_mapping.py -v`
Expected: PASS (18 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/maps.py backend/tests/unit/scrapers/test_hens_map_realm_mapping.py
git commit -m "fix: derive Hens333 map realm from callout folder path"
```

---

### Task 3: One-time backfill script for the 58 existing rows

**Files:**
- Create: `backend/scripts/backfill_map_realms.py`
- Test: `backend/tests/unit/scripts/test_backfill_map_realms.py`

**Interfaces:**
- Consumes: `resolve_hens_realm(map_name: str, dpath: str) -> str` from Task 2.
- Produces: `backfill_map_realms(session) -> int` (returns count of rows updated), callable standalone via `python -m backend.scripts.backfill_map_realms` or imported for tests.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/scripts/__init__.py` (empty) if the `scripts` test package doesn't already exist, then `backend/tests/unit/scripts/test_backfill_map_realms.py`:

```python
# backend/tests/unit/scripts/test_backfill_map_realms.py
import pytest
from sqlalchemy.orm import Session

from app.models import MapRealm
from backend.scripts.backfill_map_realms import backfill_map_realms


@pytest.mark.unit
class TestBackfillMapRealms:
    def test_updates_general_realm_rows_from_callout_url(self, db_session: Session):
        row = MapRealm(
            map_id="hens_general_realm_blood_lodge",
            name="Blood Lodge",
            realm="General Realm",
            source="hens333",
            callout_image_url="https://hens333.com/img/dbd/callouts/Azarovs/Blood%20Lodge.webp",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        updated = backfill_map_realms(db_session)

        assert updated == 1
        assert row.realm == "Autohaven Wreckers"

    def test_is_idempotent(self, db_session: Session):
        row = MapRealm(
            map_id="hens_general_realm_blood_lodge",
            name="Blood Lodge",
            realm="General Realm",
            source="hens333",
            callout_image_url="https://hens333.com/img/dbd/callouts/Azarovs/Blood%20Lodge.webp",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        first_run = backfill_map_realms(db_session)
        second_run = backfill_map_realms(db_session)

        assert first_run == 1
        assert second_run == 0
        assert row.realm == "Autohaven Wreckers"

    def test_skips_non_hens333_rows(self, db_session: Session):
        row = MapRealm(
            map_id="samoel_dead_dawg_saloon_1",
            name="Dead Dawg Saloon",
            realm="Grave of Glenvale",
            source="samoelcolt",
            callout_image_url="https://images.steamusercontent.com/x.jpg",
            layout_type="Standard",
            jungle_gyms_count=4,
            totem_spawns_count=5,
            pallet_density="Medium",
            shack_has_basement=True,
        )
        db_session.add(row)
        db_session.commit()

        updated = backfill_map_realms(db_session)

        assert updated == 0
        assert row.realm == "Grave of Glenvale"
```

This uses the existing `db_session` fixture from `backend/tests/unit/conftest.py` (confirmed present: `db_session` returns the active `db.session`, backed by the `test_db` autouse fixture that creates a fresh in-memory SQLite schema per test).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/scripts/test_backfill_map_realms.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.scripts.backfill_map_realms'`

- [ ] **Step 3: Implement the backfill script**

Create `backend/scripts/__init__.py` (empty, if it doesn't exist), then `backend/scripts/backfill_map_realms.py`:

```python
# backend/scripts/backfill_map_realms.py
"""One-time backfill: recompute `realm` for existing Hens333 map_realms rows
using the folder segment already stored in callout_image_url. Safe to re-run;
only touches rows whose recomputed realm differs from what's stored.

Run inside the backend container:
    docker compose exec backend python -m backend.scripts.backfill_map_realms
"""
import logging
from urllib.parse import unquote, urlparse

from sqlalchemy.orm import Session

from app.models import MapRealm
from app.scrapers.maps import resolve_hens_realm

logger = logging.getLogger(__name__)


def _dpath_from_callout_url(callout_image_url: str) -> str:
    path = urlparse(callout_image_url).path
    marker = "/callouts/"
    idx = path.find(marker)
    if idx == -1:
        return ""
    return unquote(path[idx + len(marker):])


def backfill_map_realms(session: Session) -> int:
    rows = session.query(MapRealm).filter(MapRealm.source == "hens333").all()
    updated = 0
    for row in rows:
        dpath = _dpath_from_callout_url(row.callout_image_url or "")
        if not dpath:
            continue
        new_realm = resolve_hens_realm(row.name, dpath)
        if new_realm != row.realm:
            row.realm = new_realm
            updated += 1
    if updated:
        session.commit()
    logger.info(f"Backfilled realm for {updated} Hens333 map row(s).")
    return updated


if __name__ == "__main__":
    from app import create_app
    from app.core.extensions import db

    flask_app = create_app()
    with flask_app.app_context():
        backfill_map_realms(db.session)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/scripts/test_backfill_map_realms.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the backfill against the real database**

Run: `docker compose exec backend python -m backend.scripts.backfill_map_realms`
Verify: `docker compose exec -T db psql -U postgres -d dbd_db -c "SELECT DISTINCT realm, count(*) FROM map_realms WHERE source='hens333' GROUP BY realm ORDER BY realm;"` shows 15 distinct realms, no more `"General Realm"`.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/backfill_map_realms.py backend/scripts/__init__.py backend/tests/unit/scripts/
git commit -m "feat: add one-time backfill script for Hens333 map realms"
```

---

### Task 4: Remove SamoelColt (code, data, files)

**Files:**
- Modify: `backend/app/scrapers/maps.py` (delete `SamoelColtMapScraperDriver`)
- Modify: `backend/app/services/scraper/pipeline.py`
- Modify: `backend/app/services/scraper_service.py`

**Interfaces:**
- Consumes: none new.
- Produces: `execute_sync_pipeline()` no longer takes `samoel_map_driver`.

- [ ] **Step 1: Delete the driver class**

In `backend/app/scrapers/maps.py`, delete the entire `class SamoelColtMapScraperDriver:` block (from `class SamoelColtMapScraperDriver:` to the end of the file).

- [ ] **Step 2: Remove pipeline wiring**

In `backend/app/services/scraper/pipeline.py`:
- Change the import line:
  ```python
  from app.scrapers.maps import HensMapScraperDriver, SamoelColtMapScraperDriver
  ```
  to:
  ```python
  from app.scrapers.maps import HensMapScraperDriver
  ```
- Remove the `samoel_map_driver: SamoelColtMapScraperDriver,` parameter from `execute_sync_pipeline()`'s signature.
- Remove this block:
  ```python
          try:
              logger.info("Scraping SamoelColt Steam Workshop maps...")
              maps.extend(samoel_map_driver.scrape_maps())
          except Exception as map_err:
              logger.warning(f"Failed scraping SamoelColt maps: {map_err}")
  ```

- [ ] **Step 3: Remove service wiring**

In `backend/app/services/scraper_service.py`:
- Change the import line:
  ```python
  from app.scrapers.maps import HensMapScraperDriver, SamoelColtMapScraperDriver
  ```
  to:
  ```python
  from app.scrapers.maps import HensMapScraperDriver
  ```
- Delete `self.samoel_map_driver = SamoelColtMapScraperDriver()`.
- Remove `samoel_map_driver=self.samoel_map_driver,` from the `execute_sync_pipeline(...)` call in `run_sync_pipeline()`.

- [ ] **Step 4: Verify the scraper still imports and runs**

Run: `docker compose exec backend python -c "from app.services.scraper_service import ScraperService; ScraperService()"`
Expected: no exceptions.

- [ ] **Step 5: Delete SamoelColt rows and static files**

Run:
```bash
docker compose exec -T db psql -U postgres -d dbd_db -c "DELETE FROM map_realms WHERE source = 'samoelcolt';"
```
Then, on the host (or via `docker compose exec backend`):
```bash
rm -rf backend/app/static/maps/callouts/samoelcolt/
```

- [ ] **Step 6: Verify**

Run: `docker compose exec -T db psql -U postgres -d dbd_db -c "SELECT count(*) FROM map_realms WHERE source = 'samoelcolt';"`
Expected: `0`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/scrapers/maps.py backend/app/services/scraper/pipeline.py backend/app/services/scraper_service.py
git commit -m "chore: remove SamoelColt map scraper"
```

---

### Task 5: Wiki.gg realm-image scrape step

**Files:**
- Modify: `backend/app/scrapers/types.py` (add `RealmImageData`)
- Modify: `backend/app/scrapers/wikigg.py` (add `scrape_realm_images()`)
- Modify: `backend/app/services/scraper/db_sync.py` (add `sync_realms_to_db()`)
- Modify: `backend/app/services/scraper/pipeline.py` (call both)

**Interfaces:**
- Consumes: `Realm` model from Task 1, `FOLDER_REALM_MAP`'s canonical realm-name set from Task 2 (the 15 canonical names, `Other`-bucket overrides excluded since those already map into 5 of the 15).
- Produces: `RealmImageData(name: str, image_url: str, image_local_path: str)`; `WikiGGScraperDriver.scrape_realm_images() -> list[RealmImageData]`; `sync_realms_to_db(realms: list[RealmImageData]) -> None`.

- [ ] **Step 1: Add `RealmImageData`**

In `backend/app/scrapers/types.py`, after the `MapData` dataclass, add:

```python
@dataclass
class RealmImageData:
    name: str
    image_url: str
    image_local_path: str
```

- [ ] **Step 2: Add the scrape method**

In `backend/app/scrapers/wikigg.py`, add near the end of the `WikiGGScraperDriver` class (after `scrape_offerings`, before `scrape_all`):

```python
    CANONICAL_REALM_NAMES = [
        "Autohaven Wreckers",
        "Springwood",
        "Forsaken Boneyard",
        "The Decimated Borgo",
        "Coldwind Farm",
        "Disturbed Ward",
        "Dvarka Deepwood",
        "The Macmillan Estate",
        "Ormond",
        "Raccoon City",
        "Red Forest",
        "Sleepless District",
        "Backwater Swamp",
        "Yamaoka Estate",
        "Grave of Glenvale",
        "Withered Isle",
        "Haddonfield",
        "Silent Hill",
        "Gideon Meat Plant",
        "Hawkins National Laboratory",
        "Lery's Memorial Institute",
    ]

    def scrape_realm_images(self) -> list[RealmImageData]:
        """Fetches the wiki.gg Realms gallery and matches each image against
        the canonical realm names this app already uses (see FOLDER_REALM_MAP
        / OTHER_MAP_REALM_OVERRIDES in scrapers/maps.py). Matching is by
        normalized name substring since the gallery caption text doesn't
        always match our canonical spelling exactly."""
        results: list[RealmImageData] = []
        try:
            html_doc = self.fetch_page_html("Realms")
            soup = BeautifulSoup(html_doc, "html.parser")
            content = soup.find("div", class_="mw-parser-output") or soup

            gallery_items = content.find_all(["li", "div"], class_=re.compile(r"gallerybox"))
            matched_names: set[str] = set()

            for item in gallery_items:
                img_tag = item.find("img")
                if not img_tag:
                    continue
                caption = item.find(class_=re.compile(r"gallerytext"))
                caption_text = caption.get_text(strip=True) if caption else (img_tag.get("alt") or "")
                if not caption_text:
                    continue

                norm_caption = normalize_name_key(caption_text)
                for realm_name in self.CANONICAL_REALM_NAMES:
                    if realm_name in matched_names:
                        continue
                    norm_realm = normalize_name_key(realm_name)
                    if norm_realm == norm_caption or norm_realm in norm_caption or norm_caption in norm_realm:
                        image_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)
                        if not image_url:
                            continue
                        slug = sanitize_filename(realm_name)
                        results.append(
                            RealmImageData(
                                name=realm_name,
                                image_url=image_url,
                                image_local_path=f"realms/{slug}.png",
                            )
                        )
                        matched_names.add(realm_name)
                        break

            logger.info(f"Matched {len(results)}/{len(self.CANONICAL_REALM_NAMES)} realm images from wiki.gg.")
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg realm images: {e}")

        return results
```

Add `RealmImageData` to the existing `from app.scrapers.types import (...)` import block at the top of `wikigg.py`.

- [ ] **Step 3: Add `sync_realms_to_db`**

In `backend/app/services/scraper/db_sync.py`:
- Add `Realm` to the `from app.models import ...` line.
- Add `RealmImageData` to the `from app.scrapers.types import ...` line.
- Add, after `sync_maps_to_db`:

```python
def sync_realms_to_db(realms: list[RealmImageData]) -> None:
    """Upsert realm banner images by name. No FK to map_realms.realm on
    purpose (spec decision): matching by string name keeps this additive and
    lets the frontend fall back to a plain text header when no match exists."""
    if not realms:
        return

    existing = {r.name: r for r in db.session.scalars(select(Realm)).all()}
    for r in realms:
        existing_realm = existing.get(r.name)
        if existing_realm:
            existing_realm.image_url = r.image_url
            existing_realm.image_local_path = r.image_local_path
        else:
            db.session.add(
                Realm(
                    name=r.name,
                    image_url=r.image_url,
                    image_local_path=r.image_local_path,
                )
            )

    db.session.commit()
```
- In `sync_all_to_database()`, add `realms: list[RealmImageData] | None = None` to the signature, `realms = realms or []` to the body, `sync_realms_to_db(realms)` to the call sequence (after `sync_maps_to_db(maps)`), and `"realms_synced": len(realms),` to the returned dict.

- [ ] **Step 4: Wire into the pipeline**

In `backend/app/services/scraper/pipeline.py`:
- Add, after the Hens333 maps scrape block (and before `db_sync_metrics = sync_all_to_database(...)`):
```python
        try:
            logger.info("Scraping realm images from wiki.gg...")
            realms = wikigg_driver.scrape_realm_images()
        except Exception as realm_err:
            logger.warning(f"Failed scraping realm images: {realm_err}")
            realms = []
```
- Add `realms=realms,` to the `sync_all_to_database(...)` call.
- Add asset downloads for realm images: in the `download_all_assets(...)` call, add `realms=realms,`; in `backend/app/services/scraper/assets.py`, add a `realms: list[RealmImageData] | None = None` parameter to `download_all_assets()` (import `RealmImageData` in the `from app.scrapers.types import (...)` line there too), and add, mirroring the existing `if maps:` block:
```python
        if realms:
            for r in realms:
                if r.image_url and r.image_local_path:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            r.image_url,
                            r.image_local_path,
                            timeout=request_timeout,
                        )
                    )
```
- Also update `total_downloads` in `pipeline.py` to include `+ len(realms)`.

- [ ] **Step 5: Verify end to end**

Run: `docker compose exec backend python -c "
from app import create_app
app = create_app()
with app.app_context():
    from app.services.scraper_service import ScraperService
    stats = ScraperService().run_sync_pipeline(download_assets=True)
    print(stats.get('realms_synced'))
"`
Expected: prints a number > 0 (ideally close to 15/20, network-dependent). Then: `docker compose exec -T db psql -U postgres -d dbd_db -c "SELECT name, image_local_path FROM realms;"` shows rows; `ls backend/app/static/realms/` shows downloaded files.

- [ ] **Step 6: Commit**

```bash
git add backend/app/scrapers/types.py backend/app/scrapers/wikigg.py backend/app/services/scraper/db_sync.py backend/app/services/scraper/pipeline.py backend/app/services/scraper/assets.py
git commit -m "feat: scrape and sync realm banner images from wiki.gg"
```

---

### Task 6: `GET /api/v1/maps/realms` endpoint

**Files:**
- Modify: `backend/app/services/maps/queries.py`
- Modify: `backend/app/services/maps/__init__.py`
- Modify: `backend/app/services/map_service.py`
- Modify: `backend/app/routes/maps.py`
- Test: `backend/tests/unit/api/test_maps_realms_route.py` (confirmed existing convention: route tests live in `backend/tests/unit/api/`, e.g. `test_chaos_routes.py`, `test_character_detail_route.py` — inherits fixtures from `backend/tests/unit/conftest.py`)

**Interfaces:**
- Produces: `fetch_realms() -> list[dict[str, Any]]`, `MapService.get_realms() -> list[dict[str, Any]]`, `GET /api/v1/maps/realms` returning `{"realms": [{"name": str, "image_url": str, "image_local_path": str}, ...]}`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/api/test_maps_realms_route.py`:

```python
# backend/tests/unit/api/test_maps_realms_route.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.models import Realm


@pytest.mark.unit
class TestMapsRealmsRoute:
    def test_returns_all_realms(self, client: FlaskClient, db_session: Session):
        db_session.add(Realm(name="Ormond", image_url="https://x/ormond.png", image_local_path="realms/ormond.png"))
        db_session.commit()

        res = client.get("/api/v1/maps/realms")

        assert res.status_code == 200
        data = res.get_json()
        names = [r["name"] for r in data["realms"]]
        assert "Ormond" in names

    def test_returns_empty_list_when_no_realms(self, client: FlaskClient):
        res = client.get("/api/v1/maps/realms")
        assert res.status_code == 200
        assert res.get_json()["realms"] == []
```

This uses the `client` and `db_session` fixtures already defined in `backend/tests/unit/conftest.py`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/api/test_maps_realms_route.py -v`
Expected: FAIL with 404 (route doesn't exist yet).

- [ ] **Step 3: Implement**

In `backend/app/services/maps/queries.py`, add `Realm` to the `from app.models import ...` import, and add:

```python
def fetch_realms() -> list[dict[str, Any]]:
    """Retrieve all realm banner images, keyed by realm name for client-side matching."""
    try:
        if current_app:
            rows = db.session.scalars(select(Realm)).all()
            return [r.to_dict() for r in rows]
    except Exception as e:
        logger.debug(f"fetch_realms fallback: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
    return []
```

In `backend/app/services/maps/__init__.py`, add `fetch_realms` to both the import line and `__all__`.

In `backend/app/services/map_service.py`, add `fetch_realms` to the `from app.services.maps import (...)` import, and add:

```python
    def get_realms(self) -> list[dict[str, Any]]:
        return fetch_realms()
```

In `backend/app/routes/maps.py`, add (before the `get_maps` route, so it's visually grouped with the other collection-level GETs; Flask's Werkzeug routing already matches this static path before the dynamic `<string:map_id>` rule regardless of declaration order):

```python
@maps_bp.route("/realms", methods=["GET"])
def get_realms():
    """Retrieve all realm banner images for client-side name matching."""
    realms = service.get_realms()
    return jsonify({"realms": realms}), 200
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/api/test_maps_realms_route.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Manual smoke check**

Run: `curl -sk https://localhost/api/v1/maps/realms | head -c 500`
Expected: JSON with a `realms` array.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/maps/queries.py backend/app/services/maps/__init__.py backend/app/services/map_service.py backend/app/routes/maps.py backend/tests/unit/api/test_maps_realms_route.py
git commit -m "feat: add GET /api/v1/maps/realms endpoint"
```

---

### Task 7: Frontend types + API client for realms

**Files:**
- Modify: `frontend/src/types/map.ts`
- Modify: `frontend/src/services/mapApi.ts`

**Interfaces:**
- Produces: `Realm` interface, `fetchRealms(): Promise<{ realms: Realm[] }>`.

- [ ] **Step 1: Add the `Realm` type**

In `frontend/src/types/map.ts`, add near the top (after the `PalletSafetyRating` type):

```ts
export interface Realm {
  name: string;
  image_url: string;
  image_local_path: string;
}
```

- [ ] **Step 2: Add `fetchRealms`**

In `frontend/src/services/mapApi.ts`, add:

```ts
import { MapRealm, Realm } from '@/types/map';
```
(replacing the existing `import { MapRealm } from '@/types/map';` line), and add:

```ts
export async function fetchRealms(): Promise<{ realms: Realm[] }> {
  const url = `${API_BASE}/maps/realms`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch realms');
  return res.json();
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/map.ts frontend/src/services/mapApi.ts
git commit -m "feat: add Realm type and fetchRealms API client"
```

---

### Task 8: `MapCard` component

**Files:**
- Create: `frontend/src/components/maps/MapCard.tsx`
- Test: `frontend/src/__tests__/unit/mapCard.test.ts`

**Interfaces:**
- Consumes: `MapRealm` from `@/types/map`, `getMapImageSrc` from `@/utils/mapUtils`.
- Produces: `MapCard` React component, props `{ map: MapRealm; backendBase: string; onSelect: (map: MapRealm) => void }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/mapCard.test.ts`:

```ts
// frontend/src/__tests__/unit/mapCard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapCard } from '@/utils/../components/maps/MapCard';
import type { MapRealm } from '@/types/map';

const sampleMap: MapRealm = {
  id: 'hens_azarovs_resting_place',
  name: "Azarov's Resting Place",
  realm: 'Autohaven Wreckers',
  layout_type: 'Dumbbell Narrow',
  jungle_gyms_count: 5,
  totem_spawns_count: 5,
  pallet_density: 'High',
  shack_has_basement: false,
  description: 'Iconic dumbbell-shaped map',
  source: 'hens333',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
  callout_image_local_path: 'maps/callouts/hens333/azarovs/azarovs_resting_place.webp',
};

test('MapCard renders the map name as a visible label', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
});

test('MapCard resolves the local static image path', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('http://localhost:5000/static/maps/callouts/hens333/azarovs/azarovs_resting_place.webp'));
});

test('MapCard falls back to the remote callout URL when no local path is set', () => {
  const remoteOnlyMap: MapRealm = { ...sampleMap, callout_image_local_path: undefined };
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: remoteOnlyMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/mapCard.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `MapCard`**

Create `frontend/src/components/maps/MapCard.tsx`:

```tsx
'use client';
// frontend/src/components/maps/MapCard.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapImageSrc } from '@/utils/mapUtils';

export interface MapCardProps {
  map: MapRealm;
  backendBase: string;
  onSelect: (map: MapRealm) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ map, backendBase, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getMapImageSrc(map, backendBase);

  return (
    <button
      type="button"
      onClick={() => onSelect(map)}
      className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 transition-all duration-200 hover:scale-105 hover:border-amber-400 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
      data-testid={`map-card-${map.id}`}
    >
      <div className="h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={map.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-400 dark:text-slate-600" />
        )}
      </div>
      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 text-center line-clamp-2">
        {map.name}
      </span>
    </button>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/mapCard.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/maps/MapCard.tsx frontend/src/__tests__/unit/mapCard.test.ts
git commit -m "feat: add MapCard grid component"
```

---

### Task 9: Simplify `useMapExplorerData`

**Files:**
- Modify: `frontend/src/hooks/useMapExplorerData.ts`
- Modify: `frontend/src/__tests__/unit/mapHooks.test.ts`

**Interfaces:**
- Consumes: `fetchMaps`, `fetchRealms` from `@/services/mapApi`.
- Produces (new return shape):
```ts
export interface UseMapExplorerDataReturn {
  maps: MapRealm[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  groupedMapsByRealm: { realm: string; maps: MapRealm[] }[]; // sorted alphabetically by realm name
  realmImages: Record<string, Realm>; // keyed by realm name
  openMapId: string | null;
  setOpenMapId: (id: string | null) => void;
}
```
This drops `MapSource`, `activeSource`/`setActiveSource`, `selectedRealm`/`setSelectedRealm` (realm is now a section, not a filter), `selectedMapId`/`activeMap`/`isDetailModalOpen`/`variants`/`selectVariantByName` (all were for the old canvas-preview + variant-switcher flow; `FullscreenMapEngine` now owns detail-fetching and variant switching internally via its own `availableMaps` prop).

- [ ] **Step 1: Update `mapHooks.test.ts` first (defines the new contract)**

Replace the full contents of `frontend/src/__tests__/unit/mapHooks.test.ts` with:

```ts
// frontend/src/__tests__/unit/mapHooks.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeMapSearch,
  groupMapsByRealmSorted,
  useMapExplorerData,
} from '@/utils/../hooks/useMapExplorerData';
import type { MapRealm } from '@/types/map';

const sampleMockMaps: MapRealm[] = [
  {
    id: 'hens_azarovs_resting_place',
    name: "Azarov's Resting Place",
    realm: 'Autohaven Wreckers',
    layout_type: 'Dumbbell Narrow',
    jungle_gyms_count: 5,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: false,
    description: 'Iconic dumbbell-shaped map',
    source: 'hens333',
  },
  {
    id: 'hens_blood_lodge',
    name: 'Blood Lodge',
    realm: 'Autohaven Wreckers',
    layout_type: 'Open Quad',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Open yard lodge',
    source: 'hens333',
  },
  {
    id: 'hens_preschool_i',
    name: 'Preschool I',
    realm: 'Springwood',
    layout_type: 'Suburban Street',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Badham Variant 1',
    source: 'hens333',
  },
];

test('normalizeMapSearch strips punctuation, whitespace, and diacritics', () => {
  assert.strictEqual(normalizeMapSearch("Azarov's Resting Place"), 'azarovsrestingplace');
  assert.strictEqual(normalizeMapSearch('Léry\'s Memorial Institute'), 'lerysmemorialinstitute');
  assert.strictEqual(normalizeMapSearch('  Coal   Tower  II '), 'coaltowerii');
  assert.strictEqual(normalizeMapSearch(''), '');
});

test('groupMapsByRealmSorted groups by realm and sorts sections alphabetically', () => {
  const grouped = groupMapsByRealmSorted(sampleMockMaps);

  assert.strictEqual(grouped.length, 2);
  assert.strictEqual(grouped[0].realm, 'Autohaven Wreckers');
  assert.strictEqual(grouped[0].maps.length, 2);
  assert.strictEqual(grouped[1].realm, 'Springwood');
  assert.strictEqual(grouped[1].maps.length, 1);

  assert.deepStrictEqual(groupMapsByRealmSorted([]), []);
});

test('useMapExplorerData is an exported hook function', () => {
  assert.strictEqual(typeof useMapExplorerData, 'function');
});

test('groupMapsByRealmSorted never produces an empty-map section, satisfying "hides non-matching sections"', () => {
  // Search filtering happens server-side (fetchMaps' existing name/realm ilike filter, already
  // covered by backend tests) — maps passed into this function are always pre-filtered, so a
  // realm with zero matches simply never appears as a key here. This test documents that
  // guarantee at the grouping boundary rather than re-testing the backend filter in JS.
  const partial = sampleMockMaps.filter((m) => m.name.toLowerCase().includes('preschool'));
  const grouped = groupMapsByRealmSorted(partial);
  assert.deepStrictEqual(
    grouped.map((g) => g.realm),
    ['Springwood']
  );
});
```

Delete `frontend/src/__tests__/unit/mapLayouts.test.ts` and `frontend/src/__tests__/unit/mapSubcomponents.test.ts` (they test components removed in Task 15).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/mapHooks.test.ts`
Expected: FAIL (`groupMapsByRealmSorted` not exported yet; old exports like `useMapGestures`, `groupMapsByRealm` no longer imported by this file so that's fine).

- [ ] **Step 3: Rewrite the hook**

Replace the full contents of `frontend/src/hooks/useMapExplorerData.ts`:

```ts
// frontend/src/hooks/useMapExplorerData.ts
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapRealm, Realm } from '@/types/map';
import { fetchMaps, fetchRealms } from '@/services/mapApi';

export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
}

export function normalizeMapSearch(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function groupMapsByRealmSorted(maps: MapRealm[]): { realm: string; maps: MapRealm[] }[] {
  if (!maps || !Array.isArray(maps)) return [];
  const grouped: Record<string, MapRealm[]> = {};
  maps.forEach((m) => {
    const realm = m.realm || 'Unknown';
    if (!grouped[realm]) {
      grouped[realm] = [];
    }
    grouped[realm].push(m);
  });
  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map((realm) => ({ realm, maps: grouped[realm] }));
}

export function findMapByName(maps: MapRealm[], targetMapName: string): MapRealm | undefined {
  if (!targetMapName || !targetMapName.trim() || !maps || maps.length === 0) return undefined;
  const needle = targetMapName.toLowerCase().trim();
  const normNeedle = normalizeMapSearch(needle);

  return maps.find(
    (m) =>
      m.name.toLowerCase().includes(needle) ||
      needle.includes(m.name.toLowerCase()) ||
      normalizeMapSearch(m.name) === normNeedle ||
      normalizeMapSearch(m.name).includes(normNeedle) ||
      normNeedle.includes(normalizeMapSearch(m.name))
  );
}

export interface UseMapExplorerDataReturn {
  maps: MapRealm[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  groupedMapsByRealm: { realm: string; maps: MapRealm[] }[];
  realmImages: Record<string, Realm>;
  openMapId: string | null;
  setOpenMapId: (id: string | null) => void;
}

export function useMapExplorerData(options: UseMapExplorerDataOptions = {}): UseMapExplorerDataReturn {
  const { initialMapName = '', selectedMap, onAvailableMapsLoaded } = options;

  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [realmImages, setRealmImages] = useState<Record<string, Realm>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openMapId, setOpenMapId] = useState<string | null>(null);

  const onAvailableMapsLoadedRef = useRef(onAvailableMapsLoaded);
  useEffect(() => {
    onAvailableMapsLoadedRef.current = onAvailableMapsLoaded;
  }, [onAvailableMapsLoaded]);

  useEffect(() => {
    let isCancelled = false;
    async function loadMaps() {
      try {
        setLoading(true);
        const data = await fetchMaps(undefined, search, 'hens333');
        const loaded: MapRealm[] = data?.maps || [];
        if (!isCancelled) {
          setMaps(loaded);
          onAvailableMapsLoadedRef.current?.(loaded);
        }
      } catch (err) {
        console.error('Failed loading maps:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    loadMaps();
    return () => {
      isCancelled = true;
    };
  }, [search]);

  useEffect(() => {
    let isCancelled = false;
    async function loadRealms() {
      try {
        const data = await fetchRealms();
        if (!isCancelled) {
          const byName: Record<string, Realm> = {};
          (data?.realms || []).forEach((r) => {
            byName[r.name] = r;
          });
          setRealmImages(byName);
        }
      } catch (err) {
        console.error('Failed loading realm images:', err);
      }
    }
    loadRealms();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const rawTarget = selectedMap !== undefined ? selectedMap : initialMapName;
    const targetMapName =
      typeof rawTarget === 'object' && rawTarget !== null ? rawTarget.mapName : rawTarget;
    if (!targetMapName || !targetMapName.trim() || maps.length === 0) return;

    const match = findMapByName(maps, targetMapName);
    if (match) {
      setOpenMapId(match.id);
    }
  }, [initialMapName, selectedMap, maps]);

  const groupedMapsByRealm = useMemo(() => groupMapsByRealmSorted(maps), [maps]);

  return {
    maps,
    loading,
    search,
    setSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/mapHooks.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors only in `MapExplorer.tsx`/`page.tsx` (not yet updated — fixed in Tasks 10-11) and the two deleted test files if `tsc` is run before they're removed from disk; no errors in the hook itself.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useMapExplorerData.ts frontend/src/__tests__/unit/mapHooks.test.ts
git rm frontend/src/__tests__/unit/mapLayouts.test.ts frontend/src/__tests__/unit/mapSubcomponents.test.ts
git commit -m "refactor: simplify useMapExplorerData for realm-grouped grid"
```

---

### Task 10: Rewrite `MapExplorer.tsx`

**Files:**
- Modify: `frontend/src/components/maps/MapExplorer.tsx`

**Interfaces:**
- Consumes: `useMapExplorerData` (Task 9), `MapCard` (Task 8), `FullscreenMapEngine` (untouched — `{ mapId, onClose, availableMaps, onSelectMapId, dict }`).
- Produces: same external props as before minus source-toggle plumbing:
```ts
export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  backendBase: string;
  dict?: Dictionary;
}
```

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `frontend/src/components/maps/MapExplorer.tsx`:

```tsx
'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React from 'react';
import { Search, ImageOff } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData } from '@/hooks/useMapExplorerData';
import { getMapImageSrc } from '@/utils/mapUtils';
import { MapCard } from './MapCard';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  backendBase: string;
  dict?: Dictionary;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedMap,
  onAvailableMapsLoaded,
  backendBase,
  dict,
}) => {
  const {
    maps,
    loading,
    search,
    setSearch,
    groupedMapsByRealm,
    realmImages,
    openMapId,
    setOpenMapId,
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    onAvailableMapsLoaded,
  });

  const t = (dict as any)?.maps || {};

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder || 'Search...'}
          aria-label={t.searchAria || 'Search map or realm'}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {loading && (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          {t.loadingTacticalMaps || 'Loading Tactical Maps...'}
        </div>
      )}

      {!loading && groupedMapsByRealm.length === 0 && (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          {t.noMapsFound || 'No Maps Found'}
        </div>
      )}

      {!loading &&
        groupedMapsByRealm.map(({ realm, maps: realmMaps }) => {
          const realmImage = realmImages[realm];
          const bannerSrc = realmImage
            ? getMapImageSrc({ callout_image_local_path: realmImage.image_local_path, callout_image_url: realmImage.image_url } as MapRealm, backendBase)
            : '';

          return (
            <section key={realm} className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                {bannerSrc ? (
                  <div className="relative h-20 sm:h-24 w-full">
                    <img src={bannerSrc} alt={realm} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-slate-950/20" />
                    <h2 className="absolute bottom-2 left-4 text-lg sm:text-xl font-black text-white tracking-tight">
                      {realm}
                    </h2>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-900">
                    <ImageOff className="h-4 w-4 text-slate-400" />
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {realm}
                    </h2>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {realmMaps.map((m) => (
                  <MapCard key={m.id} map={m} backendBase={backendBase} onSelect={(map) => setOpenMapId(map.id)} />
                ))}
              </div>
            </section>
          );
        })}

      {openMapId && (
        <FullscreenMapEngine
          mapId={openMapId}
          availableMaps={maps}
          onSelectMapId={(id) => setOpenMapId(id)}
          onClose={() => setOpenMapId(null)}
          dict={dict}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors in `MapExplorer.tsx` or `MapCard.tsx`; `page.tsx` still errors until Task 11.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/maps/MapExplorer.tsx
git commit -m "refactor: rewrite MapExplorer as realm-grouped card grid"
```

---

### Task 11: Text/Voice toggle in `page.tsx`

**Files:**
- Modify: `frontend/src/app/[locale]/maps/page.tsx`

**Interfaces:**
- Consumes: `MapExplorer` (Task 10, new props), `VoiceCommandBanner` (untouched — still requires `currentSource: 'all' | 'hens333' | 'samoelcolt'`).

- [ ] **Step 1: Add the toggle and rewire the render**

In `frontend/src/app/[locale]/maps/page.tsx`:
- Add `useState` import already present; add a new state: `const [searchMode, setSearchMode] = useState<'text' | 'voice'>('text');` (defaults to Text, per approved spec §4.5; resets to Text on every page load since it's local `useState`, not persisted).
- Replace the block:
```tsx
        <VoiceCommandBanner
          locale={locale}
          dict={dict}
          currentSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onSelectMap={(name, id, src) => {
            if (src) setCurrentSource(src as 'all' | 'hens333' | 'samoelcolt');
            setSelectedMap({ mapName: name, timestamp: Date.now() });
          }}
          onAction={(act) => {
            setTriggerAction({ action: act, timestamp: Date.now() });
          }}
          availableMaps={availableMaps}
        />

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          selectedSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          onActionTriggered={(act) => setTriggerAction({ action: act, timestamp: Date.now() })}
          triggerAction={triggerAction}
        />
```
with:
```tsx
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit">
          <button
            type="button"
            onClick={() => setSearchMode('text')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-colors ${
              searchMode === 'text'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {dict?.maps?.searchTextTab || 'Search'}
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('voice')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-colors ${
              searchMode === 'voice'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {dict?.maps?.searchVoiceTab || 'Voice'}
          </button>
        </div>

        {searchMode === 'voice' && (
          <VoiceCommandBanner
            locale={locale}
            dict={dict}
            currentSource="hens333"
            onSourceChange={() => {}}
            onSelectMap={(name) => {
              setSelectedMap({ mapName: name, timestamp: Date.now() });
            }}
            onAction={(act) => {
              setTriggerAction({ action: act, timestamp: Date.now() });
            }}
            availableMaps={availableMaps}
          />
        )}

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          backendBase={backendBase}
          dict={dict}
        />
```
- Remove the now-unused `currentSource`/`setCurrentSource` state (`const [currentSource, setCurrentSource] = useState<'all' | 'hens333' | 'samoelcolt'>('hens333');`) — replaced by the hardcoded `"hens333"` literal passed directly to `VoiceCommandBanner` above.
- Remove the now-unused `triggerAction`/`setTriggerAction` state and its `useEffect`-adjacent wiring IF nothing else in the file still reads `triggerAction` after this change (grep the file for `triggerAction` post-edit — `VoiceCommandBanner`'s `onAction` callback still needs somewhere to write to, so keep `triggerAction` state itself; it's just no longer read by `MapExplorer`, which now manages fullscreen open/close via `openMapId` internally). Leave `triggerAction` state and the `onAction` handler in place since `VoiceCommandBanner`'s prop contract (untouched) still expects `onAction`.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `docker compose build frontend && docker compose up -d frontend`, then use the `run` skill's Playwright pattern (log in as `user`/`user` at `https://localhost`, `ignoreHTTPSErrors: true`) to:
- Navigate to `/en/maps`.
- Confirm the grid renders realm sections alphabetically with map cards showing names.
- Click a map card, confirm `FullscreenMapEngine` opens.
- Close it, click the Voice tab, confirm `VoiceCommandBanner` renders and the grid stays visible below it.
- Type into the Text-mode search box, confirm the grid narrows to matching realms/maps.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\[locale\]/maps/page.tsx
git commit -m "feat: add Text/Voice toggle to maps page"
```

---

### Task 12: i18n — new keys + dead-key cleanup

**Files:**
- Modify: `frontend/src/locales/en/maps.ts`
- Modify: `frontend/src/locales/pl/maps.ts`, `de/maps.ts`, `es/maps.ts`, `ja/maps.ts`

**Interfaces:** none (data-only).

- [ ] **Step 1: Update `en/maps.ts`**

Add these keys (anywhere in the object, e.g. near `searchPlaceholder`):
```ts
  searchTextTab: "Search",
  searchVoiceTab: "Voice",
```

Remove these keys, each independently re-verified as dead via `grep -rn "\bKEY\b" frontend/src/components/maps frontend/src/app --include="*.tsx"` returning zero matches once Task 15's deletions are done (run this task AFTER Task 15, not before, so the grep reflects the final file set):
`providerToggleAria`, `allSources`, `realmFiltersAria`, `realmPillsAria`, `mapDirectory`, `loadingDirectory`, `directoryAndLegendsAria`, `sectorLegendAria`, `closeBottomSheetAria`, `popoutAria`, `popout`, `dragPanScrollZoom`, `mapControlsAria`, `zoomIn`, `zoomOut`, `fitToScreen`, `set100Zoom`, `set150Zoom`, `set200Zoom`, `launch2DEngine`, `twoDEngine`, `noMapsAdjustFilter`, `allRealms`, `filterByRealm`, `sourceSamoelIsometric`, `sourceSamoel`, `quadrantSystemTitle`, `quadrantSystemSubtitle`, `samoelIsometricScheme`, `isometricScheme`.

Do NOT remove `noMapsFound` (reused by the new `MapExplorer.tsx` empty state written in Task 10) or `resetPanZoom`/`resetPanAndZoomAria` (used by `FullscreenMapEngine.tsx`, confirmed untouched).

- [ ] **Step 2: Update `pl`, `de`, `es`, `ja` locale files identically**

For each of `frontend/src/locales/{pl,de,es,ja}/maps.ts`: add the same two new keys with the same English placeholder values (`"Search"` / `"Voice"`) — translated in a later dedicated pass, matching the precedent set for the streaks Rules modals earlier this session. Remove the same dead-key list from each file (grep each file first; a locale file may already be missing some of these keys, which is fine per this repo's structural, not exact-shape, `Dictionary` typing — skip any key that isn't present).

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (the `Dictionary` type is derived from `en`, and no removed key is referenced by any remaining `.tsx` file per Task 15's completion).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/en/maps.ts frontend/src/locales/pl/maps.ts frontend/src/locales/de/maps.ts frontend/src/locales/es/maps.ts frontend/src/locales/ja/maps.ts
git commit -m "chore: update maps locale keys for redesigned explorer"
```

---

### Task 13: `mapUtils.ts` cleanup

**Files:**
- Modify: `frontend/src/utils/mapUtils.ts`

**Interfaces:**
- Produces: `getMapImageSrc` unchanged; `handlePopoutImageWindow` removed.

- [ ] **Step 1: Remove the dead export**

In `frontend/src/utils/mapUtils.ts`, delete the `handlePopoutImageWindow` function (its only two callers, `MapExplorer.tsx`'s old canvas and `MapDirectoryList.tsx`, are both gone by this point in the plan — Task 10 rewrote the former, Task 15 deletes the latter).

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/mapUtils.ts
git commit -m "chore: remove dead handlePopoutImageWindow util"
```

---

### Task 14: Backend cleanup verification (no source code — data/asset check)

**Files:** none modified; verification only.

- [ ] **Step 1: Confirm no lingering SamoelColt references**

Run: `grep -rln "SamoelColt\|samoelcolt" backend/app`
Expected: no matches (Task 4 already removed the driver and DB rows; this step exists to catch any documentation/comment strings elsewhere in `backend/app` that reference it, e.g. stray docstrings — fix any that turn up).

- [ ] **Step 2: Commit if anything was found and fixed**

```bash
git add -A backend/app
git commit -m "chore: remove remaining SamoelColt references"
```
(Skip this task's commit if Step 1 found nothing.)

---

### Task 15: Delete dead frontend components

**Files (all deleted):**
- `frontend/src/components/maps/layouts/DesktopMapLayout.tsx`
- `frontend/src/components/maps/layouts/MobileMapLayout.tsx`
- `frontend/src/components/maps/layouts/index.ts`
- `frontend/src/components/maps/MapCanvas.tsx`
- `frontend/src/components/maps/MapControls.tsx`
- `frontend/src/components/maps/MapLegendDrawer.tsx`
- `frontend/src/components/maps/MapDirectoryList.tsx`
- `frontend/src/components/maps/VoiceNavButton.tsx`
- `frontend/src/hooks/useMapGestures.ts`

**Interfaces:** none — pure deletion. By this point (after Tasks 9-10), nothing imports any of these files; verified below before deleting.

- [ ] **Step 1: Verify zero remaining importers for each file**

Run:
```bash
for f in DesktopMapLayout MobileMapLayout MapCanvas MapControls MapLegendDrawer MapDirectoryList VoiceNavButton; do
  echo "=== $f ==="
  grep -rln "$f" frontend/src --include="*.tsx" --include="*.ts" | grep -v "components/maps/$f\|layouts/index"
done
grep -rln "useMapGestures" frontend/src --include="*.tsx" --include="*.ts" | grep -v "hooks/useMapGestures.ts"
```
Expected: no output for any of them (confirms nothing outside the files themselves still imports them).

- [ ] **Step 2: Delete**

```bash
git rm -r frontend/src/components/maps/layouts
git rm frontend/src/components/maps/MapCanvas.tsx
git rm frontend/src/components/maps/MapControls.tsx
git rm frontend/src/components/maps/MapLegendDrawer.tsx
git rm frontend/src/components/maps/MapDirectoryList.tsx
git rm frontend/src/components/maps/VoiceNavButton.tsx
git rm frontend/src/hooks/useMapGestures.ts
```

- [ ] **Step 3: Type-check and test**

Run: `cd frontend && npx tsc --noEmit && npm run test:unit`
Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead map explorer components after redesign"
```

Note: `frontend/src/components/maps/VariantSwitcherBar.tsx` is intentionally NOT deleted here — per spec §5 it's kept, unused for now, pending later work to re-home it inside `FullscreenMapEngine.tsx` (explicitly out of scope for this plan).

---

### Task 16: Final verification pass

**Files:** none modified; verification only.

- [ ] **Step 1: Full backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: all pass, including the new tests from Tasks 2, 3, 6.

- [ ] **Step 2: Full frontend unit test suite**

Run: `cd frontend && npm run test:unit`
Expected: all pass.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Full rebuild and manual smoke test**

Run: `docker compose build backend frontend && docker compose up -d`

Using the `run` skill's Playwright pattern (log in as `user`/`user` at `https://localhost`):
- `/en/maps` loads, shows realm-grouped sections sorted alphabetically, each with a banner (image or text fallback) and map cards with visible names.
- Search narrows sections/cards correctly (by map name or realm name), clears back to full grid when emptied.
- Voice tab shows `VoiceCommandBanner`; a recognized voice match still opens `FullscreenMapEngine` via the same `onSelectMap` path used before the redesign.
- Clicking a card opens `FullscreenMapEngine` unmodified; closing it returns to the grid.
- A map whose image 404s shows the `ImageOff` fallback icon, not a broken image.
- No console errors on page load or interaction (`read_console_messages`).

- [ ] **Step 5: Report**

Summarize pass/fail for each check above; if the Playwright pass finds issues, fix them as targeted follow-up commits (not folded into earlier tasks) and re-run Step 4.

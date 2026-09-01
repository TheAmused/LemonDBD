# Map Explorer: Realm-Grouped Redesign & Hens333-Only Data

**Date:** 2026-08-31
**Status:** PROPOSED (Awaiting User Review)
**Scope:** `frontend` (Map Explorer page) + `backend` (map scraper, new `Realm` model, data cleanup)

---

## 1. Executive Summary

The Map Explorer page (`/maps`) is being rebuilt around a fact that wasn't previously acted on: **the app already scrapes two independent map data sources, and only one of them (SamoelColt) has usable realm data — the other (Hens333) dumps all 58 of its maps into a fake "General Realm" bucket, even though the real realm is embedded in the callout image URL path it already scraped** (`.../callouts/McMillan/...`, `.../callouts/Red%20Forest/...`, etc.).

This redesign:

- **Drops SamoelColt entirely** (scraper driver, DB rows, downloaded image files) and standardizes on **Hens333 as the single data source** (explicitly a placeholder pending a better source later).
- **Fixes realm grouping at the source**: `HensMapScraperDriver` is updated to parse the realm from the callout image URL's folder segment and map it to a canonical realm name, so every future re-sync gets correct realm data — not just a one-off DB patch that a later upsert would silently undo.
- **Adds a new `Realm` model** and a new wiki.gg scrape step to fetch real per-realm artwork (matching the "Realms" gallery at `deadbydaylight.wiki.gg`), used as section-header banners.
- **Replaces the entire current page structure** (separate `DesktopMapLayout`/`MobileMapLayout` sidebar+viewport split, `MapCanvas`, `MapDirectoryList`) with **one responsive grid, grouped into realm sections**, using a new `MapCard` component styled after the existing `PerkCard` pattern (image + name label, same size-class system) but with the name always visible instead of hover-only.
- **Replaces the always-on-top voice search banner with a Text/Voice toggle.** Text search is the default; switching to Voice reveals the existing `VoiceCommandBanner` unchanged. Neither mode's underlying logic changes — this is a visibility/placement change, not a rewrite of search behavior.
- **Leaves the fullscreen map viewer (`FullscreenMapEngine`) completely untouched.** It already has known data gaps (synthetic tile/objective pins are the same generic template for every map; `map_objectives` has zero rows) — those are explicitly out of scope, to be addressed in a later, separate pass.

### Non-goals

- No changes to `FullscreenMapEngine.tsx`, `TileInspectorDrawer.tsx`, `mapLandmarks.ts`, or anything the fullscreen viewer depends on. Its data-quality gaps (generic tile templates, empty objectives table) are not fixed in this pass.
- No changes to `mapVoiceMatcher.ts` or `VoiceCommandBanner.tsx` internals — they are relocated behind a toggle, not rewritten.
- No filtering axis beyond realm (no killer/DLC/chapter filter) — no such data field exists, and none is being added.
- No re-introduction of a source toggle (Hens333/SamoelColt/All) — moot once SamoelColt is removed.
- No changes to `map_tiles`/`map_objectives` data or the callout data pipeline that feeds them.

---

## 2. Data Model Changes (backend)

### 2.1 `Realm` — new model

A realm is a distinct game concept from a map (one realm has 1-10 maps) and is being treated as a first-class, groupable entity for the first time. Rather than duplicating the same image URL across every map row that shares a realm, realm data gets its own small table:

```python
class Realm(Base):
    __tablename__ = "realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

No foreign key from `map_realms` to `Realm` — matching stays by `MapRealm.realm` (string) == `Realm.name` (string), consistent with how `realm` is already a free-text field on every map row. A formal FK is not worth the migration complexity for a lookup that only needs to succeed for section-header rendering; a missing match just means that section renders without a banner image (see §6).

### 2.2 `MapRealm.realm` — fixed at the source

Today `HensMapScraperDriver` never sets a real `realm` value; every Hens333 map lands under the literal string `"General Realm"`. The fix has two parts:

1. **Parse realm from the callout URL path.** Every Hens333 `callout_image_url` already contains the realm as a folder segment: `https://hens333.com/img/dbd/callouts/{folder}/{map}.webp`. Extract `{folder}`.
2. **Map folder → canonical realm name** via a small static dict, built by cross-referencing the (still-present, at implementation time) SamoelColt `realm` values for overlapping realms, plus manual identification for the 10 maps under Hens333's own `Other` folder (each a real single-map realm — e.g. `Lampkin Lane` → `Haddonfield`, `Midwich Elementary School` → `Silent Hill`, `The Underground Complex` → `Hawkins National Laboratory`). Full mapping (15 folders → realm names) goes in the implementation plan, not duplicated here.

This mapping function lives in `backend/app/scrapers/maps.py`, where `HensMapScraperDriver` is defined, so every future sync produces correct data — **not** a one-time SQL UPDATE, which the next upsert-based sync would silently overwrite back to `"General Realm"`.

### 2.3 One-time backfill

A short one-off script re-derives `realm` for the 58 already-imported Hens333 rows using the same mapping function, so the fix is visible immediately without requiring a full re-scrape.

### 2.4 SamoelColt removal

- Remove `SamoelColtMapScraperDriver` and its call site from `execute_sync_pipeline()` in `backend/app/services/scraper/pipeline.py`.
- `TRUNCATE` (or scoped `DELETE`) all `map_realms` rows where `source = 'samoelcolt'` — cascades to their `map_tiles`/`map_objectives` rows via the existing FK.
- Delete the corresponding downloaded callout image files from `backend/app/static/maps/callouts/samoelcolt/`.

---

## 3. New Wiki.gg Realm-Image Scrape Step

- New step in `WikiGGScraperDriver` (`backend/app/scrapers/wikigg.py`): fetch the Realms gallery page from `deadbydaylight.wiki.gg`, extract each realm's display name and card image URL.
- Match against our 15 canonical realm names with light normalization (case-insensitive, "The " prefix tolerant) — wiki.gg's exact casing/wording ("The MacMillan Estate") may not byte-match ours ("The Macmillan Estate").
- Downloads images the same way existing asset downloads work (skip-if-exists), storing under a new `backend/app/static/realms/` directory, populating `Realm.image_url` / `Realm.image_local_path`.
- Runs once as part of the normal full sync pipeline, not gated behind a separate manual trigger.

---

## 4. Frontend: Page Structure

### 4.1 Layout — one responsive grid, no separate desktop/mobile trees

```
┌──────────────────────────────────────────────┐
│  [ Szukaj | Głos ]  <- segmented toggle       │
│  ┌──────────────────────────────────────────┐│
│  │ search input  (Szukaj mode)                ││
│  │  -- or --                                   ││
│  │ VoiceCommandBanner, unchanged (Głos mode)   ││
│  └──────────────────────────────────────────┘│
├──────────────────────────────────────────────┤
│  🖼  RED FOREST                    (banner)   │
│  [MapCard] [MapCard]                          │
├──────────────────────────────────────────────┤
│  🖼  THE MACMILLAN ESTATE          (banner)   │
│  [MapCard] [MapCard] [MapCard] ... (10)       │
├──────────────────────────────────────────────┤
│  ... one section per realm, all 15 ...        │
└──────────────────────────────────────────────┘
```

One column-flow structure at every breakpoint (matching the "single responsive layout" principle already adopted in the recent Perk Randomizer redesign) — the grid's column count changes with viewport width via Tailwind responsive classes, but there is no separate mobile component tree to maintain.

### 4.2 `MapCard` (new component)

Modeled directly on `PerkCard.tsx`'s grid-view visual system (same `GRID_SIZE_CLASSES` scale, rounded corners, hover scale/shadow treatment) with one deliberate difference: **the map name is always visible below the image**, not hover-only. A small map thumbnail isn't independently recognizable the way a perk icon is, so a static label is the right call here even though `PerkCard` doesn't do this for perks.

- Props: `map: MapListItem`, `onSelect: (map) => void`.
- Renders: `callout_image_url`/`callout_image_local_path` (via existing `getAssetUrl`) with an `ImageOff` fallback matching `PerkCard`'s error-state pattern, map name in a truncated label underneath.
- Click → calls `onSelect(map)`, which opens `FullscreenMapEngine` exactly as today (unchanged prop contract).

### 4.3 Realm section header

- Renders `Realm.image_local_path` (looked up by matching `MapRealm.realm` name) as a banner image with the realm name overlaid at the bottom, in the app's own dark/rounded visual language — not a literal copy of wiki.gg's gold-ornamented skin.
- **Missing realm image fallback**: if no `Realm` row matches (scrape gap, or a realm name mismatch), the section still renders with a plain text header (same treatment used everywhere else in the app for section titles, e.g. `PROGRESSIVE TIER RESTRICTIONS` in the streaks rules modals) — never a broken image or a missing section.
- Sections render alphabetically by realm name — predictable and scannable, and stable across future data changes (map counts per realm will shift as new chapters are scraped).

### 4.4 Search behavior

- Text input filters on map name **or** realm name (case-insensitive substring), live as the user types.
- A realm section is hidden entirely if none of its maps match; otherwise only the matching cards within it show.
- Search state is local to the page (not persisted across visits).

### 4.5 Text/Voice toggle

- A segmented two-button control (`Szukaj` / `Głos`) replaces the always-visible `VoiceCommandBanner` at the top of the page.
- Default mode: **Text**. Switching to **Voice** renders `VoiceCommandBanner` exactly as it exists today (mic button, push-to-talk, quick-command chips, info modal) — no internal changes to that component or to `mapVoiceMatcher.ts`.
- A recognized voice match still calls the same `onSelectMap` → opens `FullscreenMapEngine`, identical to today's behavior.
- Toggle state resets to Text on each page load (not persisted).

---

## 5. Removed / Replaced Components

| File | Disposition |
|---|---|
| `DesktopMapLayout.tsx` | Removed — replaced by the single responsive grid |
| `MobileMapLayout.tsx` | Removed — replaced by the single responsive grid |
| `MapCanvas.tsx` | Removed — no more in-page split-pane preview; cards open Fullscreen directly |
| `useMapGestures.ts` | Removed — was only used by `MapCanvas`; `FullscreenMapEngine` has its own independent pan/zoom |
| `MapDirectoryList.tsx` | Removed — replaced by `MapCard` + the new grouped grid |
| `VoiceNavButton.tsx` | Removed if confirmed unused during implementation (currently looks dead) |
| `VariantSwitcherBar.tsx` | Kept — re-homed wherever it needs to live so multi-variant maps (Badham I-V, etc.) still work; confirmed during implementation whether it lives inside `FullscreenMapEngine` already or needs relocating |
| `FullscreenMapEngine.tsx`, `TileInspectorDrawer.tsx`, `mapLandmarks.ts` | Untouched |
| `VoiceCommandBanner.tsx`, `VoiceEngineInfoModal.tsx`, `mapVoiceMatcher.ts` | Untouched, relocated behind the toggle |
| `useMapExplorerData.ts`, `mapApi.ts`, `types/map.ts` | Simplified — remove source-toggle logic and SamoelColt handling; keep as the data hook feeding the new grid |

---

## 6. Error Handling

- Map image load failure: existing `PerkCard`-style fallback (`ImageOff` icon in a placeholder tile) — same pattern, new component.
- Realm image load/match failure: falls back to plain text section header (§4.3) — a missing banner never blocks the section's maps from showing.
- Empty search results: existing empty-state pattern used elsewhere in the app (e.g. "No items found" copy in the streaks/equipment components) — a short centered message, no broken layout.
- Voice recognition errors/unsupported browser: unchanged, `VoiceCommandBanner` already handles this today.

---

## 7. Testing

- Backend: unit test for the Hens333 folder→realm mapping function (all 15 folders resolve correctly, including the 10 `Other`-bucket single-map realms) — mirrors the existing `test_addon_canonicalisation.py` pattern from the recent addon-icon fix.
- Backend: one-time backfill script is idempotent (safe to re-run).
- Frontend: unit test for the search filter (matches by map name and by realm name; hides non-matching sections).
- Manual verification in-browser (Playwright, matching this session's established pattern) for: realm sections render with correct maps, missing-realm-image fallback, search narrowing, Text/Voice toggle switching, a map card click opening the unchanged `FullscreenMapEngine`.

---

## 8. Localization

- New/changed UI strings (toggle labels, any new empty-state copy) added to `en/maps.ts` first as the source of truth; `pl`/`de`/`es`/`ja` get English-placeholder stubs for now and are translated in a dedicated follow-up pass, consistent with how the streaks rules-modal rewrite was handled this session.
- No changes to the existing, already-complete `maps.ts` key set beyond removing keys tied to deleted UI (source toggle, old directory-list filters) and adding the small set of new ones (toggle labels, realm section empty-state if any).

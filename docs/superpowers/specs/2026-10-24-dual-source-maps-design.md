# Design Specification: Dual-Source Maps, UI Toggle & Landmark Legend

**Date:** 2026-10-24  
**Status:** Approved  
**Author:** Antigravity  

---

## 1. Overview & Context

LemonDBD provides map data and tactical callouts for Dead by Daylight realms. Previously, all map imagery came from Hens333 12-clock callout images (`hens333`). A recent unstaged change introduced to-scale vector layouts (`lemondbd`) drawn in SVG with ray-marched clock labels and landmarks.

This specification details:
1. Splitting map seed data into two distinct JSON files: `maps/lemondbd.json` (vector layouts) and `maps/hens.json` (original Hens callout images), with collision-free primary keys.
2. Providing a seamless toggle on the Maps page between LemonDBD and Hens333 in both text and voice modes.
3. Adding a comprehensive Map Legend and rich tooltips explaining competitive landmark abbreviations like `C|H`, `WT`, `H/FB`, etc.

---

## 2. Seed Data & Database Architecture

### 2.1 File Organization
- `backend/app/seeds/data/content/maps/lemondbd.json`:
  - 58 maps.
  - `source_id: 2` (references `map_sources` where `code = "lemondbd"`).
  - IDs: `1` to `58`.
  - Full vector layout payloads: `{ "v": 1, "cell_m": 8, "width_m": ..., "floors": [...] }`.
  - Includes MacMillan variants (Coal Tower II, Groaning Storehouse II, Ironworks II, Shelter Woods II, Suffocation Pit II).
- `backend/app/seeds/data/content/maps/hens.json`:
  - 53 original maps from git `HEAD` prior to layout changes.
  - `source_id: 1` (references `map_sources` where `code = "hens333"`).
  - IDs: `201` to `253` (shifted to avoid PK collisions with LemonDBD maps).
  - `layout: null`, pointing to `callout_image_url` and `callout_image_local_path`.
- Delete the monolithic `backend/app/seeds/data/content/maps.json`.

### 2.2 Seeder & Import Mechanism
- `backend/app/seeds/static_db_seeder.py`:
  - Scans `content/**/*.json` recursively. Both `maps/lemondbd.json` and `maps/hens.json` carry `"target": "maps"`, so `combined_data["maps"]` aggregates all 111 maps.
- `backend/app/services/db/import_content.py` (`_import_maps`):
  - Primary lookup: by `id` (row PK).
  - Secondary fallback lookup: `where(MapRealm.name == name, MapRealm.source_id == source_id)` instead of name-only, preventing cross-source overwrites when upserting.
- Database queries (`backend/app/services/maps/queries.py`):
  - `GET /api/v1/maps?source=lemondbd` joins `map_sources` on `MapRealm.source_id == MapSource.id` and filters by `code == 'lemondbd'`. Returns the 58 vector maps.
  - `GET /api/v1/maps?source=hens333` returns the 53 Hens maps.

---

## 3. Frontend UI Architecture & Source Toggle

### 3.1 State Management
- In `frontend/src/components/maps/MapsClient.tsx`:
  - Persist source choice with `usePersistentString<'lemondbd' | 'hens333'>('lemondbd_maps_source', 'lemondbd')`.
  - Pass `currentSource` down to `MapExplorer` and `VoiceCommandBanner`.

### 3.2 UI Controls
- **Text Search Mode (`MapExplorer.tsx`)**:
  - Add a `SegmentedControl` in the explorer search/filter header allowing the user to select between:
    - `LemonDBD` (icon: `Layout` or custom vector icon, label: "LemonDBD")
    * `Hens333` (icon: `Image`, label: "Hens333")
  - Toggling updates `mapSource`, refetching/re-filtering maps via `useMapExplorerData({ source: mapSource })`.
- **Voice Search Mode (`VoiceBannerHeader.tsx`)**:
  - Re-enable the interactive `SegmentedControl` in the header on desktop and mobile.
  - `onSourceChange` triggers `setMapSource`, syncing text and voice state.
  - Spoken map matches prioritize the currently selected `mapSource`.
- **Fullscreen Viewer (`FullscreenMapEngine.tsx`)**:
  - Automatically adapts:
    - If active map has `layout`: renders `MapLayoutView` with grid, floor switcher, pan/zoom, and scale bar.
    - If active map has no layout (`hens333`): renders high-resolution WebP image with pan/zoom.

---

## 4. Landmark Abbreviations & Map Legend

### 4.1 Landmark Dictionary
The short codes present in `layout.floors[].landmarks` will be mapped to canonical DBD terminology and localized in `frontend/src/locales/{en,de,es,ja,pl}/maps.ts`:

| Code | Canonical Feature Name | Realm / Map Context |
| :--- | :--- | :--- |
| `C|H` | Cow Tree / Harvester | Coldwind Farm (Rotten Fields, Thompson House) |
| `H/FB`| House / Fall Building | Springwood (Badham Preschool I–V) |
| `WT` | Water Tower | The MacMillan Estate |
| `CT` | Courtyard | Midwich Elementary School |
| `GARDEN` | Gazebo Garden | Disturbed Ward |
| `STATUE` | Town Statue | Greenville Square |
| `H` | High Ground / Hill | Mount Ormond Resort |
| `T` | Mine Tower | Ormond Lake Mine |
| `P` | Pagoda / Platform | Yamaoka Estate / Dead Dawg Saloon |
| `UFO`| Crashed Shuttle | Nostromo Wreckage |

### 4.2 Interactive Legend Component & Tooltips
1. **Tooltips on SVG**:
   - In `frontend/src/components/maps/MapLandmarks.tsx`, `<title>` tags render formatted strings:
     - Main building: `Main Building`
     - Shack: `Killer Shack`
     - Feature: `[Code] — [Localized Canonical Name]` (e.g. `C|H — Cow Tree / Harvester`).
2. **Fullscreen Viewer Legend**:
   - In `frontend/src/components/maps/FullscreenMapEngine.tsx`, add a `Legend` (`Info` or `HelpCircle`) button to the top toolbar.
   - When opened, a semi-transparent floating panel appears in the viewer showing:
     - Core landmarks: Main Building icon, Killer Shack icon, 12-Clock ray directions.
     - Active floor feature codes: Filtered list showing only the codes found on the active floor with their full names.

---

## 5. Testing & Verification

1. **Backend Tests**:
   - Update `backend/tests/unit/test_map_layouts_seed.py` to point to `content/maps/lemondbd.json`.
   - Update `backend/tests/unit/models/test_map_models.py` to test both `hens.json` and `lemondbd.json`.
   - Run `.\.venv\Scripts\pytest backend/tests/unit/`.
2. **Frontend Tests**:
   - Update `frontend/src/__tests__/unit/mapLayout.test.ts` and `voiceClientModel.test.ts` to verify source switching and legend dictionary resolution.
   - Run `npm run test:unit --prefix frontend`.

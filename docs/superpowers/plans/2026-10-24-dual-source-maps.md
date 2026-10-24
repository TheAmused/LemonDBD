# Dual-Source Maps, UI Toggle & Landmark Legend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide two distinct map seed files (`maps/lemondbd.json` with vector layouts and `maps/hens.json` with original Hens callouts), an interactive toggle between them on the Maps page, and a localized Map Legend explaining competitive landmark codes like `C|H` and `WT`.

**Architecture:** The static database seeder aggregates both `maps/lemondbd.json` (IDs 1–58, `source_id: 2`) and `maps/hens.json` (IDs 201–253, `source_id: 1`). The frontend manages persistent `mapSource` state, passing it to `MapExplorer` and `VoiceCommandBanner`. The map renderer dynamically displays either vector layouts with ray-marched clock callouts and an active Map Legend drawer, or static Hens333 images.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Backend Seed & Storage"
        L[maps/lemondbd.json<br/>IDs 1-58, source_id: 2] --> S[static_db_seeder.py]
        H[maps/hens.json<br/>IDs 201-253, source_id: 1] --> S
        S --> DB[(map_realms table)]
        DB --> API[/api/v1/maps?source=...]
    end

    subgraph "Frontend Client"
        MC[MapsClient.tsx<br/>persistent mapSource state] --> ME[MapExplorer.tsx<br/>Text Source Switcher]
        MC --> VB[VoiceBannerHeader.tsx<br/>Voice Source Switcher]
        ME --> Hook[useMapExplorerData]
        Hook --> API
        ME --> FME[FullscreenMapEngine.tsx]
        FME --> MLV[MapLayoutView.tsx<br/>vector or image fallback]
        MLV --> MLM[MapLandmarks.tsx<br/>rich tooltips]
        FME --> LEG[Map Legend Drawer<br/>active landmark definitions]
    end
```

**Tech Stack:** Python 3.12, Flask, SQLAlchemy, Alembic, Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React.

## Global Constraints
- Backend map sources must be distinct: `source_id: 1` (`hens333`), `source_id: 2` (`lemondbd`).
- IDs: `1-58` for LemonDBD maps, `201-253` for Hens maps. No primary key collisions.
- No `maps.json` in the content root; only `content/maps/*.json`.
- All competitive feature landmark codes (`C|H`, `WT`, `H/FB`, `CT`, `GARDEN`, `STATUE`, `H`, `T`, `P`, `UFO`) must have localized canonical names across all 5 languages (`en`, `de`, `es`, `ja`, `pl`).

---

### Task 1: Create Split Seed Files and Update Import Logic

**Files:**
- Create: `backend/app/seeds/data/content/maps/lemondbd.json`
- Create: `backend/app/seeds/data/content/maps/hens.json`
- Delete: `backend/app/seeds/data/content/maps.json`
- Modify: `backend/app/services/db/import_content.py:270-310`

**Interfaces:**
- Produces: `content/maps/lemondbd.json` (58 maps, IDs 1-58, source_id 2)
- Produces: `content/maps/hens.json` (53 maps, IDs 201-253, source_id 1)
- Consumes: `static_db_seeder.py` recursive json reader

- [ ] **Step 1: Create `backend/app/seeds/data/content/maps/lemondbd.json`**
Copy the current unstaged `maps.json` (58 maps with layouts and source_id 2) into `backend/app/seeds/data/content/maps/lemondbd.json`.

- [ ] **Step 2: Generate `backend/app/seeds/data/content/maps/hens.json` from git HEAD**
Extract `maps.json` from git `HEAD` (53 maps with source_id 1), reassign IDs `1..53` to `201..253`, and write to `backend/app/seeds/data/content/maps/hens.json`.

- [ ] **Step 3: Remove the old `backend/app/seeds/data/content/maps.json`**
Delete `backend/app/seeds/data/content/maps.json` to prevent duplicated map loading.

- [ ] **Step 4: Update `import_content.py` map lookup logic**
Modify `_import_maps` in `backend/app/services/db/import_content.py` so secondary lookup matches both `name` and `source_id`:
```python
map_obj = db.session.scalar(
    select(MapRealm).where(
        MapRealm.name == name,
        MapRealm.source_id == mdata.get("source_id"),
    )
)
```

- [ ] **Step 5: Verify seeder loading**
Run a test python script in `.venv` to verify `load_static_seed_payload()` finds 111 maps in total with no duplicate IDs.

- [ ] **Step 6: Commit**
```bash
git add backend/app/seeds/data/content/maps/ backend/app/services/db/import_content.py
git commit -m "feat(maps): split seed data into maps/lemondbd.json and maps/hens.json"
```

---

### Task 2: Backend Unit Tests & Path References

**Files:**
- Modify: `backend/tests/unit/test_map_layouts_seed.py`
- Modify: `backend/tests/unit/models/test_map_models.py`
- Modify: `backend/tests/unit/routes/test_map_routes.py`

**Interfaces:**
- Consumes: `content/maps/lemondbd.json` and `content/maps/hens.json`

- [ ] **Step 1: Update `test_map_layouts_seed.py`**
Change `SEED` path from `content/maps.json` to `content/maps/lemondbd.json`. Verify all area tests, geometry checks, and landmark containment tests pass.

- [ ] **Step 2: Update `test_map_models.py`**
Update references to `maps.json` to read both `content/maps/lemondbd.json` and `content/maps/hens.json`.

- [ ] **Step 3: Run backend unit tests**
Run: `.\.venv\Scripts\pytest backend/tests/unit/test_map_layouts_seed.py backend/tests/unit/models/test_map_models.py`
Expected: PASS with 100% success.

- [ ] **Step 4: Commit**
```bash
git add backend/tests/unit/test_map_layouts_seed.py backend/tests/unit/models/test_map_models.py
git commit -m "test(maps): update backend map seed tests for dual file structure"
```

---

### Task 3: Landmark Definitions & Multi-Language Localization

**Files:**
- Create: `frontend/src/utils/mapLandmarkLabels.ts`
- Modify: `frontend/src/locales/en/maps.ts`
- Modify: `frontend/src/locales/de/maps.ts`
- Modify: `frontend/src/locales/es/maps.ts`
- Modify: `frontend/src/locales/ja/maps.ts`
- Modify: `frontend/src/locales/pl/maps.ts`
- Modify: `frontend/src/types/map.ts`

**Interfaces:**
- Produces: `getLandmarkName(label: string, dict: Dictionary): string`
- Produces: `LANDMARK_CODES: readonly string[]`

- [ ] **Step 1: Add landmark definition keys to all 5 locale files**
Add translations for:
- `landmarkCowTreeHarvester` ("Cow Tree / Harvester" / "Kuhbaum / Mähdrescher" / "Árbol de Vacas / Cosechadora" / "カウツリー / ハーベスター" / "Krowie Drzewo / Kombajn")
- `landmarkHouseFallBuilding` ("House / Fall Building")
- `landmarkWaterTower` ("Water Tower" / "Wasserturm" / "Torre de Agua" / "給水塔" / "Wieża Ciśnień")
- `landmarkCourtyard` ("Courtyard" / "Innenhof" / "Patio" / "中庭" / "Dziedziniec")
- `landmarkGarden` ("Gazebo Garden" / "Pavillon-Garten" / "Jardín del Gazebo" / "ガゼボ庭園" / "Ogród z Altaną")
- `landmarkStatue` ("Town Statue" / "Stadtstatue" / "Estatua" / "町の像" / "Pomnik")
- `landmarkHill` ("High Ground / Hill" / "Hügel" / "Colina" / "丘" / "Wzgórze")
- `landmarkTower` ("Mine Tower" / "Minenturm" / "Torre de la Mina" / "鉱山タワー" / "Wieża Kopalniana")
- `landmarkPagoda` ("Pagoda / Platform" / "Pagode / Plattform" / "Pagoda / Plataforma" / "仏塔 / プラットフォーム" / "Pagoda / Podest")
- `landmarkShuttle` ("Crashed Shuttle" / "Abstürzendes Shuttle" / "Lanzadera Estrellada" / "墜落したシャトル" / "Rozbity Prom")
- `legendTitle` ("Map Legend")
- `legendToggleAria` ("Toggle Map Legend")

- [ ] **Step 2: Create `frontend/src/utils/mapLandmarkLabels.ts`**
Export a mapping function `getFeatureLandmarkName(code: string, dict: any): string` that maps competitive codes (`C|H`, `WT`, `H/FB`, `CT`, `GARDEN`, `STATUE`, `H`, `T`, `P`, `UFO`) to localized strings.

- [ ] **Step 3: Run unit tests**
Run: `npm run test:unit --prefix frontend -- src/__tests__/unit/mapLayout.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add frontend/src/locales/ frontend/src/utils/mapLandmarkLabels.ts
git commit -m "feat(maps): add landmark code definitions and multi-language translations"
```

---

### Task 4: Interactive Map Legend & SVG Landmark Tooltips

**Files:**
- Modify: `frontend/src/components/maps/MapLandmarks.tsx`
- Create: `frontend/src/components/maps/MapLegend.tsx`
- Modify: `frontend/src/components/maps/FullscreenMapEngine.tsx`

**Interfaces:**
- Consumes: `getFeatureLandmarkName` from `mapLandmarkLabels.ts`
- Produces: `<MapLegend landmarks={landmarks} />`
- Produces: Rich `<title>` tooltips in SVG `<MapLandmarks />`

- [ ] **Step 1: Enhance `MapLandmarks.tsx` tooltips**
Format `<title>` elements as `"${lm.label} — ${fullName}"` for features, and localized `Main Building` / `Killer Shack` for structures.

- [ ] **Step 2: Create `MapLegend.tsx` component**
Render a compact, floating/collapsible legend displaying:
- Main Building icon + label
- Killer Shack icon + label
- 12-Clock callout compass explanation
- Floor-specific active feature chips (e.g. `C|H` -> Cow Tree / Harvester)

- [ ] **Step 3: Integrate `MapLegend` in `FullscreenMapEngine.tsx`**
Add an `Info` legend toggle button in the top action bar next to the zoom and floor buttons. When open, show the `MapLegend` overlay in the corner.

- [ ] **Step 4: Run frontend tests**
Run: `npm run test:unit --prefix frontend -- src/__tests__/unit/mapLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/maps/MapLandmarks.tsx frontend/src/components/maps/MapLegend.tsx frontend/src/components/maps/FullscreenMapEngine.tsx
git commit -m "feat(maps): add interactive map legend overlay and enhanced SVG tooltips"
```

---

### Task 5: Maps Page Source Toggle in Text & Voice Modes

**Files:**
- Modify: `frontend/src/components/maps/MapsClient.tsx`
- Modify: `frontend/src/components/maps/MapExplorer.tsx`
- Modify: `frontend/src/components/maps/voice/VoiceBannerHeader.tsx`
- Modify: `frontend/src/components/maps/VoiceCommandBanner.tsx`
- Modify: `frontend/src/hooks/useMapExplorerData.ts`
- Modify: `frontend/src/services/mapApi.ts`

**Interfaces:**
- Produces: `currentSource: 'lemondbd' | 'hens333'` state in `MapsClient`
- Produces: `SegmentedControl` in `MapExplorer` toolbar
- Produces: Restored interactive `SegmentedControl` in `VoiceBannerHeader`

- [ ] **Step 1: Update `useMapExplorerData.ts`**
Add `source?: 'lemondbd' | 'hens333'` to `UseMapExplorerDataOptions`. When `source` changes, invalidate and query `fetchMaps(undefined, '', source, locale)`.

- [ ] **Step 2: Update `MapsClient.tsx`**
Initialize persistent `mapSource` state via `usePersistentString<'lemondbd' | 'hens333'>('lemondbd_maps_source', 'lemondbd')`. Pass `source={mapSource}` and `onSourceChange={setMapSource}` to `MapExplorer` and `VoiceCommandBanner`.

- [ ] **Step 3: Add Source Switcher to `MapExplorer.tsx`**
Render a `SegmentedControl` in the search header for desktop and mobile, with options for `LemonDBD` (vector) and `Hens333` (raster).

- [ ] **Step 4: Restore interactive switcher in `VoiceBannerHeader.tsx`**
Wire `SegmentedControl` so selecting `Hens333` or `LemonDBD` calls `onSourceChange`.

- [ ] **Step 5: Run tests**
Run: `npm run test:unit --prefix frontend -- src/__tests__/unit/voiceClientModel.test.ts src/__tests__/unit/mapLayout.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add frontend/src/components/maps/MapsClient.tsx frontend/src/components/maps/MapExplorer.tsx frontend/src/components/maps/voice/VoiceBannerHeader.tsx frontend/src/components/maps/VoiceCommandBanner.tsx frontend/src/hooks/useMapExplorerData.ts
git commit -m "feat(maps): add interactive source toggle to text and voice explorer views"
```

---

### Task 6: Comprehensive Verification & Test Suite

**Files:**
- Modify: `frontend/src/__tests__/unit/mapLayout.test.ts`
- Modify: `frontend/src/__tests__/unit/voiceClientModel.test.ts`

- [ ] **Step 1: Add legend and source toggle unit tests**
In `mapLayout.test.ts`:
- Test `getFeatureLandmarkName` for all competitive codes.
- Test rendering of `MapLegend` with various floor landmark collections.
- Test fallback behavior when map lacks `layout` (Hens map rendered with `<img>`).

- [ ] **Step 2: Run all backend unit tests**
Run: `.\.venv\Scripts\pytest backend/tests/unit/test_map_layouts_seed.py backend/tests/unit/models/test_map_models.py`
Expected: PASS (16+ passed)

- [ ] **Step 3: Run all frontend unit tests**
Run: `npm run test:unit --prefix frontend`
Expected: PASS (all 1564+ tests passing, 0 failing)

- [ ] **Step 4: Commit**
```bash
git add frontend/src/__tests__/unit/mapLayout.test.ts frontend/src/__tests__/unit/voiceClientModel.test.ts
git commit -m "test(maps): verify dual-source switching, legend rendering, and fallback behavior"
```

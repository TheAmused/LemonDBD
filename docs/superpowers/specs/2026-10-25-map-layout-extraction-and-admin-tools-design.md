# Design Document: Map Layout Extraction, WebP Generator, Admin Vector Test & Admin Settings Drawers

- **Date**: 2026-10-25
- **Status**: Approved
- **Branch**: `feature/search`

---

## 1. Overview & Goals

This project fulfills four key operational and user-experience objectives:
1. **Decouple Vector Layout Footprints**: Extract large vector SVG footprints out of the primary `map_realms` table and `lemondbd.json` map objects into a dedicated 1:1 database table `map_layouts` with foreign key `map_id` referencing `map_realms.id`, seeded from `backend/app/seeds/data/content/map_layouts.json`. Public `/api/v1/maps` responses stay lightweight and fast.
2. **Pre-rendered WebP Map Generator**: Implement a Python generator script (`backend/scripts/generate_map_images.py`) utilizing Pillow to render 8m grid squares, 16m game tiles, floor outlines, landmarks, and 1–12 clock callouts into standalone `.webp` tactical map images stored at `backend/app/static/maps/callouts/lemondbd/<realm_slug>/<map_slug>.webp`.
3. **Unified Public Map Viewer & Admin Vector Test Tool**:
   - For regular users on the public `/maps` page: Clicking any map (whether Hens333 or LemonDBD) opens the identical stable pan-and-zoom image viewer on the `.webp` image.
   - For administrators: The interactive vector SVG engine (`MapLayoutView`, multi-floor switcher, interactive `MapLegend`) is housed in an Admin Test modal under **Admin Panel -> Tools tab -> Tests section** (`ToolCard id="testing"`).
4. **Admin Settings Collapsible Drawers**: Refactor `AdminSettingsSection.tsx` so each of the 10 setting groups is rendered inside an `AccordionSection` with persistent open/close state (`usePersistentDrawer`), identical to `ToolCard` in `AdminToolsSection.tsx`, with a badge indicating any unsaved changes per drawer.

---

## 2. Architecture & Database Design

### 2.1 Database Schema (`map_layouts`)
A dedicated table decouples vector footprint blobs from core map records while maintaining relational integrity.

```sql
CREATE TABLE map_layouts (
    id SERIAL PRIMARY KEY,
    map_id INTEGER NOT NULL UNIQUE REFERENCES map_realms(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_map_layouts_map_id ON map_layouts(map_id);
```

- In SQLite (used in local development and unit tests), `JSONB` uses SQLAlchemy's `.with_variant(JSON(), "sqlite")`.
- `MapRealm` drops the `layout` column via Alembic migration `0031_extract_map_layouts.py`.
- Relationship in `MapRealm`:
  ```python
  layout_record: Mapped["MapLayout | None"] = relationship(
      "MapLayout",
      back_populates="map",
      uselist=False,
      cascade="all, delete-orphan",
  )
  ```

### 2.2 Seed Data Structure
- `backend/app/seeds/data/content/maps/lemondbd.json`:
  - Contains core map attributes: `id`, `name`, `realm_id`, `source_id: 2`, `callout_image_local_path`, `size_sq_tiles`, etc.
  - The `"layout"` key is removed.
- `backend/app/seeds/data/content/map_layouts.json`:
  - Array of layout records:
    ```json
    [
      {
        "map_id": 1,
        "version": 1,
        "layout_data": {
          "cell_m": 8,
          "width_m": 128,
          "height_m": 128,
          "approx": false,
          "floors": [...]
        }
      }
    ]
    ```
- `backend/app/seeds/import_content.py` and `backend/app/seeds/export_writer.py` are updated to import and export `map_layouts` during database initialization and backup operations.

### 2.3 Backend API Endpoints
- **Public Maps**:
  - `GET /api/v1/maps`: Returns lean `MapRealmResponse` records (without layout bloat).
- **Admin Layout API**:
  - `GET /api/v1/admin/maps/{map_id}/layout`: Admin-only endpoint returning `{ "map_id": map_id, "layout": layout_data }`.
  - Alternatively: `GET /api/v1/maps/{map_id}/layout` returning layout on demand for any tool/client requiring on-demand vector footprint inspection.

---

## 3. WebP Image Generation Pipeline

### 3.1 Generation Script (`backend/scripts/generate_map_images.py`)
- Reads layout definitions from `backend/app/seeds/data/content/map_layouts.json` and map metadata from `backend/app/seeds/data/content/maps/lemondbd.json`.
- Uses Pillow (`PIL.Image`, `PIL.ImageDraw`, `PIL.ImageFont`).
- Canvas size: High resolution (e.g. 1024x1024 or proportional to `width_m`/`height_m`).
- Rendering layers:
  1. **Background**: Dark tactical theme `#0f1117` with subtle outer margin.
  2. **Playable Area**: Filled with floor base tone (`#181c27`).
  3. **8m Grid Squares**: Light grid lines (`#282e3f`) matching in-game DbD tile grid.
  4. **16m Major Tiles**: Bolder grid lines.
  5. **Floor Outline & Walls**: Crisp high-contrast border paths (`#4b5563` / `#6366f1`).
  6. **1–12 Clock Callouts**:
     - 12 tactical clock positions calculated around the center `(cx, cy)` at the perimeter.
     - Circular badges with numbers 1 through 12, styled with high contrast (`#f59e0b` / white text on dark background).
  7. **Landmarks**:
     - Killer Shack: Marked with distinctive tactical icon/badge `"SHACK"`.
     - Main Building: Marked with `"MAIN"`.
     - Named landmark features (Hills, Crane, Gazebo, etc.) labeled clearly.
- Output file path:
  `backend/app/static/maps/callouts/lemondbd/<realm_slug>/<map_slug>.webp`
- Script options:
  - `--all`: Renders all LemonDBD maps.
  - `--map <id_or_slug>`: Renders a single map.
- Map records in `lemondbd.json` set `callout_image_local_path = "maps/callouts/lemondbd/<realm_slug>/<map_slug>.webp"`.

---

## 4. Frontend Experience: Public Map Viewer vs Admin Test

### 4.1 Public `/maps` Experience
- Both Hens333 and LemonDBD maps use the exact same image-based viewer:
  - `MapCard.tsx`: Displays the `.webp` thumbnail (`imageSrc` from `callout_image_local_path`).
  - `FullscreenMapEngine.tsx`: Displays the fullview `.webp` image with interactive pan, zoom, reset, and map details sidebar.
  - Performance is instantaneous; no heavy SVG rendering on the public explorer.

### 4.2 Admin Tools Vector Test Modal
- Location: **Admin Panel -> Tools tab -> Tests section** (`ToolCard id="testing"`).
- New row:
  - Title: `Vector Map Layout Engine` (`t.vectorMapTest` in admin locales)
  - Description: `Inspect interactive SVG vector layouts, multi-floor plans, and landmark legends.` (`t.vectorMapTestDesc`)
  - Action button: `Open Test` (`t.openTest`)
- Modal Component: `VectorMapTestModal.tsx`:
  - Map Selector: Dropdown allowing admin to select any LemonDBD map.
  - Layout Fetcher: Queries `GET /api/v1/maps/{id}/layout` on map selection.
  - Renders `MapLayoutView`: Scalable vector rendering with grid, landmarks, and floor selector.
  - Renders `MapLegend`: Interactive toggleable landmark legend explaining all callout acronyms and symbols.

---

## 5. Admin Settings Collapsible Drawers

### 5.1 Drawer Architecture in `AdminSettingsSection.tsx`
- Refactor the flat list of 10 setting groups (`SETTING_GROUP_ORDER`: `notices`, `access`, `links`, `limits`, `tokens`, `integrations`, `moderation`, `bug_reports`, `retention`, `privacy`).
- Each group is wrapped in an `AccordionSection`:
  - Hook: `const [open, toggle] = usePersistentDrawer(`admin_settings_${group}`, true);`
  - Header:
    - Left: Icon (`IconTile`), Group Title (`configGroup_<group>`), and Subtitle (`configGroupDesc_<group>`).
    - Right: Unsaved changes indicator badge (e.g. `<Badge tone="amber">{dirtyCount} unsaved</Badge>` if any settings in this drawer are dirty).
  - Body: Settings form controls for the group.
- Preserves the sticky save/discard footer at the bottom of the page.

---

## 6. Internationalization (i18n)
Add dictionary entries across all 5 supported locales (`en`, `de`, `es`, `ja`, `pl`):
- `admin.vectorMapTest`: "Vector Map Layout Engine"
- `admin.vectorMapTestDesc`: "Inspect interactive SVG vector layouts, multi-floor plans, and landmark legends."
- `admin.vectorMapSelect`: "Select map"
- `admin.vectorMapNoLayout`: "No vector layout footprint available for this map."

---

## 7. Verification & Testing Plan

1. **Backend Database & Model Verification**:
   - Run Alembic migration `0031_extract_map_layouts.py`.
   - Verify `MapLayout` model creation, foreign key cascade delete, and JSON/JSONB serialization.
   - Run `pytest backend/tests/` to verify content import/export and API endpoints.
2. **WebP Image Generation Verification**:
   - Run `python backend/scripts/generate_map_images.py`.
   - Verify generated `.webp` files are saved in `backend/app/static/maps/callouts/lemondbd/` and valid images.
3. **Frontend Admin Settings Drawers Verification**:
   - Navigate to `/admin` -> Settings tab.
   - Verify 10 accordion drawers collapse and expand independently.
   - Verify persistence across page reload via `localStorage`.
   - Verify unsaved badge appears on the drawer header when inputs change.
4. **Admin Vector Test Tool Verification**:
   - Navigate to `/admin` -> Tools tab -> Tests section.
   - Click "Open Test" on Vector Map Layout Engine.
   - Select maps from the dropdown, switch floors, inspect SVG layout and toggle legend.
5. **Public `/maps` Verification**:
   - Navigate to `/maps`.
   - Toggle LemonDBD vs Hens. Click a map to verify both open the fullview image viewer with `.webp` images.
6. **Code Quality & Linting**:
   - `npm run lint`
   - `npm run check:styles`
   - `npm run check:typography`
   - `npm run typecheck`
   - `npm run test:unit`

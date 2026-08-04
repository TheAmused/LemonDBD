# Fullscreen Interactive Realm Maps & Tile/Pallet Explorer Design Specification

## 1. Executive Summary
This design specification defines the architecture, data models, canvas engine, and UI components for the **Fullscreen Interactive Realm Maps & Tile/Pallet Explorer** in LemonDBD. It provides a 100vw x 100vh pan-zoom map canvas with interactive icons for Pallets (with God/Safe/Mindgameable/Unsafe safety ratings), Windows, Totems, Generators, Hatch, Exit Gates, and Tile Structures (Shack, Main Building, Jungle Gyms, LT Walls), complete with seed variant switching and a rich looping inspector drawer.

---

## 2. System Architecture & Data Model

### 2.1 Database Location
- SQLite Database: `backend/data/lemon_dbd.db`

### 2.2 Relational Schema (`map_realms`, `map_tiles`, `map_objectives`)

```sql
CREATE TABLE IF NOT EXISTS map_realms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    realm TEXT NOT NULL,
    layout_type TEXT NOT NULL,
    pallet_density TEXT NOT NULL,
    totem_spawns_count INTEGER NOT NULL DEFAULT 5,
    shack_has_basement BOOLEAN NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS map_tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    tile_name TEXT NOT NULL,
    tile_type TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    has_pallet BOOLEAN NOT NULL DEFAULT 0,
    pallet_safety_rating TEXT CHECK (pallet_safety_rating IN ('god', 'safe', 'mindgameable', 'unsafe')),
    has_window BOOLEAN NOT NULL DEFAULT 0,
    vault_direction TEXT,
    looping_tips TEXT,
    mindgame_counter TEXT,
    FOREIGN KEY (map_id) REFERENCES map_realms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    type TEXT NOT NULL CHECK (type IN ('totem', 'generator', 'exit_gate', 'hatch', 'chest', 'basement')),
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    location_name TEXT NOT NULL,
    FOREIGN KEY (map_id) REFERENCES map_realms(id) ON DELETE CASCADE
);
```

---

## 3. Fullscreen Pan-Zoom Canvas & Controls

### 3.1 Viewport Container
- `100vw x 100vh` fullscreen overlay (`fixed inset-0 z-50 bg-slate-950`).
- Mouse drag & touch drag panning.
- Mouse scroll wheel & pinch-to-zoom scaling (10% to 500%).
- Top floating toolbar: Zoom In, Zoom Out, Reset Center, Seed Variant Selector (`Seed A`, `Seed B`, `Seed C`), Floor Switcher (`Floor 1`, `Floor 2`), and Exit Fullscreen.

### 3.2 Floating Layer Filter Toolbar
Toggleable layer buttons:
- 🪵 **Pallets Layer**: Renders pallets with color-coded safety rings.
- 🪟 **Windows Layer**: Renders vault windows and direction arrows.
- 💀 **Totems Layer**: Renders 5 Totem spawn locations.
- ⚡ **Generators Layer**: Renders 7 Generator spawn points.
- 🚪 **Gates & Hatch Layer**: Renders 2 Exit Gates, Hatch spawn, and Chests.
- 🧱 **Tiles Layer**: Renders Killer Shack, Main Building, Jungle Gyms, LT Walls, 4-Walls.
- 📢 **Callouts Layer**: Renders competitive callout text labels.

---

## 4. Rich Looping & Pallet Safety Inspector Drawer

Clicking any icon on the map opens a right-side drawer containing:
- **Pallet Safety Badge**:
  - 🟩 **God Pallet**: Must be broken by killer; cannot be mindgamed.
  - 🟦 **Safe Pallet**: High survivor safety margin.
  - 🟨 **Mindgameable Pallet**: 50/50 mindgame potential.
  - 🟥 **Unsafe / Death Trap**: High risk for survivor to drop.
- **Vault Direction Guide**: Fast Vault vs Medium Vault angle warnings.
- **Survivor Looping Pathing Tips**: Optimum loop tightness and tile-chaining routes.
- **Killer Counterplay Strategy**: Red stain hiding, moonwalking, and power usage tips.

---

## 5. REST API Specifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/maps` | List all available map realms |
| `GET` | `/api/v1/maps/<map_id>` | Get map specs, tiles, pallets, windows, and objectives for specified seed & floor |

---

## 6. Verification & Testing

- Backend unit tests for `MapService` queries, seed filters, tile coordinates, and pallet safety attributes.
- Frontend TypeScript & Next.js production build verification.

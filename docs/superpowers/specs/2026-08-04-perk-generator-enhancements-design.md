# Perk Generator SQLite Integration & No-Repeat System Design Specification

## 1. Executive Summary
This feature enhances the LemonDBD **Perk Generator** by replacing client-only `localStorage` reliance with persistent SQLite database storage, introducing a **No-Repeating Perks** mode with a one-click pool reset feature, and optimizing workspace ignore files (`.gitignore`, `backend/.dockerignore`, `frontend/.dockerignore`).

---

## 2. SQLite Database Model

### 2.1 Schema Additions (`backend/data/lemon_dbd.db`)

```sql
-- Single-row generator configuration
CREATE TABLE IF NOT EXISTS generator_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    role TEXT NOT NULL DEFAULT 'Survivor',
    gen_mode TEXT NOT NULL DEFAULT 'instant',
    no_repeat_perks BOOLEAN NOT NULL DEFAULT 1,
    total_pages INTEGER NOT NULL DEFAULT 12,
    perks_per_page INTEGER NOT NULL DEFAULT 15,
    last_page_perks INTEGER NOT NULL DEFAULT 8,
    spin_duration_sec REAL NOT NULL DEFAULT 3.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drawn perks memory pool per role
CREATE TABLE IF NOT EXISTS generator_drawn_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    perk_name TEXT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, perk_name)
);
```

---

## 3. REST API Specification (`/api/v1/generator/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/generator/config` | Read active generator settings and drawn perk counts |
| `POST` | `/api/v1/generator/config` | Update generator configurations (role, mode, no_repeat, page settings) |
| `GET` | `/api/v1/generator/drawn` | List drawn perk names for active role |
| `POST` | `/api/v1/generator/draw` | Mark specific perks as drawn in SQLite |
| `POST` | `/api/v1/generator/reset` | Clear all drawn perks for role (or both), resetting pool |

---

## 4. Frontend UI Enhancements (`frontend/src/components/PerkGenerator.tsx`)

1. **No-Repeat Perks Toggle**:
   - Toggle switch: **"No Repeating Perks" [ ON / OFF ]**.
   - When enabled, drawn perks are excluded from subsequent rolls until reset.

2. **Drawn Perks Counter & Pool Reset**:
   - Badge displaying: `Used Perks: 12 / 120 (108 Available)`.
   - **"Reset Used Perks" Button (Emerald / Amber)**: Clears drawn perk memory in SQLite with instant UI feedback.

3. **Database Configuration Sync**:
   - Generator settings (pages, perks per page, spin duration, mode) auto-save to SQLite DB.

---

## 5. Ignore Files Optimization (`.gitignore` & `.dockerignore`)

- Include all SQLite database files (`*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`) across backend and tests.
- Exclude test artifacts, `.pytest_cache`, `.superpowers/`, `.next/`, `node_modules/`, `dist/`, `out/`, `*.tsbuildinfo`.

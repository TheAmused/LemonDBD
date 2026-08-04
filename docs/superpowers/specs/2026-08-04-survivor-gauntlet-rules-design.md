# The Survivor Gauntlet & Dynamic Stats Design Specification

## 1. Executive Summary
This design specification details the implementation of **The Survivor Gauntlet** rules engine, progressive tier loadout restrictions (from 4 perks down to 0 perks), character pool exclusion configuration (unowned DLC management), match exception handling (DC before 5 gens / loading cancel), and full mobile/responsive dynamic statistics dashboard in LemonDBD.

---

## 2. Progressive Perk Tier Matrix

The Gauntlet progression adapts the maximum allowed perk count and mandatory teachable requirement based on current tier checkpoint depth:

| Tier Level | Tier Name | Perk Limit | Perk Requirement Rules |
| :--- | :--- | :--- | :--- |
| **Tier 0** (Checkpoint 0) | *The Warm Up* | **4 Perks** | Must include at least 1 character teachable perk |
| **Tier 1** (Checkpoint 1) | *The Thinning* | **3 Perks** | Must include at least 1 character teachable perk |
| **Tier 2** (Checkpoint 2) | *The Struggle* | **2 Perks** | Must include at least 1 character teachable perk |
| **Tier 3** (Checkpoint 3) | *The Hardcore* | **1 Perk** | Must be a character teachable perk |
| **Tier 4** (Checkpoint 4) | *The Legend* | **0 Perks** | No Perks allowed (No-perk trial) |

---

## 3. Database Schema Enhancements (`backend/data/lemon_dbd.db`)

```sql
-- Extended character pool configurations (enabled/disabled owned DLCs)
CREATE TABLE IF NOT EXISTS character_pool_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    character_name TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    UNIQUE(role, character_name)
);

-- Exception log records for special match invalidations
CREATE TABLE IF NOT EXISTS match_exceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('dc_before_5_gens', 'game_cancelled')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES challenge_runs(id) ON DELETE CASCADE
);
```

---

## 4. Gauntlet Generator Algorithm Updates (`ChallengeService`)

1. **Active Tier Calculation**:
   - `tier_level = min(4, current_streak // checkpoint_interval)`
2. **Loadout Generator Rules per Tier**:
   - `Tier 0`: 1 Target Teachable + 3 Random Role Perks.
   - `Tier 1`: 1 Target Teachable + 2 Random Role Perks (4th slot empty/disabled).
   - `Tier 2`: 1 Target Teachable + 1 Random Role Perk (3rd & 4th slots empty/disabled).
   - `Tier 3`: 1 Target Teachable Perk only (all other slots disabled).
   - `Tier 4`: 0 Perks (All 4 perk slots disabled/empty for "The Legend" tier).
3. **Character Pool Filtering**:
   - Excludes characters set to `is_enabled = 0` in `character_pool_settings`.

---

## 5. Match Exceptions & Void Triggers

- **`DC Before 5 Gens` Button**: Invalidates current match outcome. Streak & completion status remain unchanged. Re-rolls loadout for the **same character**.
- **`Game Cancelled` Button**: Invalidates current match outcome due to player leaving during loading. Re-rolls loadout for the **same character**.

---

## 6. UI & Responsive Enhancements

1. **Gauntlet Rules & Guide Modal**: Interactive popup explaining Survivor Gauntlet rules, tier table, and exceptions.
2. **Tier Badge Indicator**: Visual badge showing active tier (e.g. `Tier 2: The Struggle (2 Perks Allowed)`).
3. **Character Pool Manager**: Modal allowing users to toggle checkboxes for owned vs unowned DLC Survivors/Killers.
4. **Mobile & Desktop Responsive Layout**: Card-based responsive grids (`grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6`), touch-friendly buttons, and responsive sidebars/drawers.

# Dead by Daylight Challenge & Win-Streak System Design Specification

## 1. Executive Summary
The **Dead by Daylight Challenge System** is an interactive, full-stack gauntlet and statistics engine integrated into LemonDBD. It enables players to select a role (Survivor or Killer), generate random character-specific challenge loadouts (4 perks + map offering) based on customizable perk selection rules, track consecutive win streaks, preserve progress via configurable milestone checkpoints, visual green-glow roster completion indicators, and review deep analytics powered by SQLite persistence.

---

## 2. System Architecture & Data Model

### 2.1 Database Location & Engine
The system uses SQLite 3 with WAL (Write-Ahead Logging) mode enabled for high concurrency and zero external server overhead.
- Database File: `backend/data/lemon_dbd.db`

### 2.2 Relational Schema

```sql
-- Single-row application settings and last-active options
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active_role TEXT NOT NULL DEFAULT 'survivor',
    checkpoint_interval INTEGER NOT NULL DEFAULT 3,
    win_condition_survivor TEXT NOT NULL DEFAULT 'escape',
    win_condition_killer TEXT NOT NULL DEFAULT '3k_plus',
    active_perk_rule_id INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_perk_rule_id) REFERENCES perk_rules(id) ON DELETE SET NULL
);

-- Customizable perk loadout recipes / slot rules
CREATE TABLE IF NOT EXISTS perk_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    slot1_type TEXT NOT NULL DEFAULT 'character_own',
    slot2_type TEXT NOT NULL DEFAULT 'character_own',
    slot3_type TEXT NOT NULL DEFAULT 'general_role',
    slot4_type TEXT NOT NULL DEFAULT 'any_role',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active challenge runs per role
CREATE TABLE IF NOT EXISTS challenge_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_character_id TEXT NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_characters_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_characters_json TEXT NOT NULL DEFAULT '[]',
    current_loadout_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match outcome log for statistics and history analytics
CREATE TABLE IF NOT EXISTS match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    character_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    map_offering TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES challenge_runs(id) ON DELETE CASCADE
);
```

---

## 3. Perk Engine & Challenge Roll Algorithm

### 3.1 Uncompleted Character Sampling
1. Query all characters matching `active_role` (`survivor` or `killer`).
2. Parse `completed_characters_json` from the active run.
3. Exclude completed characters from the pool.
4. If the pool is empty, trigger a **Roster Victory Event** (roster clear milestone achieved) and grant option to restart a prestige gauntlet.
5. Randomly sample 1 target character from the remaining pool.

### 3.2 Perk Slot Deduplication & Fallback Matrix
For the selected target character, inspect the 4 slot requirements from `active_perk_rule_id`:
- `character_own`: Query perks where `character == target_character.name`.
- `general_role`: Query perks where `character == 'All'` for the active role.
- `any_role`: Query all available perks for the active role.

**Deduplication Constraint**: No duplicate perk names within the 4 slots.
**Fallback Logic**: If a target character has fewer teachable perks than requested by `character_own` slots, the engine dynamically falls back to `general_role` perks to guarantee 4 unique valid perks.

### 3.3 Map Offering Sampler
Selects 1 map offering from a structured realm table (e.g. *MacMillan's Phormium*, *Autohaven Key*, *RPD Badge*, *Coldwind Wheat*, *Crow's Eye*, *Sacrificial Ward*).

---

## 4. Checkpoints & Progression Mechanics

### 4.1 Win Outcome (`result: "win"`)
1. Increment `current_streak` by +1.
2. Update `best_streak = max(best_streak, current_streak)`.
3. Append target character ID to `completed_characters_json` (turns portrait green in UI).
4. **Checkpoint Evaluation**: If `current_streak % checkpoint_interval == 0`:
   - Set `last_checkpoint_streak = current_streak`.
   - Snapshot `checkpoint_characters_json = completed_characters_json`.
5. Roll next target character & loadout.

### 4.2 Loss Outcome (`result: "loss"`)
1. Roll back `current_streak = last_checkpoint_streak`.
2. Roll back `completed_characters_json = checkpoint_characters_json` (strips green status from characters completed after the checkpoint).
3. Append outcome record to `match_logs`.
4. Roll next target character & loadout to retry from checkpoint.

---

## 5. REST API Endpoint Specifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/challenges/run` | Get active challenge run state & current loadout |
| `POST` | `/api/v1/challenges/roll` | Generate next target character, 4 perks, and map offering |
| `POST` | `/api/v1/challenges/result` | Submit Win/Loss match result, apply streak & checkpoint logic |
| `GET` | `/api/v1/challenges/settings` | Retrieve active user options & checkpoint configuration |
| `POST` | `/api/v1/challenges/settings` | Save user options & active checkpoint interval |
| `GET` | `/api/v1/challenges/perk-rules` | List available perk slot rules & presets |
| `POST` | `/api/v1/challenges/perk-rules` | Create or update custom perk slot recipe |
| `GET` | `/api/v1/challenges/stats` | Fetch win rates, best streaks, top perks, and match log history |

---

## 6. Frontend Components & User Interface

### 6.1 Components Hierarchy (`frontend/src/components/challenge/`)
- `ChallengeHeader.tsx`: Role toggle (Survivor / Killer), current streak badge, best score badge, checkpoint badge.
- `ActiveTargetStage.tsx`: Displays current target character portrait, 4 perk cards with icons & tooltips, map offering icon, and "WIN" / "LOSE" buttons.
- `CharacterRosterGrid.tsx`: Grid of all Survivors / Killers with 3 state visual styles:
  - **Completed**: Glowing green border (`border-emerald-500 shadow-emerald-500/30`), green tint, checkmark badge.
  - **Active Target**: Pulsing amber border (`animate-pulse border-amber-400`).
  - **Uncompleted**: Standard portrait styling.
- `PerkRuleConfigModal.tsx`: Visual editor for configuring Slot 1 through Slot 4 rules and saving presets.
- `ChallengeStatsDrawer.tsx`: Dashboard with win rate charts, top perks used in wins, and match history list.

---

## 7. Verification & Testing Strategy

1. **Database Integration Unit Tests**: Test SQLite initialization, schema migration, foreign key checks, and transaction rollbacks on loss.
2. **Perk Engine Tests**: Verify deduplication of 4 perk slots, rule parsing, and fallback mechanics when character-specific perks are scarce.
3. **Progression System Tests**: Test streak increments, checkpoint saving at specified intervals, and accurate roster rollback on loss.
4. **API Integration Tests**: Validate all `/api/v1/challenges/*` REST endpoints with Pytest.
5. **Frontend UI E2E Tests**: Verify portrait green glow styling, win/loss button state transitions, and persistent state reload.

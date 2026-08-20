# backend/app/services/db/raw_schema.py
import logging
import sqlite3

logger = logging.getLogger(__name__)

SQLITE_FALLBACK_DDL = """
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

CREATE TABLE IF NOT EXISTS gauntlet_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    game_mode TEXT NOT NULL DEFAULT 'original',
    target_revealed BOOLEAN NOT NULL DEFAULT 0,
    current_character_id TEXT NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_characters_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_characters_json TEXT NOT NULL DEFAULT '[]',
    current_loadout_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gauntlet_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    character_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES gauntlet_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chaos_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_checkpoint_streak INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_killers_json TEXT NOT NULL DEFAULT '[]',
    used_perks_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_used_perks_json TEXT NOT NULL DEFAULT '[]',
    current_perks_json TEXT NOT NULL DEFAULT '[]',
    current_addon_rarities_json TEXT NOT NULL DEFAULT '[]',
    perks_revealed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chaos_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    perks_json TEXT NOT NULL,
    addon_rarities_json TEXT NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES chaos_runs(id) ON DELETE CASCADE
);

INSERT INTO perk_rules (id, name, is_default, slot1_type, slot2_type, slot3_type, slot4_type)
SELECT 1, 'Default Balanced (2 Own, 1 General, 1 Any)', 1, 'character_own', 'character_own', 'general_role', 'any_role'
WHERE NOT EXISTS (SELECT 1 FROM perk_rules WHERE id = 1);

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

CREATE TABLE IF NOT EXISTS generator_drawn_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    perk_name TEXT NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, perk_name)
);

CREATE TABLE IF NOT EXISTS draft_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT UNIQUE NOT NULL,
    phase TEXT NOT NULL DEFAULT 'bans' CHECK (phase IN ('bans', 'picks', 'complete')),
    banned_perks TEXT NOT NULL DEFAULT '[]',
    picked_survivor_perks TEXT NOT NULL DEFAULT '[]',
    picked_killer_perks TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('daily', 'weekly')),
    progress INTEGER NOT NULL DEFAULT 0,
    goal INTEGER NOT NULL DEFAULT 1,
    xp_reward INTEGER NOT NULL DEFAULT 500,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    category TEXT NOT NULL CHECK (category IN ('otzdarva', 'meta', 'meme', 'stealth', 'chase')),
    character_id TEXT NOT NULL DEFAULT 'all',
    perks_json TEXT NOT NULL DEFAULT '[]',
    upvotes INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL DEFAULT 'Community',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
    character_name TEXT NOT NULL DEFAULT 'Teachable',
    rarity TEXT NOT NULL CHECK (rarity IN ('Iridescent', 'Very Rare', 'Uncommon')),
    icon_preset TEXT NOT NULL DEFAULT 'sparkles',
    description TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL DEFAULT 'Community',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_realms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    realm TEXT NOT NULL,
    layout_type TEXT,
    jungle_gyms_count INTEGER DEFAULT 0,
    totem_spawns_count INTEGER DEFAULT 5,
    pallet_density TEXT,
    shack_has_basement BOOLEAN DEFAULT 1,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    floor INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    has_pallet BOOLEAN NOT NULL DEFAULT 0,
    pallet_safety_rating TEXT CHECK (pallet_safety_rating IS NULL OR pallet_safety_rating IN ('god', 'safe', 'mindgameable', 'unsafe')),
    has_window BOOLEAN NOT NULL DEFAULT 0,
    vault_directions TEXT DEFAULT '[]',
    looping_tips TEXT NOT NULL DEFAULT '',
    mindgame_counter TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES map_realms(map_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id TEXT NOT NULL,
    seed_variant TEXT NOT NULL DEFAULT 'seed_a',
    floor INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL CHECK (type IN ('totem', 'generator', 'exit_gate', 'hatch', 'chest', 'basement')),
    x REAL NOT NULL,
    y REAL NOT NULL,
    location_description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES map_realms(map_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS page_streak_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    killer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    attempt INTEGER NOT NULL DEFAULT 1,
    current_page INTEGER NOT NULL DEFAULT 1,
    best_page INTEGER NOT NULL DEFAULT 0,
    pages_json TEXT NOT NULL DEFAULT '[]',
    snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_streak_page_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    perks_json TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES page_streak_runs(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO generator_settings (id, role, gen_mode, no_repeat_perks)
VALUES (1, 'Survivor', 'instant', 1);

CREATE TABLE IF NOT EXISTS guesser_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guesser_type TEXT UNIQUE NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_guesses INTEGER NOT NULL DEFAULT 0,
    correct_guesses INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('character', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_description', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_name_to_icon', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('perk_icon_to_name', 0, 0, 0, 0);
INSERT OR IGNORE INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses) VALUES ('memes', 0, 0, 0, 0);
"""


def init_raw_sqlite_schema(conn: sqlite3.Connection) -> None:
    """Executes schema DDL commands for fallback SQLite databases."""
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(map_realms);")
        cols = [row[1] for row in cursor.fetchall()]
        if cols and "map_id" not in cols:
            cursor.execute("DROP TABLE IF EXISTS map_realms;")
            cursor.execute("DROP TABLE IF EXISTS map_tiles;")
            cursor.execute("DROP TABLE IF EXISTS map_objectives;")
            conn.commit()

        cursor.executescript(SQLITE_FALLBACK_DDL)
        conn.commit()
    except Exception as e:
        logger.error(f"Fallback SQLite init_db failed: {e}")


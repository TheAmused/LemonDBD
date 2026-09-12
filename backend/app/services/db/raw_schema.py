# backend/app/services/db/raw_schema.py
import logging
import sqlite3

logger = logging.getLogger(__name__)

# Hand-written DDL for the SQLite fallback path. It had drifted from the
# SQLAlchemy models -- `map_realms` here was missing `realm_id`,
# `callout_image_url`, `callout_image_local_path` and `translations`, all of
# which the model and the seed data have -- so a fallback database silently
# lost those columns. Keep this in step with app/models/ when either changes.
SQLITE_FALLBACK_DDL = """

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

CREATE TABLE IF NOT EXISTS history_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mode TEXT NOT NULL CHECK (mode IN ('medium', 'hell')),
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_row_index INTEGER NOT NULL DEFAULT 0,
    total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    best_killers_beaten INTEGER NOT NULL DEFAULT 0,
    completed_killers_json TEXT NOT NULL DEFAULT '[]',
    unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_row_index INTEGER NOT NULL DEFAULT 0,
    checkpoint_total_killers_beaten INTEGER NOT NULL DEFAULT 0,
    checkpoint_completed_killers_json TEXT NOT NULL DEFAULT '[]',
    checkpoint_unlocked_perk_names_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    killer_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    row_index INTEGER NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES history_runs(id) ON DELETE CASCADE
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
    character_id TEXT NOT NULL DEFAULT 'all',  -- a character slug or 'all', not a characters.id
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

CREATE TABLE IF NOT EXISTS realms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    image_url TEXT,
    image_local_path TEXT,
    translations TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS map_realms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    realm_id INTEGER NOT NULL REFERENCES realms(id),
    source_id INTEGER NOT NULL REFERENCES map_sources(id),
    callout_image_url TEXT,
    callout_image_local_path TEXT,
    translations TEXT DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_i18n_key TEXT NOT NULL,
    description_i18n_key TEXT NOT NULL,
    cover_image_url TEXT,
    theme_color TEXT NOT NULL DEFAULT '#ff0055',
    category TEXT NOT NULL DEFAULT 'DBD',
    is_nsfw BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    roster_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Survivor',
    gender TEXT NOT NULL DEFAULT 'female',
    media_url TEXT,
    media_type TEXT NOT NULL DEFAULT 'image',
    -- Was one `metadata_json` blob; the profile is columns now.
    archetype TEXT,
    bio TEXT NOT NULL DEFAULT '',
    tagline TEXT NOT NULL DEFAULT '',
    quote TEXT NOT NULL DEFAULT '',
    meme TEXT NOT NULL DEFAULT '',
    turn_on TEXT NOT NULL DEFAULT '',
    dealbreaker TEXT NOT NULL DEFAULT '',
    dating_vibe TEXT NOT NULL DEFAULT '',
    red_flags TEXT NOT NULL DEFAULT '[]',
    green_flags TEXT NOT NULL DEFAULT '[]',
    chapter TEXT,
    danger_level TEXT,
    chaos_score SMALLINT CHECK (chaos_score IS NULL OR (chaos_score >= 0 AND chaos_score <= 100)),
    translations TEXT DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entity_stats (
    -- The surrogate `id` is gone: this table is strictly 1:1 with entities.
    entity_id TEXT PRIMARY KEY,
    smash_count INTEGER NOT NULL DEFAULT 0,
    pass_count INTEGER NOT NULL DEFAULT 0,
    super_smash_count INTEGER NOT NULL DEFAULT 0,
    -- Generated, so they cannot drift from the three counts above.
    total_votes INTEGER NOT NULL GENERATED ALWAYS AS (smash_count + pass_count + super_smash_count) STORED,
    smash_rate REAL NOT NULL GENERATED ALWAYS AS (COALESCE((smash_count + super_smash_count) * 100.0 / NULLIF(smash_count + pass_count + super_smash_count, 0), 0)) STORED,
    chaos_rating REAL NOT NULL DEFAULT 50.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    session_id TEXT,
    user_id INTEGER,
    vote_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

"""


def init_raw_sqlite_schema(conn: sqlite3.Connection) -> None:
    try:
        cursor = conn.cursor()

        # `map_tiles` held five generic placeholder tile names copied onto every
        # map, and `map_objectives` was empty for all 58 of them. Neither is in
        # the model any more, and both had a foreign key onto the `map_id` slug
        # that `map_realms` no longer has -- so they go first, unconditionally,
        # before anything looks at `map_realms` itself.
        cursor.execute("DROP TABLE IF EXISTS map_objectives;")
        cursor.execute("DROP TABLE IF EXISTS map_tiles;")
        conn.commit()

        cursor.execute("PRAGMA table_info(map_realms);")
        cols = [row[1] for row in cursor.fetchall()]
        if cols:
            # Every one of these is a column the current model does NOT have,
            # or a column it requires and an old table lacks:
            #
            #   `realm` / `source`  -- denormalized names, replaced by the
            #                          `realm_id` / `source_id` integer keys.
            #   `map_id`            -- a slug ("azarovs_resting_place") that
            #                          duplicated `name` and shadowed the real
            #                          integer primary key. Dropped.
            #   `image_url`         -- a byte-identical copy of
            #                          `callout_image_url`. Dropped.
            #
            # A table carrying any of them predates the current schema and
            # cannot be patched column-by-column in SQLite, so it is rebuilt.
            # That is safe: these are seed tables, refilled on the next boot.
            stale = (
                "map_id" in cols
                or "image_url" in cols
                or "realm" in cols
                or "source" in cols
                or "realm_id" not in cols
                or "source_id" not in cols
            )
            if stale:
                cursor.execute("DROP TABLE IF EXISTS map_realms;")
                conn.commit()
            else:
                for column, ddl in (
                    ("callout_image_url", "TEXT"),
                    ("callout_image_local_path", "TEXT"),
                    ("translations", "TEXT DEFAULT '{}'"),
                ):
                    if column not in cols:
                        try:
                            cursor.execute(f"ALTER TABLE map_realms ADD COLUMN {column} {ddl};")
                        except Exception:
                            pass
                conn.commit()

        cursor.executescript(SQLITE_FALLBACK_DDL)
        conn.commit()
    except Exception as e:
        logger.error(f"Fallback SQLite init_db failed: {e}")

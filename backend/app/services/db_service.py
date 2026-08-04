import os
import sqlite3

class DatabaseService:
    def __init__(self, db_path="data/lemon_dbd.db"):
        self.db_path = db_path

    def get_connection(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            active_role TEXT NOT NULL DEFAULT 'survivor',
            checkpoint_interval INTEGER NOT NULL DEFAULT 3,
            win_condition_survivor TEXT NOT NULL DEFAULT 'escape',
            win_condition_killer TEXT NOT NULL DEFAULT '3k_plus',
            active_perk_rule_id INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
            current_loadout_json TEXT NOT NULL DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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

        -- Insert default user settings if missing
        INSERT OR IGNORE INTO user_settings (id, active_role, checkpoint_interval)
        VALUES (1, 'survivor', 3);

        -- Insert default perk rule if missing
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

        CREATE TABLE IF NOT EXISTS character_pool_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
            character_name TEXT NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT 1,
            UNIQUE(role, character_name)
        );

        CREATE TABLE IF NOT EXISTS match_exceptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            character_id TEXT NOT NULL,
            reason TEXT NOT NULL CHECK (reason IN ('dc_before_5_gens', 'game_cancelled')),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES challenge_runs(id) ON DELETE CASCADE
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

        INSERT OR IGNORE INTO generator_settings (id, role, gen_mode, no_repeat_perks)
        VALUES (1, 'Survivor', 'instant', 1);
        """)

        conn.commit()
        conn.close()

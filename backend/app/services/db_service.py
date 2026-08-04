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
        """)

        conn.commit()
        conn.close()

import os
import sqlite3
import logging
from typing import Set, Dict, Any, Optional
from flask import current_app
from sqlalchemy import select, delete, text
from app.extensions import db
from app.models import (
    UserSettings,
    PerkRule,
    GeneratorSetting,
    GuesserStat,
    ChallengeRun,
    PageStreakRun,
)

logger = logging.getLogger(__name__)


class _MemConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
    def cursor(self):
        return self._conn.cursor()
    def commit(self):
        return self._conn.commit()
    def rollback(self):
        return self._conn.rollback()
    def execute(self, *args, **kwargs):
        return self._conn.execute(*args, **kwargs)
    def executemany(self, *args, **kwargs):
        return self._conn.executemany(*args, **kwargs)
    def executescript(self, *args, **kwargs):
        return self._conn.executescript(*args, **kwargs)
    def close(self):
        pass
    def __getattr__(self, name):
        return getattr(self._conn, name)


class DatabaseService:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self._mem_conn = None
        if self.db_path == ":memory:":
            raw = sqlite3.connect(":memory:", check_same_thread=False)
            raw.row_factory = sqlite3.Row
            self._mem_conn = _MemConnectionWrapper(raw)
            self._init_sqlite_schema(self._mem_conn)

    def get_connection(self):
        """Legacy SQLite in-memory connection helper for backwards compatibility in standalone tests."""
        if self.db_path == ":memory:":
            return self._mem_conn
        dir_name = os.path.dirname(os.path.abspath(self.db_path))
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initializes database schema and populates default baseline configuration."""
        try:
            # If inside Flask application context, initialize with SQLAlchemy
            if current_app:
                db.create_all()
                self._migrate_columns()
                self._seed_default_configs()
        except Exception as e:
            logger.debug(f"SQLAlchemy init_db skipped or failed (falling back): {e}")

        # Fallback for standalone/SQLite scripts
        try:
            conn = self.get_connection()
            self._init_sqlite_schema(conn)
        except Exception as e:
            logger.debug(f"SQLite fallback init_db error: {e}")

    def _migrate_columns(self):
        """Ensure all newly added columns exist in existing PostgreSQL and SQLite databases."""
        try:
            is_pg = False
            try:
                is_pg = (db.engine.dialect.name == "postgresql")
            except Exception:
                pass

            character_columns = [
                ("code_prefix", "VARCHAR(10)"),
                ("portrait_url", "VARCHAR(255)"),
                ("real_name", "VARCHAR(100)"),
                ("short_name", "VARCHAR(50)"),
                ("wiki_slug", "VARCHAR(100)"),
                ("avatar_local_path", "VARCHAR(255)"),
                ("release_number", "INTEGER"),
                ("chapter_name", "VARCHAR(150)"),
                ("chapter_number", "VARCHAR(50)"),
                ("dlc_type", "VARCHAR(50)"),
                ("is_licensed", "BOOLEAN DEFAULT FALSE"),
                ("release_year", "INTEGER"),
                ("release_date", "VARCHAR(50)"),
                ("dlc_counterparts", "TEXT"),
                ("lore", "TEXT"),
            ]

            with db.engine.connect() as conn:
                for col_name, col_type in character_columns:
                    try:
                        if is_pg:
                            conn.execute(text(f"ALTER TABLE characters ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                        else:
                            # SQLite check if column already exists
                            check_sql = text("PRAGMA table_info(characters);")
                            res = conn.execute(check_sql).fetchall()
                            existing_cols = [r[1] for r in res]
                            if col_name not in existing_cols:
                                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col_name} {col_type};"))
                    except Exception as err:
                        logger.debug(f"Column migration notice for {col_name}: {err}")
                conn.commit()
        except Exception as e:
            logger.debug(f"Database column migration skipped or failed: {e}")

    def _init_sqlite_schema(self, conn):
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(map_realms);")
            cols = [row[1] for row in cursor.fetchall()]
            if cols and "map_id" not in cols:
                cursor.execute("DROP TABLE IF EXISTS map_realms;")
                cursor.execute("DROP TABLE IF EXISTS map_tiles;")
                cursor.execute("DROP TABLE IF EXISTS map_objectives;")
                conn.commit()

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

            INSERT OR IGNORE INTO user_settings (id, active_role, checkpoint_interval)
            VALUES (1, 'survivor', 3);

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
            """)

            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Fallback SQLite init_db failed: {e}")

    def _seed_default_configs(self):
        """Seeds default configuration rows into the SQLAlchemy session if not present."""
        try:
            # User settings
            user_settings = db.session.get(UserSettings, 1)
            if not user_settings:
                db.session.add(UserSettings(id=1, active_role="survivor", checkpoint_interval=3))

            # Default Perk Rule
            default_rule = db.session.get(PerkRule, 1)
            if not default_rule:
                db.session.add(
                    PerkRule(
                        id=1,
                        name="Default Balanced (2 Own, 1 General, 1 Any)",
                        is_default=True,
                        slot1_type="character_own",
                        slot2_type="character_own",
                        slot3_type="general_role",
                        slot4_type="any_role",
                    )
                )

            # Generator settings
            gen_setting = db.session.get(GeneratorSetting, 1)
            if not gen_setting:
                db.session.add(
                    GeneratorSetting(
                        id=1,
                        role="Survivor",
                        gen_mode="instant",
                        no_repeat_perks=True,
                    )
                )

            # Guesser stats
            for g_type in ["character", "perk_description", "perk_name_to_icon", "perk_icon_to_name", "memes"]:
                stat = db.session.scalars(
                    select(GuesserStat).where(GuesserStat.guesser_type == g_type)
                ).first()
                if not stat:
                    db.session.add(GuesserStat(guesser_type=g_type))

            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.warning(f"Error seeding default settings in SQLAlchemy: {e}")

    def prune_stale_character_rows(self, valid_names: Optional[Set[str]]) -> Dict[str, int]:
        """Delete run rows pinned to characters that no longer exist."""
        names = {str(n) for n in (valid_names or set())}
        if not names:
            return {}

        deleted = {}
        try:
            if current_app:
                # SQLAlchemy 2.0 statement
                stale_cr = db.session.scalars(
                    select(ChallengeRun).where(~ChallengeRun.current_character_id.in_(names))
                ).all()
                deleted["challenge_runs"] = len(stale_cr)
                for cr in stale_cr:
                    db.session.delete(cr)

                stale_psr = db.session.scalars(
                    select(PageStreakRun).where(~PageStreakRun.killer.in_(names))
                ).all()
                deleted["page_streak_runs"] = len(stale_psr)
                for psr in stale_psr:
                    db.session.delete(psr)

                db.session.commit()
                return deleted
        except Exception:
            pass

        # Fallback to SQLite cursor
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")

        for table, column in (("challenge_runs", "current_character_id"), ("page_streak_runs", "killer")):
            cursor.execute(f"SELECT id, {column} AS character_name FROM {table};")
            stale = [row["id"] for row in cursor.fetchall() if row["character_name"] not in names]
            if stale:
                placeholders = ",".join("?" for _ in stale)
                cursor.execute(f"DELETE FROM {table} WHERE id IN ({placeholders});", stale)
            deleted[table] = len(stale)

        conn.commit()
        conn.close()
        return deleted

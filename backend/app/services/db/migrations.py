# backend/app/services/db/migrations.py
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

CHARACTER_COLUMNS = [
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
    ("power_name", "VARCHAR(150)"),
    ("power_description", "TEXT"),
    ("power_icon_url", "VARCHAR(500)"),
    ("movement_speed", "VARCHAR(100)"),
    ("terror_radius", "VARCHAR(100)"),
    ("terror_radius_meters", "INTEGER"),
    ("height", "VARCHAR(50)"),
    ("translations", "JSON"),
]

PERK_COLUMNS = [
    ("alternate_name", "VARCHAR(150)"),
    ("is_generic_counterpart", "BOOLEAN DEFAULT FALSE"),
    ("translations", "JSON"),
]

ITEM_COLUMNS = [
    ("translations", "JSON"),
]

ADDON_COLUMNS = [
    ("translations", "JSON"),
]

GAUNTLET_RUN_COLUMNS = [
    ("game_mode", "VARCHAR(20) DEFAULT 'original'"),
    ("target_revealed", "BOOLEAN DEFAULT FALSE"),
]

SMASH_PASS_STAT_COLUMNS = [
    ("edition", "VARCHAR(50) DEFAULT 'canon'"),
]

SMASH_PASS_VOTE_COLUMNS = [
    ("edition", "VARCHAR(50) DEFAULT 'canon'"),
]


def migrate_runtime_columns(db) -> None:
    """Ensure all required columns exist in active PostgreSQL or SQLite database engines."""
    try:
        is_pg = False
        try:
            is_pg = db.engine.dialect.name in ("postgresql", "postgres")
        except Exception:
            pass

        with db.engine.connect() as conn:
            # 1. Migrate Character Columns
            for col_name, col_type in CHARACTER_COLUMNS:
                actual_type = "JSONB" if (is_pg and col_type == "JSON") else col_type
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE characters ADD COLUMN IF NOT EXISTS {col_name} {actual_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(characters);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col_name} {actual_type};"))
                except Exception as err:
                    logger.debug(f"Character column check notice for {col_name}: {err}")

            # 2. Migrate Perk Columns
            for col_name, col_type in PERK_COLUMNS:
                actual_type = "JSONB" if (is_pg and col_type == "JSON") else col_type
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE perks ADD COLUMN IF NOT EXISTS {col_name} {actual_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(perks);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE perks ADD COLUMN {col_name} {actual_type};"))
                except Exception as err:
                    logger.debug(f"Perk column check notice for {col_name}: {err}")

            # 3. Migrate Item Columns
            for col_name, col_type in ITEM_COLUMNS:
                actual_type = "JSONB" if (is_pg and col_type == "JSON") else col_type
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE items ADD COLUMN IF NOT EXISTS {col_name} {actual_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(items);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE items ADD COLUMN {col_name} {actual_type};"))
                except Exception as err:
                    logger.debug(f"Item column check notice for {col_name}: {err}")

            # 4. Migrate Addon Columns
            for col_name, col_type in ADDON_COLUMNS:
                actual_type = "JSONB" if (is_pg and col_type == "JSON") else col_type
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE addons ADD COLUMN IF NOT EXISTS {col_name} {actual_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(addons);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE addons ADD COLUMN {col_name} {actual_type};"))
                except Exception as err:
                    logger.debug(f"Addon column check notice for {col_name}: {err}")

            # 5. Migrate Gauntlet Run Columns
            for col_name, col_type in GAUNTLET_RUN_COLUMNS:
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE gauntlet_runs ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(gauntlet_runs);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE gauntlet_runs ADD COLUMN {col_name} {col_type};"))
                except Exception as err:
                    logger.debug(f"Gauntlet run column check notice for {col_name}: {err}")

            # 6. Migrate SmashPassStat & SmashPassVote Columns
            for col_name, col_type in SMASH_PASS_STAT_COLUMNS:
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE smash_pass_stats ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(smash_pass_stats);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE smash_pass_stats ADD COLUMN {col_name} {col_type};"))
                except Exception as err:
                    logger.debug(f"SmashPassStat column check notice for {col_name}: {err}")

            for col_name, col_type in SMASH_PASS_VOTE_COLUMNS:
                try:
                    if is_pg:
                        conn.execute(text(f"ALTER TABLE smash_pass_votes ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    else:
                        res = conn.execute(text("PRAGMA table_info(smash_pass_votes);")).fetchall()
                        existing_cols = [r[1] for r in res]
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE smash_pass_votes ADD COLUMN {col_name} {col_type};"))
                except Exception as err:
                    logger.debug(f"SmashPassVote column check notice for {col_name}: {err}")

            conn.commit()
    except Exception as e:
        logger.debug(f"Database column migration skipped or failed: {e}")
# backend/migrations/versions/challenge_json_columns_001.py
"""store challenge run lists and dicts as native JSON

Revision ID: challenge_json_columns_001
Revises: perk_type_001
Create Date: 2026-09-19 00:00:00.000000

Every gauntlet/chaos/history/page streak column that held a JSON string in
TEXT ("completed_killers_json") becomes a JSONB column named for its content
("completed_killers"), so the models read and write lists and dicts directly
instead of parsing and dumping by hand.

A stored value that is not valid JSON of the expected kind (array, or object
for the gauntlet loadout) becomes the empty value instead of aborting the
whole ALTER. The app already read such values as empty, so nothing a player
could see changes.

Idempotent: create_app()'s db.create_all() builds a fresh database with the
new columns already, so each rename and type change is skipped when the
database is already in that state.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "challenge_json_columns_001"
down_revision = "perk_type_001"
branch_labels = None
depends_on = None

# table -> (old TEXT column, new JSONB column, JSON kind)
COLUMNS: dict[str, list[tuple[str, str, str]]] = {
    "chaos_runs": [
        ("completed_killers_json", "completed_killers", "ARRAY"),
        ("checkpoint_killers_json", "checkpoint_killers", "ARRAY"),
        ("used_perks_json", "used_perks", "ARRAY"),
        ("checkpoint_used_perks_json", "checkpoint_used_perks", "ARRAY"),
        ("current_perks_json", "current_perks", "ARRAY"),
        ("current_addon_rarities_json", "current_addon_rarities", "ARRAY"),
        ("owned_killers_json", "owned_killer_ids", "ARRAY"),
        ("unlocked_perks_json", "unlocked_perk_ids", "ARRAY"),
    ],
    "chaos_match_logs": [
        ("perks_json", "perks", "ARRAY"),
        ("addon_rarities_json", "addon_rarities", "ARRAY"),
    ],
    "gauntlet_runs": [
        ("completed_characters_json", "completed_characters", "ARRAY"),
        ("checkpoint_characters_json", "checkpoint_characters", "ARRAY"),
        ("current_loadout_json", "current_loadout", "OBJECT"),
        ("owned_characters_json", "owned_character_ids", "ARRAY"),
    ],
    "gauntlet_match_logs": [
        ("perks_json", "perks", "ARRAY"),
    ],
    "history_runs": [
        ("completed_killers_json", "completed_killers", "ARRAY"),
        ("unlocked_perk_names_json", "unlocked_perk_names", "ARRAY"),
        ("checkpoint_completed_killers_json", "checkpoint_completed_killers", "ARRAY"),
        ("checkpoint_unlocked_perk_names_json", "checkpoint_unlocked_perk_names", "ARRAY"),
        ("owned_killers_json", "owned_killer_ids", "ARRAY"),
    ],
    "page_streak_runs": [
        ("pages_json", "pages", "ARRAY"),
    ],
    "page_streak_page_logs": [
        ("perks_json", "perks", "ARRAY"),
    ],
}

_EMPTY = {"ARRAY": "[]", "OBJECT": "{}"}


def _column_types(table: str) -> dict[str, sa.types.TypeEngine]:
    return {c["name"]: c["type"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    for table, columns in COLUMNS.items():
        existing = _column_types(table)
        renames = [(old, new) for old, new, _ in columns if old in existing and new not in existing]
        if renames:
            with op.batch_alter_table(table) as batch_op:
                for old, new in renames:
                    batch_op.alter_column(old, new_column_name=new)

        if not _is_postgres():
            continue  # SQLite keeps JSON as TEXT either way
        existing = _column_types(table)
        clauses = [
            f"ALTER COLUMN {new} TYPE jsonb USING CASE WHEN {new} IS JSON {kind} "
            f"THEN {new}::jsonb ELSE '{_EMPTY[kind]}'::jsonb END"
            for _, new, kind in columns
            if new in existing and not isinstance(existing[new], JSONB)
        ]
        if clauses:
            op.execute(f"ALTER TABLE {table} " + ", ".join(clauses))


def downgrade() -> None:
    for table, columns in COLUMNS.items():
        existing = _column_types(table)
        if _is_postgres():
            clauses = [
                f"ALTER COLUMN {new} TYPE text USING {new}::text"
                for _, new, _ in columns
                if new in existing and isinstance(existing[new], JSONB)
            ]
            if clauses:
                op.execute(f"ALTER TABLE {table} " + ", ".join(clauses))
        renames = [(new, old) for old, new, _ in columns if new in existing and old not in existing]
        if renames:
            with op.batch_alter_table(table) as batch_op:
                for new, old in renames:
                    batch_op.alter_column(new, new_column_name=old)

# backend/migrations/versions/0002_baseline.py
"""baseline -- the whole database, in one revision

Revision ID: 0002_baseline
Revises:
Create Date: 2026-10-01

Squashes the whole chain (0001_initial_schema plus the sixteen per-feature
revisions that followed: challenges, map realms, perk types and tarot, tier
lists, minigames, character gender/chase music, roster created_at...).

`create_app()` calls `db.create_all()` on every boot, so a brand-new database
arrives at Alembic *already holding the current schema*. This revision does not
describe that schema a second time: it asks the models for it
(`metadata.create_all(checkfirst=True)`), so it is a no-op against a database
create_all() already built and the full build against an empty one.

Databases stamped with any of the removed revision ids are re-stamped here by
`scripts/sync_db_schema.py` (it clears an alembic_version row naming an unknown
revision, then upgrade() stamps this one). That is only correct for a database
that had reached the previous head, `character_gender_chase_music_001`.

**Write real DDL in the next revision.** create_all() only ever CREATEs absent
tables, it never ALTERs one that exists, so a migration that adds a column must
say so explicitly. This one is a baseline, not a pattern.
"""
import logging

import sqlalchemy as sa
from alembic import op

revision = "0002_baseline"
down_revision = None
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")


def _metadata() -> sa.MetaData:
    """The live model metadata.

    Imported here rather than at module scope: Alembic loads every file in
    `versions/` to build the revision map, and importing the app at that point
    would run it outside the application context `env.py` sets up.
    """
    from app.core.extensions import db
    import app.models  # noqa: F401  -- registers every table on the metadata

    return db.metadata


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name in ("postgresql", "postgres"):
        # Accent-insensitive search ("Lery's" finding "Léry's"). Not a table,
        # so create_all() cannot bring it along and it has to be said here.
        op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")

    metadata = _metadata()
    before = set(sa.inspect(bind).get_table_names())
    metadata.create_all(bind=bind, checkfirst=True)
    after = set(sa.inspect(bind).get_table_names())

    created = sorted(after - before)
    if created:
        logger.info("[baseline] created %d table(s): %s",
                    len(created), ", ".join(created))
    else:
        logger.info(
            "[baseline] every table already present (create_all() built "
            "them during app startup) -- stamping only."
        )


def downgrade() -> None:
    """Drops every table the models define.

    There is nothing below this revision, so this is the "tear the database
    down" direction rather than a step back to an older shape.
    """
    bind = op.get_bind()
    _metadata().drop_all(bind=bind, checkfirst=True)

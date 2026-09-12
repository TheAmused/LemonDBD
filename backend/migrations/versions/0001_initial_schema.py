# backend/migrations/versions/0001_initial_schema.py
"""initial schema -- the whole database, in one revision

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-12

This replaces twenty migrations that were squashed away. They are worth a
paragraph, because the reason they had to go is a design problem and not
tidiness.

`create_app()` calls `db.create_all()` on every boot, so a brand-new database
arrives at Alembic *already holding the current schema*. The old chain started
from a 2024 shape -- a `characters` table with a `role` discriminator, a
`killer_profiles` child, a single `addons` table, string `map_id` keys -- and
walked forward. Replaying that against a database create_all() had just built
meant every statement had to be hand-guarded to notice the work was already
done, and each missed guard was another boot loop. The last one failed on

    CREATE TABLE killer_profiles (... REFERENCES characters (id))
    ERROR: relation "characters" does not exist

which is the whole problem in one statement: a historical migration trying to
transform a shape that, on this database, never existed.

So: one revision, and it does not describe the schema in a second place.
It asks the models for it. The models are the source of truth -- that is what
`create_all()` uses, what the exporter serializes, and what every query runs
against -- and a hand-written copy of forty tables' DDL here could only ever
drift from them, which is the same failure a layer down.

`checkfirst=True` makes this idempotent, so the revision is a no-op against a
database create_all() already built and does the full build against an empty
one. Either way, alembic_version ends up stamped and the next real migration
has a fixed point to start from.

**Write real DDL in the next revision.** This one is a baseline, not a pattern:
a migration that adds a column must say so explicitly, or an existing database
will never receive it -- create_all() only ever CREATEs tables that are absent,
it never ALTERs one that exists.
"""
import logging

import sqlalchemy as sa
from alembic import op

revision = "0001_initial_schema"
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
        logger.info("[initial_schema] created %d table(s): %s",
                    len(created), ", ".join(created))
    else:
        logger.info(
            "[initial_schema] every table already present (create_all() built "
            "them during app startup) -- stamping only."
        )


def downgrade() -> None:
    """Drops every table the models define.

    There is nothing below this revision, so this is the "tear the database
    down" direction rather than a step back to an older shape.
    """
    bind = op.get_bind()
    _metadata().drop_all(bind=bind, checkfirst=True)

# backend/scripts/sync_db_schema.py
"""Brings the database schema up to date. Run by entrypoint.sh before gunicorn.

`create_app()` runs `db.create_all()` as part of normal startup, so by the time
this script reaches Alembic the tables already exist. Alembic's job here is
therefore not to build the schema but to *record* where it stands and to apply
anything create_all() cannot: an ALTER on a table that already exists, a
Postgres extension, a data backfill.

This used to stamp new databases at a hardcoded BASELINE_REVISION in the middle
of a twenty-revision chain and then replay everything after it, so that each of
those migrations could run its "real DDL" against whatever create_all() had
built. That required every one of them to be individually guarded against a
schema that already looked finished, and a single missed guard was a boot loop.
The chain is squashed into `0001_initial_schema`, which is idempotent, so the
special case is gone: always upgrade, from wherever the database actually is.
"""
import logging
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alembic.script import ScriptDirectory  # noqa: E402
from flask_migrate import upgrade  # noqa: E402
from sqlalchemy import inspect, text  # noqa: E402

from app import create_app  # noqa: E402
from app.core.config import Config  # noqa: E402
from app.core.extensions import db  # noqa: E402

logging.basicConfig(level=logging.INFO, format="[sync_db_schema] %(message)s")
logger = logging.getLogger("sync_db_schema")


def _known_revisions(app) -> set[str]:
    """Every revision id in migrations/versions/.

    Flask-Migrate has moved this handle around between major versions, so both
    spellings are tried rather than assuming one.
    """
    extension = app.extensions["migrate"]
    migrate = getattr(extension, "migrate", extension)
    config = migrate.get_config()
    return {script.revision for script in ScriptDirectory.from_config(config).walk_revisions()}


def _clear_unknown_revision(app) -> bool:
    """Drops an `alembic_version` row naming a revision that no longer exists.

    Squashing the old chain deleted the revision ids a database seeded before
    the squash is stamped with (`split_addons_003` and friends). Alembic cannot
    upgrade from a revision it cannot find -- it raises "Can't locate revision
    identified by ..." and the container never starts. Such a database already
    holds the schema those revisions produced, which is the schema
    `0001_initial_schema` describes, so the honest repair is to forget the
    stamp and re-stamp at the new baseline rather than to demand a volume wipe.
    """
    engine = db.engine
    if not inspect(engine).has_table("alembic_version"):
        return False

    with engine.connect() as conn:
        current = [row[0] for row in conn.execute(text("SELECT version_num FROM alembic_version"))]

    stale = [rev for rev in current if rev not in _known_revisions(app)]
    if not stale:
        return False

    logger.warning(
        "alembic_version names %s, which no longer exists (the migration chain "
        "was squashed into 0001_initial_schema). The schema itself is already "
        "what that squash describes, so clearing the stamp and re-stamping.",
        ", ".join(stale),
    )
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM alembic_version"))
    return True


def main() -> int:
    # create_app() builds the schema via db.create_all() and runs the seeder.
    app = create_app(Config)

    with app.app_context():
        try:
            _clear_unknown_revision(app)
        except Exception as stamp_err:
            # Never block boot on the repair path -- if it cannot run, the
            # upgrade below either works anyway or fails with its own, clearer
            # error.
            logger.warning("Could not check the stored revision: %s", stamp_err)

        if not inspect(db.engine).has_table("alembic_version"):
            logger.info("no alembic_version table -- upgrading from the base revision.")

        logger.info("applying any pending migrations...")
        upgrade()
        logger.info("Migrations applied / schema up to date.")

        try:
            from app.seeds.static_db_seeder import apply_pending_updates
            logger.info("Checking for pending database updates...")
            apply_pending_updates()
        except Exception as upd_err:
            logger.warning(f"Notice during update scan: {upd_err}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

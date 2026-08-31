# backend/scripts/sync_db_schema.py
"""
Called by entrypoint.sh on every container start, before gunicorn boots.

This app's schema was historically built entirely through SQLAlchemy's
db.create_all() -- app/__init__.py still runs that (plus baseline seeding)
automatically every time create_app() is called, fresh database or not.
Alembic (migrations/) was introduced afterwards, on top of databases that
already existed that way. That means a database with no `alembic_version`
table -- a brand-new Docker volume, or an existing dev/prod database that
predates this migrations/ folder -- already matches the schema as of
whenever this migrations/ folder was introduced (call it the "baseline"
revision, BASELINE_REVISION below), columns included, via create_all().
Replaying the *entire* migration history from revision zero against it
would re-apply changes that already exist from long before Alembic existed
(e.g. an early ALTER TABLE against a table name that predates the current
schema) and fail outright.

But stamping straight at *head* is also wrong: db.create_all() only ever
CREATEs tables that don't exist yet -- it never ALTERs a table that already
exists to add a column a newer model definition introduced. So a database
whose `changelog_posts` table was created (by create_all()) before the
`position` column was added to the model would get stamped as "fully
migrated" without that column ever actually being added, leaving it
permanently broken.

So the rule is:
  - no alembic_version table  -> the schema matches create_all() as of
    BASELINE_REVISION (the last migration that predates this script's
    introduction), so stamp AT THAT BASELINE, not head. Then always run
    upgrade() so every migration after the baseline actually executes its
    real DDL -- each one is written to be idempotent (guarded with
    sqlalchemy.inspect existence checks), so it safely fills in anything
    create_all() already happened to create and skips what it didn't.
  - alembic_version present   -> just upgrade() -- applies anything added
    since whatever revision the DB was last stamped/upgraded to.
"""
import logging
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask_migrate import stamp, upgrade  # noqa: E402
from sqlalchemy import inspect  # noqa: E402

from app import create_app  # noqa: E402
from app.core.config import Config  # noqa: E402
from app.core.extensions import db  # noqa: E402

logging.basicConfig(level=logging.INFO, format="[sync_db_schema] %(message)s")
logger = logging.getLogger("sync_db_schema")

# The last migration revision that predates any model change create_all()
# could not have already applied on its own -- i.e. the revision right
# before the first migration that must actually be allowed to run its real
# DDL against a pre-existing, create_all()-built database. Update this if a
# future migration adds something create_all() alone would never have
# created on an old database (a brand new table is fine either way; a new
# column on an existing table is the case that matters).
BASELINE_REVISION = "email_verification_reset_001"


def main() -> int:
    # create_app() itself runs db.create_all() + baseline seeding as part of
    # its normal startup (app/__init__.py) -- this is what actually builds
    # the schema for a brand-new database, same as it always has.
    app = create_app(Config)

    with app.app_context():
        has_alembic_table = inspect(db.engine).has_table("alembic_version")
        if not has_alembic_table:
            logger.info(
                "no alembic_version table -- stamping at baseline (%s) instead "
                "of head, so migrations after it still run their real DDL "
                "against whatever create_all() actually built.",
                BASELINE_REVISION,
            )
            stamp(revision=BASELINE_REVISION)

        logger.info("applying any pending migrations...")
        upgrade()
        logger.info("Migrations applied / schema up to date.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

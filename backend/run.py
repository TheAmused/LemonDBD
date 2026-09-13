# backend/run.py
"""The WSGI entry point. `gunicorn ... run:app` imports this.

It used to do two other things, both wrong:

1. `from app.models.character import Character` -- a table that no longer
   exists. `characters` was split into `survivors` and `killers`, so this
   import failed and gunicorn never started.

2. `_seed_static_db_if_needed()`, which called `seed_from_static_json()` at
   import time if the character count was zero. That was a *fourth* seeder, on
   top of the three already consolidated into `static_db_seeder`, and the worst
   placed of them: `create_app()` seeds under a Postgres advisory lock
   (`pg_try_advisory_lock(8882026)`) precisely so that N gunicorn workers
   booting at once do not race each other, and this ran outside that lock, in
   every worker, after `create_app()` had already done the work.

Both are gone. `create_app()` builds the schema and seeds; this module just
exposes the app.
"""
import logging

from app import create_app

logger = logging.getLogger(__name__)

app = create_app()


if __name__ == "__main__":
    host = app.config.get("HOST", "0.0.0.0")
    port = int(app.config.get("PORT", 5000))
    debug = bool(app.config.get("DEBUG", False))
    logger.info(f"Starting LemonDBD server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)

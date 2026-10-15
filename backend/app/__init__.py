# backend/app/__init__.py
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Type
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from app.core.config import Config, weak_secret_warnings
from app.core.extensions import db, mail, migrate
from app.core.json_provider import ORJSONProvider
from app.core.limiter import limiter
import app.models  # noqa: F401


def create_app(config_class: Type[Config] | None = None) -> Flask:
    flask_app = Flask(__name__)
    flask_app.json = ORJSONProvider(flask_app)

    if config_class is None:
        if os.getenv("TESTING", "").lower() in ("true", "1", "yes"):
            from app.core.config import TestingConfig
            flask_app.config.from_object(TestingConfig)
        else:
            flask_app.config.from_object(Config)
    else:
        flask_app.config.from_object(config_class)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    for problem in weak_secret_warnings(flask_app.config):
        logging.getLogger(__name__).warning(
            "SECURITY: %s. Anyone can forge login sessions with it; set a long random value "
            "(for example `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`).",
            problem,
        )

    raw_cors = flask_app.config.get("CORS_ORIGINS", "*")
    if isinstance(raw_cors, str) and "," in raw_cors:
        allowed_origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
    else:
        allowed_origins = raw_cors

    CORS(
        flask_app,
        resources={
            r"/api/*": {"origins": allowed_origins},
            r"/static/*": {"origins": allowed_origins},
        },
        supports_credentials=True,
    )

    from app.core.security import enforce_cookie_csrf_protection

    flask_app.before_request(enforce_cookie_csrf_protection)

    db_uri = str(flask_app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    if "sqlite" in db_uri.lower():
        engine_opts = dict(flask_app.config.get("SQLALCHEMY_ENGINE_OPTIONS", {}))
        for key in ["pool_size", "max_overflow", "pool_timeout"]:
            engine_opts.pop(key, None)
        flask_app.config["SQLALCHEMY_ENGINE_OPTIONS"] = engine_opts

    db.init_app(flask_app)
    # Resolve migrations/ relative to this package's location on disk,
    # not the process's current working directory: flask-migrate
    # defaults to a cwd-relative "migrations" path, which only happens
    # to match inside the Docker image (entrypoint.sh runs with
    # cwd=/app). Running pytest (or anything else) from the repo root
    # instead of backend/ made alembic fail with "Path doesn't exist:
    # migrations" even though the folder exists at backend/migrations.
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    migrate.init_app(flask_app, db, directory=str(migrations_dir))
    mail.init_app(flask_app)
    limiter.init_app(flask_app)

    @flask_app.errorhandler(429)
    def ratelimit_handler(e):
        retry_after = getattr(e, "description", None) or getattr(e, "retry_after", None)
        if not retry_after and hasattr(e, "get_headers"):
            headers = dict(e.get_headers())
            retry_after = headers.get("Retry-After")
        return jsonify({
            "error": "Too Many Requests",
            "message": "Rate limit exceeded. Please wait a moment before trying again.",
            "retry_after": str(retry_after) if retry_after is not None else None,
        }), 429

    @flask_app.teardown_appcontext
    def shutdown_session(exception=None):
        if exception:
            try:
                db.session.rollback()
            except Exception:
                pass
        try:
            db.session.remove()
        except Exception:
            pass

    def _init_db_safely():
        is_testing = flask_app.config.get("TESTING", False) or ("PYTEST_CURRENT_TEST" in os.environ)
        if is_testing:
            try:
                db.create_all()
            except Exception:
                pass
            return

        is_pg = False
        try:
            is_pg = db.engine.dialect.name in ("postgresql", "postgres")
        except Exception:
            pass

        if is_pg:
            try:
                with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as raw_conn:
                    exists = raw_conn.execute(text("SELECT 1 FROM pg_database WHERE datname = 'umami';")).scalar()
                    if not exists:
                        raw_conn.execute(text("CREATE DATABASE umami;"))
            except Exception:
                pass

            with db.engine.connect() as conn:
                acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882026);")).scalar()
                if acquired:
                    try:
                        _seed_in_order()
                    finally:
                        conn.execute(text("SELECT pg_advisory_unlock(8882026);"))
        else:
            _seed_in_order()

    def _seed_in_order():
        """Schema first, then the one seeder.

        `DatabaseService().init_db()` creates the tables and syncs the locale
        files; `seed_from_static_json()` is the only thing that writes seed
        content, reading the versioned files in `app/seeds/data/` and resolving
        every row by primary key. There used to be a second seeder reached
        through `PerkService.reload_data()` from inside `init_db()`, and the
        two of them fought over the same primary keys -- it planted six
        placeholder maps on ids 1-6 and the real import then died on a
        duplicate key, every boot. It is gone.

        Seeding runs after `init_db()` so the tables exist, and the locale sync
        inside `init_db()` is a no-op on the first boot and picks up the seeded
        rows on the next one.
        """
        from app.seeds.static_db_seeder import seed_from_static_json
        from app.services.db_service import DatabaseService

        DatabaseService().init_db()
        seed_from_static_json()

    with flask_app.app_context():
        try:
            _init_db_safely()
        except Exception as startup_err:
            logging.debug(f"Startup initialization notice: {startup_err}")

    from app.features import register_feature_blueprints

    register_feature_blueprints(flask_app)

    if not flask_app.config.get("TESTING") and flask_app.config.get("SCHEDULER_ENABLED", True):
        def _run_locked(lock_id: int, job) -> None:
            """Run `job` inside an app context, once across workers (Postgres advisory lock)."""
            with flask_app.app_context():
                is_pg = False
                try:
                    is_pg = db.engine.dialect.name in ("postgresql", "postgres")
                except Exception:
                    pass

                if is_pg:
                    with db.engine.connect() as conn:
                        acquired = conn.execute(text("SELECT pg_try_advisory_lock(:id);"), {"id": lock_id}).scalar()
                        if acquired:
                            try:
                                job()
                            finally:
                                conn.execute(text("SELECT pg_advisory_unlock(:id);"), {"id": lock_id})
                else:
                    job()

        def _run_inactivity_job():
            def _job():
                from app.services.site_settings import streak_prune_days
                from app.services.streak_cleanup_service import apply_inactivity_losses

                apply_inactivity_losses(streak_prune_days())

            _run_locked(8882027, _job)

        def _run_evidence_purge_job():
            def _job():
                from app.services.content_moderation_service import purge_expired_evidence

                purged = purge_expired_evidence()
                if purged:
                    logging.info("Wiped evidence of %d unreviewed content report(s) past the 14-day limit", purged)

            _run_locked(8882028, _job)

        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(
            _run_inactivity_job,
            trigger="cron",
            hour=3,
            minute=0,
            id="apply_inactivity_streak_losses",
            replace_existing=True,
        )
        # Zero-retention guarantee: unreviewed reported content never outlives its 14-day window.
        # Hourly, plus once shortly after boot so a restart never leaves expired evidence waiting.
        scheduler.add_job(
            _run_evidence_purge_job,
            trigger="cron",
            minute=17,
            id="purge_expired_content_evidence",
            replace_existing=True,
        )
        scheduler.add_job(
            _run_evidence_purge_job,
            trigger="date",
            run_date=datetime.now(timezone.utc) + timedelta(seconds=60),
            id="purge_expired_content_evidence_boot",
            replace_existing=True,
        )
        scheduler.start()

    return flask_app

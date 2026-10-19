# backend/app/__init__.py
import logging
import os
from pathlib import Path
from typing import Type
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from app.core.config import Config, fatal_secret_problems, weak_secret_warnings
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

    fatal = fatal_secret_problems(flask_app.config)
    if fatal:
        raise RuntimeError(
            "Refusing to start: " + "; ".join(fatal) + ". Set SECRET_KEY and JWT_SECRET_KEY to long random "
            "values (python -c \"import secrets; print(secrets.token_urlsafe(48))\")."
        )

    for problem in weak_secret_warnings(flask_app.config):
        logging.getLogger(__name__).warning(
            "SECURITY: %s. Set a long random value "
            "(for example `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`; "
            "BAN_LIST_PEPPERS takes `v1:` + `secrets.token_hex(32)`).",
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

    @flask_app.after_request
    def _no_content_sniffing(response):
        # Every API body is JSON or a typed file; never let a browser guess a
        # different (executable) type for one of them.
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        return response

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

    @flask_app.errorhandler(413)
    def payload_too_large(_e):
        limit_mb = (flask_app.config.get("MAX_CONTENT_LENGTH") or 0) // (1024 * 1024)
        return jsonify({"error": f"Request is too large (limit {limit_mb} MB)", "status": 413}), 413

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
        from app.services.maintenance_jobs import register_jobs

        scheduler = BackgroundScheduler(daemon=True)
        register_jobs(scheduler, flask_app)
        scheduler.start()

    return flask_app

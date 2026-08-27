# backend/app/__init__.py
import os
import logging
import threading
from typing import Optional, Type
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import Config
from app.core.extensions import db, migrate, mail
from app.core.limiter import limiter
from app.core.json_provider import ORJSONProvider
import app.models  # noqa: F401


def create_app(config_class: Optional[Type[Config]] = None) -> Flask:
    flask_app = Flask(__name__)
    flask_app.json = ORJSONProvider(flask_app)

    if config_class is None:
        flask_app.config.from_object(Config)
    else:
        flask_app.config.from_object(config_class)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Configure Cross-Origin Resource Sharing (CORS)
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

    db_uri = str(flask_app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    if "sqlite" in db_uri.lower():
        engine_opts = dict(flask_app.config.get("SQLALCHEMY_ENGINE_OPTIONS", {}))
        for key in ["pool_size", "max_overflow", "pool_timeout"]:
            engine_opts.pop(key, None)
        flask_app.config["SQLALCHEMY_ENGINE_OPTIONS"] = engine_opts

    db.init_app(flask_app)
    migrate.init_app(flask_app, db)
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

        from app.services.db_service import DatabaseService
        from app.seeds.user_seeder import seed_default_users
        from app.services.scraper_service import ScraperService

        is_pg = False
        try:
            is_pg = db.engine.dialect.name in ("postgresql", "postgres")
        except Exception:
            pass

        if is_pg:
            # Ensure umami database exists for analytics
            try:
                with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as raw_conn:
                    exists = raw_conn.execute(text("SELECT 1 FROM pg_database WHERE datname = 'umami';")).scalar()
                    if not exists:
                        raw_conn.execute(text("CREATE DATABASE umami;"))
            except Exception:
                pass

            # Non-blocking PostgreSQL advisory lock: worker 1 runs init, workers 2-4 skip immediately without blocking
            with db.engine.connect() as conn:
                acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882026);")).scalar()
                if acquired:
                    try:
                        DatabaseService().init_db()
                        seed_default_users()
                        ScraperService().seed_canonical_characters()
                        from app.seeds.smash_roster_seeder import seed_smash_rosters
                        seed_smash_rosters()
                    finally:
                        conn.execute(text("SELECT pg_advisory_unlock(8882026);"))
        else:
            DatabaseService().init_db()
            seed_default_users()
            ScraperService().seed_canonical_characters()
            from app.seeds.smash_roster_seeder import seed_smash_rosters
            seed_smash_rosters()

    with flask_app.app_context():
        try:
            _init_db_safely()
        except Exception as startup_err:
            logging.debug(f"Startup initialization notice: {startup_err}")

    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.perks import perks_bp, _run_background_scrape, perk_service
    from app.routes.generator import generator_bp
    from app.routes.synergy import synergy_bp
    from app.routes.maps import maps_bp
    from app.routes.page_streak import page_streak_bp
    from app.routes.gauntlet_streak import gauntlet_streak_bp
    from app.routes.chaos_streak import chaos_streak_bp
    from app.routes.history_streak import history_streak_bp
    from app.routes.bug_reports import bug_reports_bp
    from app.routes.admin_control import admin_control_bp

    from app.routes.others.draft import draft_bp
    from app.routes.others.quests import quests_bp
    from app.routes.others.killer_calc import killer_calc_bp
    from app.routes.others.builds import builds_bp
    from app.routes.others.custom_perks import custom_perks_bp
    from app.routes.others.guesser import guesser_bp
    from app.routes.others.smash_or_pass import smash_or_pass_bp

    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(users_bp)
    flask_app.register_blueprint(perks_bp)
    flask_app.register_blueprint(generator_bp)
    flask_app.register_blueprint(draft_bp)
    flask_app.register_blueprint(quests_bp)
    flask_app.register_blueprint(synergy_bp)
    flask_app.register_blueprint(killer_calc_bp)
    flask_app.register_blueprint(builds_bp)
    flask_app.register_blueprint(custom_perks_bp)
    flask_app.register_blueprint(maps_bp)
    flask_app.register_blueprint(page_streak_bp)
    flask_app.register_blueprint(gauntlet_streak_bp)
    flask_app.register_blueprint(chaos_streak_bp)
    flask_app.register_blueprint(history_streak_bp)
    flask_app.register_blueprint(guesser_bp)
    flask_app.register_blueprint(smash_or_pass_bp)
    flask_app.register_blueprint(bug_reports_bp)
    flask_app.register_blueprint(admin_control_bp)



    @flask_app.route("/api/v1/i18n/<locale>", methods=["GET"])
    def get_i18n_translations(locale: str):
        from app.services.others.smash_or_pass_service import SmashOrPassService

        try:
            service = SmashOrPassService()
            translations = service.get_translations(locale=locale)
            return jsonify({"data": translations, "locale": locale}), 200
        except Exception as e:
            logging.error(f"Error fetching i18n translations for locale '{locale}': {e}")
            return jsonify({"error": str(e)}), 500

    with flask_app.app_context():
        try:
            perk_service.reload_data()
        except Exception as e:
            logging.debug(f"PerkService reload_data notice: {e}")

    if not flask_app.config.get("TESTING") and flask_app.config.get("SCHEDULER_ENABLED", True):
        def _run_inactivity_job():
            with flask_app.app_context():
                from app.core.extensions import db
                from app.services.streak_cleanup_service import apply_inactivity_losses

                is_pg = False
                try:
                    is_pg = db.engine.dialect.name in ("postgresql", "postgres")
                except Exception:
                    pass

                if is_pg:
                    with db.engine.connect() as conn:
                        acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882027);")).scalar()
                        if acquired:
                            try:
                                apply_inactivity_losses(flask_app.config["STREAK_INACTIVITY_PRUNE_DAYS"])
                            finally:
                                conn.execute(text("SELECT pg_advisory_unlock(8882027);"))
                else:
                    apply_inactivity_losses(flask_app.config["STREAK_INACTIVITY_PRUNE_DAYS"])

        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(
            _run_inactivity_job,
            trigger="cron",
            hour=3,
            minute=0,
            id="apply_inactivity_streak_losses",
            replace_existing=True,
        )
        scheduler.start()

    return flask_app

import os
import logging
import threading
from typing import Optional, Type
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from app.config import Config
from app.extensions import db, migrate
import app.models  # noqa: F401


def create_app(config_class: Optional[Type[Config]] = None) -> Flask:
    flask_app = Flask(__name__)

    if config_class is None:
        flask_app.config.from_object(Config)
    else:
        flask_app.config.from_object(config_class)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    allowed_origins = flask_app.config.get("CORS_ORIGINS", "*")
    CORS(
        flask_app,
        resources={
            r"/api/*": {"origins": allowed_origins},
            r"/static/*": {"origins": allowed_origins},
        },
        supports_credentials=True,
    )

    db.init_app(flask_app)
    migrate.init_app(flask_app, db)

    @flask_app.after_request
    def apply_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = allowed_origins
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        return response

    @flask_app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
    @flask_app.route("/<path:path>", methods=["OPTIONS"])
    def handle_options_preflight(path):
        return "", 200

    with flask_app.app_context():
        from app.services.db_service import DatabaseService
        from app.seeds.user_seeder import seed_default_users
        from app.services.scraper_service import ScraperService

        DatabaseService().init_db()

        try:
            db_engine = db.engine.name
            if db_engine in ["postgresql", "postgres"]:
                db.session.execute(text("ALTER TABLE perks ADD COLUMN IF NOT EXISTS alternate_name VARCHAR(150);"))
                db.session.execute(text("ALTER TABLE perks ADD COLUMN IF NOT EXISTS is_generic_counterpart BOOLEAN DEFAULT FALSE;"))
                for col_name, col_type in [
                    ("power_name", "VARCHAR(150)"),
                    ("power_description", "TEXT"),
                    ("power_icon_url", "VARCHAR(500)"),
                    ("movement_speed", "VARCHAR(100)"),
                    ("terror_radius", "VARCHAR(100)"),
                    ("terror_radius_meters", "INTEGER"),
                    ("height", "VARCHAR(50)"),
                ]:
                    db.session.execute(text(f"ALTER TABLE characters ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                db.session.commit()
            elif db_engine == "sqlite":
                cols = [c[1] for c in db.session.execute(text("PRAGMA table_info(perks)")).fetchall()]
                if "alternate_name" not in cols:
                    db.session.execute(text("ALTER TABLE perks ADD COLUMN alternate_name VARCHAR(150);"))
                if "is_generic_counterpart" not in cols:
                    db.session.execute(text("ALTER TABLE perks ADD COLUMN is_generic_counterpart BOOLEAN DEFAULT 0;"))

                char_cols = [c[1] for c in db.session.execute(text("PRAGMA table_info(characters)")).fetchall()]
                for col_name, col_type in [
                    ("power_name", "VARCHAR(150)"),
                    ("power_description", "TEXT"),
                    ("power_icon_url", "VARCHAR(500)"),
                    ("movement_speed", "VARCHAR(100)"),
                    ("terror_radius", "VARCHAR(100)"),
                    ("terror_radius_meters", "INTEGER"),
                    ("height", "VARCHAR(50)"),
                ]:
                    if col_name not in char_cols:
                        db.session.execute(text(f"ALTER TABLE characters ADD COLUMN {col_name} {col_type};"))
                db.session.commit()
        except Exception as col_err:
            db.session.rollback()
            logging.debug(f"Column auto-check skipped: {col_err}")

        seed_default_users()
        is_testing = flask_app.config.get("TESTING", False) or ("PYTEST_CURRENT_TEST" in os.environ)
        if not is_testing:
            ScraperService().seed_canonical_characters()

    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.perks import perks_bp, _run_background_scrape, perk_service
    from app.routes.generator import generator_bp
    from app.routes.synergy import synergy_bp
    from app.routes.maps import maps_bp
    from app.routes.page_streak import page_streak_bp
    from app.routes.gauntlet_streak import gauntlet_streak_bp

    from app.routes.others.draft import draft_bp
    from app.routes.others.quests import quests_bp
    from app.routes.others.killer_calc import killer_calc_bp
    from app.routes.others.builds import builds_bp
    from app.routes.others.custom_perks import custom_perks_bp
    from app.routes.others.guesser import guesser_bp

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
    flask_app.register_blueprint(guesser_bp)

    with flask_app.app_context():
        try:
            perk_service.reload_data()
        except Exception as e:
            logging.debug(f"PerkService reload_data notice: {e}")

    return flask_app
# backend/app/__init__.py
import os
import logging
import threading
from typing import Optional, Type
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from app.core.config import Config
from app.core.extensions import db, migrate
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

    db.init_app(flask_app)
    migrate.init_app(flask_app, db)

    def _init_db_safely():
        from app.services.db_service import DatabaseService
        from app.seeds.user_seeder import seed_default_users
        from app.services.scraper_service import ScraperService

        is_testing = flask_app.config.get("TESTING", False) or ("PYTEST_CURRENT_TEST" in os.environ)
        is_pg = False
        try:
            is_pg = db.engine.dialect.name in ("postgresql", "postgres")
        except Exception:
            pass

        if is_pg:
            # Non-blocking PostgreSQL advisory lock: worker 1 runs init, workers 2-4 skip immediately without blocking
            with db.engine.connect() as conn:
                acquired = conn.execute(text("SELECT pg_try_advisory_lock(8882026);")).scalar()
                if acquired:
                    try:
                        DatabaseService().init_db()
                        seed_default_users()
                        from app.seeds.smash_roster_seeder import seed_smash_rosters
                        seed_smash_rosters()
                    finally:
                        conn.execute(text("SELECT pg_advisory_unlock(8882026);"))
        else:
            DatabaseService().init_db()
            seed_default_users()
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

    AVATAR_FALLBACK_MAP = {
        # Cyberpunk
        "killers/cyber_trickster": "killers/the_trickster",
        "survivors/netrunner_nea": "survivors/nea_karlsson",
        "killers/chrome_wesker": "killers/the_mastermind",
        "survivors/neon_sable": "survivors/sable_ward",
        "survivors/cyber_feng_min": "survivors/feng_min",
        "killers/high_tech_trapper": "killers/the_trapper",
        "killers/hightech_trapper": "killers/the_trapper",
        "survivors/meg_turbo": "survivors/meg_thomas",
        "killers/cyber_oni": "killers/the_oni",
        "survivors/netrunner_dwight": "survivors/dwight_fairfield",
        "killers/neon_skull_merchant": "killers/the_skull_merchant",
        "killers/cyber_nurse": "killers/the_nurse",
        "survivors/cyber_david_king": "survivors/david_king",
        # Anime / Manga
        "killers/anime_spirit": "killers/the_spirit",
        "survivors/anime_mikaela": "survivors/mikaela_reid",
        "survivors/anime_yui": "survivors/yui_kimura",
        "killers/anime_trickster": "killers/the_trickster",
        "killers/anime_huntress": "killers/the_huntress",
        "killers/anime_legion": "killers/the_legion",
        "survivors/anime_meg": "survivors/meg_thomas",
        "survivors/anime_feng": "survivors/feng_min",
        "survivors/anime_feng_min": "survivors/feng_min",
        "killers/anime_dracula": "killers/the_dark_lord",
        "survivors/anime_sable": "survivors/sable_ward",
        "killers/anime_wesker": "killers/the_mastermind",
        # Gothic Eldritch
        "killers/gothic_dracula": "killers/the_dark_lord",
        "survivors/gothic_sable": "survivors/sable_ward",
        "killers/bloodborne_huntress": "killers/the_huntress",
        "survivors/dark_fantasy_mikaela": "survivors/mikaela_reid",
        "killers/eldritch_nurse": "killers/the_nurse",
        "killers/victorian_blight": "killers/the_blight",
        "killers/plague_priestess": "killers/the_plague",
        "killers/gothic_artist": "killers/the_artist",
        "killers/raven_artist": "killers/the_artist",
        "killers/eldritch_dredge": "killers/the_dredge",
        "killers/abyssal_dredge": "killers/the_dredge",
        "killers/gothic_knight": "killers/the_knight",
        "survivors/occult_vittorio": "survivors/vittorio_toscano",
        "killers/phantom_wraith": "killers/the_wraith",
        # Hooked on You
        "killers/the_huntress_hoy": "killers/the_huntress",
        "killers/the_trapper_hoy": "killers/the_trapper",
        "killers/the_spirit_hoy": "killers/the_spirit",
        "killers/the_wraith_hoy": "killers/the_wraith",
        "survivors/claudette_morel_hoy": "survivors/claudette_morel",
        "survivors/dwight_fairfield_hoy": "survivors/dwight_fairfield",
        "killers/the_trickster_hoy": "killers/the_trickster",
        "killers/the_ocean_hoy": "killers/the_trapper",
        # Roster covers
        "rosters/canon": "survivors/sable_ward",
        "rosters/hooked_on_you": "killers/the_huntress",
        "rosters/legendary_cosplay": "killers/baba_yaga",
        "rosters/cyberpunk_2077": "survivors/feng_min",
        "rosters/anime_manga": "killers/the_spirit",
        "rosters/gothic_eldritch": "killers/the_dark_lord",
    }

    @flask_app.route("/static/<path:filename>")
    def serve_custom_static(filename: str):
        from flask import send_from_directory, abort
        static_dir = Path(flask_app.static_folder)

        # 1. Direct file match
        target = static_dir / filename
        if target.exists() and target.is_file():
            return send_from_directory(static_dir, filename)

        # 2. Transparent WebP <-> PNG interchange
        if filename.endswith(".png"):
            webp_name = filename[:-4] + ".webp"
            if (static_dir / webp_name).exists():
                return send_from_directory(static_dir, webp_name)
        elif filename.endswith(".webp"):
            png_name = filename[:-5] + ".png"
            if (static_dir / png_name).exists():
                return send_from_directory(static_dir, png_name)

        # 3. Avatar / Roster fallback resolution
        key = filename
        if key.endswith(".png"):
            key = key[:-4]
        elif key.endswith(".webp"):
            key = key[:-5]
        if key.startswith("avatars/"):
            key = key[len("avatars/"):]

        if key in AVATAR_FALLBACK_MAP:
            fb_base = AVATAR_FALLBACK_MAP[key]
            for cand in [f"avatars/{fb_base}.webp", f"avatars/{fb_base}.png", f"{fb_base}.webp", f"{fb_base}.png"]:
                if (static_dir / cand).exists():
                    return send_from_directory(static_dir, cand)

        abort(404)

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

    return flask_app
import os
import logging
import threading
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    allowed_origins = os.getenv("CORS_ORIGINS", "*")
    CORS(
        app,
        resources={
            r"/api/*": {"origins": allowed_origins},
            r"/static/*": {"origins": allowed_origins},
        },
        supports_credentials=True,
    )

    @app.after_request
    def apply_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = allowed_origins
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        return response

    @app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def handle_options_preflight(path):
        return "", 200

    from app.services.db_service import DatabaseService
    DatabaseService().init_db()

    from app.routes.perks import perks_bp, _run_background_scrape
    from app.routes.challenges import challenges_bp
    from app.routes.generator import generator_bp
    from app.routes.draft import draft_bp
    from app.routes.quests import quests_bp
    from app.routes.synergy import synergy_bp
    from app.routes.killer_calc import killer_calc_bp
    from app.routes.builds import builds_bp
    from app.routes.custom_perks import custom_perks_bp
    app.register_blueprint(perks_bp)
    app.register_blueprint(challenges_bp)
    app.register_blueprint(generator_bp)
    app.register_blueprint(draft_bp)
    app.register_blueprint(quests_bp)
    app.register_blueprint(synergy_bp)
    app.register_blueprint(killer_calc_bp)
    app.register_blueprint(builds_bp)
    app.register_blueprint(custom_perks_bp)

    # Automatically check data on startup
    data_file = Path(app.root_path).parent / "data" / "perks.json"
    if not data_file.exists() or data_file.stat().st_size == 0:
        logging.info("perks.json not found on startup. Triggering initial scrape in background thread...")
        threading.Thread(target=_run_background_scrape, daemon=True).start()

    return app
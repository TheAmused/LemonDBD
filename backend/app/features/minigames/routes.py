# backend/app/features/minigames/routes.py
from app.routes.minigames import minigames_bp
from app.routes.scoreboard import scoreboard_bp

__all__ = ["minigames_bp", "scoreboard_bp"]

"""
Database Migration: Add power and combat attribute columns to the 'characters' table.
"""
import logging
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_path = Path(__file__).resolve().parent
if (backend_path / "app").exists():
    if str(backend_path) not in sys.path:
        sys.path.insert(0, str(backend_path))
elif (backend_path / "backend" / "app").exists():
    if str(backend_path / "backend") not in sys.path:
        sys.path.insert(0, str(backend_path / "backend"))

from sqlalchemy import inspect, text
from app import create_app
from app.core.extensions import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

COLUMNS_TO_ADD = [
    ("power_name", "VARCHAR(150)"),
    ("power_description", "TEXT"),
    ("power_icon_url", "VARCHAR(500)"),
    ("movement_speed", "VARCHAR(100)"),
    ("terror_radius", "VARCHAR(100)"),
    ("terror_radius_meters", "INTEGER"),
    ("height", "VARCHAR(50)"),
]

def run_migration():
    app = create_app()
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        
        if not inspector.has_table("characters"):
            logger.info("Table 'characters' does not exist yet. Creating all tables...")
            db.create_all()
            logger.info("Tables created.")
            return

        existing_columns = {col["name"] for col in inspector.get_columns("characters")}
        logger.info(f"Existing columns in 'characters': {existing_columns}")

        with engine.connect() as conn:
            for col_name, col_type in COLUMNS_TO_ADD:
                if col_name not in existing_columns:
                    sql = f"ALTER TABLE characters ADD COLUMN {col_name} {col_type}"
                    logger.info(f"Adding column: {col_name} ({col_type})")
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                        logger.info(f"Added column {col_name} successfully.")
                    except Exception as e:
                        logger.error(f"Error adding column {col_name}: {e}")
                else:
                    logger.info(f"Column '{col_name}' already exists. Skipping.")
                    
        logger.info("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()

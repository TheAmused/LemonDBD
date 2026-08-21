# backend/scripts/run_seed_smash.py
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.seeds.smash_roster_seeder import seed_smash_rosters

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        print("Seeding smash rosters and entities with updated avatar paths...")
        seed_smash_rosters()
        print("Successfully seeded all rosters, entities, stats, and translations!")

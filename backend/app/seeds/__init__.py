# backend/app/seeds/__init__.py
from app.seeds.user_seeder import seed_default_users
from app.seeds.smash_roster_seeder import seed_smash_rosters

__all__ = ["seed_default_users", "seed_smash_rosters"]



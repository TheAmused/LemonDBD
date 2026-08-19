import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.core.extensions import db
from app.models import Character, Perk

app = create_app()

with app.app_context():
    all_perks = db.session.query(Perk).all()
    total = len(all_perks)

    missing = []
    valid = []

    for p in all_perks:
        desc = (p.description or "").strip()
        if not desc or len(desc) < 25 or "unavailable" in desc.lower():
            char_name = p.character.name if p.character else "General"
            missing.append((p.name, p.category, char_name, desc))
        else:
            valid.append(p)

    print("\n" + "=" * 60)
    print(f"DATABASE PERK AUDIT")
    print("=" * 60)
    print(f"Total Perks in DB:       {total}")
    print(f"Valid Descriptions:      {len(valid)}")
    print(f"Missing / Failed:        {len(missing)}")
    print("=" * 60)

    if missing:
        print("\nPERKS WITH MISSING OR FAILED DESCRIPTIONS:\n")
        for idx, (name, category, char, desc) in enumerate(missing, 1):
            snippet = (desc[:40] + "...") if desc else "[EMPTY]"
            print(f"{idx:02d}. [{category}] {name} (Owner: {char}) -> {snippet}")
    else:
        print("\nALL PERKS HAVE COMPLETE DESCRIPTIONS! (0 missing)")
    print("=" * 60 + "\n")